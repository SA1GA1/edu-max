import { createServer } from 'node:http'
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs'
import { writeFile, unlink } from 'node:fs/promises'
import { join, resolve, extname } from 'node:path'
import { randomUUID, randomBytes } from 'node:crypto'
import { createInitialState, seedDirections, seedTasks } from '../src/domain.ts'
import { ApiError, requireUser } from './auth.mjs'
import { normalizeUsername, openDatabase, sanitizeUsername, transaction } from './db.mjs'

const json = value => JSON.stringify(value)
const read = (db, table, id) => { const row = db.prepare(`SELECT data FROM ${table} WHERE id=?`).get(id); return row ? JSON.parse(row.data) : null }
const all = (db, table) => db.prepare(`SELECT data FROM ${table}`).all().map(row => JSON.parse(row.data))
const fail = (status, code, message, fields) => { throw new ApiError(status, code, message, fields) }
const taskById = id => seedTasks.find(task => task.id === id) ?? fail(404, 'not_found', 'Задание не найдено')
const directionById = id => seedDirections.find(direction => direction.id === id) ?? fail(404, 'not_found', 'Направление не найдено')
const need = (value, key, max = 500) => { if (typeof value !== 'string' || !value.trim() || value.trim().length > max) fail(400, 'validation_error', `Проверьте поле ${key}`, { [key]: 'required_or_too_long' }); return value.trim() }
const bool = (value, key) => { if (typeof value !== 'boolean') fail(400, 'validation_error', `Проверьте поле ${key}`, { [key]: 'boolean_required' }); return value }
const repoPattern = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/?$/
const githubLoginPattern = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/
const normalizeGithubProfile = value => {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const candidate = /^https?:\/\//i.test(raw) ? raw : /^(?:www\.)?github\.com\//i.test(raw) ? `https://${raw}` : `https://github.com/${raw.replace(/^@/, '')}`
  let parsed
  try { parsed = new URL(candidate) } catch { fail(400, 'validation_error', 'Укажите логин или ссылку на профиль GitHub', { githubUrl: 'invalid' }) }
  const parts = parsed.pathname.split('/').filter(Boolean)
  if (parsed.protocol !== 'https:' || parsed.hostname.toLowerCase().replace(/^www\./, '') !== 'github.com' || parts.length !== 1 || !githubLoginPattern.test(parts[0])) fail(400, 'validation_error', 'Нужна ссылка на профиль GitHub, например github.com/octocat', { githubUrl: 'invalid' })
  return `https://github.com/${parts[0]}`
}
const profileView = profile => ({ id: profile.id, name: profile.name, username: profile.username ?? String(profile.handle ?? '').replace(/^@/, ''), handle: profile.handle, avatarUrl: profile.avatarUrl ?? null, level: profile.level, xp: profile.xp, xpNext: profile.xpNext, skills: profile.skills, bio: profile.bio, githubUrl: profile.githubUrl ?? null, maxProfileUrl: profile.maxUrl ?? null })
const publicUser = db => id => { const row = db.prepare('SELECT profile FROM users WHERE id=?').get(id); return row ? profileView(JSON.parse(row.profile)) : null }
const userRow = (db, id) => db.prepare('SELECT * FROM users WHERE id=?').get(id)
const userState = (db, id) => { const row = userRow(db, id); if (!row) fail(404, 'not_found', 'Пользователь не найдено'); return { profile: JSON.parse(row.profile), settings: JSON.parse(row.settings), progress: JSON.parse(row.progress), unlocked: JSON.parse(row.unlocked) } }
const saveUser = (db, id, state) => db.prepare('UPDATE users SET profile=?,settings=?,progress=?,unlocked=?,username_key=? WHERE id=?').run(json(state.profile), json(state.settings), json(state.progress), json(state.unlocked), normalizeUsername(state.profile.username ?? state.profile.handle?.slice(1)), id)
const initialSettings = () => ({ theme: 'system', notifications: { deadlines: true, comments: true, projects: true, events: true } })

function ensureUser(db, max) {
  const existing = userRow(db, max.id)
  if (existing) return
  const name = [max.firstName, max.lastName].filter(Boolean).join(' ') || 'Участник MAX'
  const initials = name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
  const wanted = sanitizeUsername(max.username || `max_${max.id.split(':')[1]}`) || `max_${randomUUID().slice(0, 8)}`
  let username = wanted, suffix = 2
  while (db.prepare('SELECT 1 FROM users WHERE username_key=?').get(normalizeUsername(username))) {
    const tail = String(suffix++)
    username = `${wanted.slice(0, 24 - tail.length)}${tail}`
  }
  const profile = { id: max.id, name, username, handle: `@${username}`, avatarUrl: max.avatarUrl, initials, level: 1, xp: 0, xpNext: 1000, skills: Object.fromEntries(seedDirections.map(d => [d.id, 1])), bio: '' }
  const unlocked = Object.fromEntries(seedDirections.map(d => [d.id, 1]))
  db.prepare('INSERT OR IGNORE INTO users(id,profile,settings,progress,unlocked,username_key) VALUES (?,?,?,?,?,?)').run(max.id, json(profile), json(initialSettings()), '{}', json(unlocked), normalizeUsername(username))
}

function seed(db) {
  const seedState = createInitialState()
  for (const person of seedState.users.filter(u => u.id !== 'me')) {
    const wanted = sanitizeUsername(person.username ?? person.handle) || `user_${person.id}`
    let username = wanted, suffix = 2
    while (db.prepare('SELECT 1 FROM users WHERE username_key=?').get(normalizeUsername(username))) username = `${wanted.slice(0, 22)}${suffix++}`
    const profile = { ...person, username, handle: `@${username}` }
    db.prepare('INSERT OR IGNORE INTO users(id,profile,settings,progress,unlocked,username_key) VALUES (?,?,?,?,?,?)').run(person.id, json(profile), json(initialSettings()), '{}', '{}', normalizeUsername(username))
  }
  for (const project of seedState.projects) db.prepare('INSERT OR IGNORE INTO projects VALUES (?,?)').run(project.id, json(project))
  for (const event of seedState.events) db.prepare('INSERT OR IGNORE INTO events VALUES (?,?)').run(event.id, json(event))
  for (const video of seedState.videos) {
    const { comments, ...data } = video
    db.prepare('INSERT OR IGNORE INTO videos VALUES (?,?,?,?,?)').run(video.id, json(data), 'published', null, new Date().toISOString())
    for (const comment of comments) {
      db.prepare('INSERT OR IGNORE INTO comments VALUES (?,?,?,?,?,?)').run(comment.id, video.id, comment.userId, comment.text, comment.parentId ?? null, comment.date)
      for (let index = 0; index < comment.likes; index++) db.prepare('INSERT OR IGNORE INTO comment_likes VALUES (?,?)').run(`seed:${index}`, comment.id)
    }
  }
}

function page(items, cursor, size = 20) {
  let offset = 0
  if (cursor) { try { offset = Number(Buffer.from(cursor, 'base64url').toString()) } catch { fail(400, 'validation_error', 'Некорректный cursor') } }
  if (!Number.isSafeInteger(offset) || offset < 0) fail(400, 'validation_error', 'Некорректный cursor')
  return { items: items.slice(offset, offset + size), nextCursor: offset + size < items.length ? Buffer.from(String(offset + size)).toString('base64url') : null }
}

function taskView(task, progress) {
  return { ...task, difficulty: { 'Легко': 'easy', 'Средне': 'medium', 'Сложно': 'hard' }[task.difficulty], estimatedHours: task.hours, deadlineAt: task.deadline, progress: { status: progress?.status ?? 'new', repositoryUrl: progress?.repo ?? null, score: progress?.score ?? null, liked: !!progress?.liked } }
}
function projectView(db, project, userId) {
  const applications = db.prepare('SELECT id,user_id,role,status FROM applications WHERE project_id=?').all(project.id)
  const team = project.memberIds.map(publicUser(db)).filter(Boolean)
  const mine = applications.find(item => item.user_id === userId)
  return { ...project, members: project.memberIds.length, owner: publicUser(db)(project.ownerId), team, liked: !!db.prepare('SELECT 1 FROM project_likes WHERE user_id=? AND project_id=?').get(userId, project.id), applicationStatus: mine?.status ?? null, applicationRole: mine?.role ?? null, applications: project.ownerId === userId ? applications : undefined }
}
function eventView(db, event, userId) {
  const end = new Date(event.date)
  const endHour = event.time.match(/[–-](\d{1,2}):(\d{2})$/)
  if (endHour) { end.setHours(Number(endHour[1]), Number(endHour[2]), 0, 0); if (end <= new Date(event.date)) end.setDate(end.getDate() + 1) }
  else end.setHours(end.getHours() + 2)
  return { ...event, dateAt: event.date, endAt: end.toISOString(), organizer: 'EDU', liked: !!db.prepare('SELECT 1 FROM event_likes WHERE user_id=? AND event_id=?').get(userId, event.id), registered: !!db.prepare('SELECT 1 FROM registrations WHERE user_id=? AND event_id=?').get(userId, event.id) }
}
function commentView(db, row, userId) {
  const likes = db.prepare('SELECT COUNT(*) AS count FROM comment_likes WHERE comment_id=?').get(row.id).count
  return { id: row.id, author: publicUser(db)(row.user_id), userId: row.user_id, text: row.text, parentId: row.parent_id, createdAt: row.created_at, date: row.created_at, likes, liked: !!db.prepare('SELECT 1 FROM comment_likes WHERE user_id=? AND comment_id=?').get(userId, row.id) }
}
function videoView(db, row, userId, base) {
  const data = JSON.parse(row.data)
  const likes = db.prepare('SELECT COUNT(*) AS count FROM video_likes WHERE video_id=?').get(row.id).count
  const comments = db.prepare('SELECT * FROM comments WHERE video_id=? ORDER BY created_at').all(row.id).map(comment => commentView(db, comment, userId))
  return { ...data, status: row.status, author: publicUser(db)(data.userId), playbackUrl: row.upload_id ? `${base}/media/${row.id}` : null, posterUrl: `${base}/poster.svg`, likes: (data.likes ?? 0) + likes, commentsCount: comments.length, comments, liked: !!db.prepare('SELECT 1 FROM video_likes WHERE user_id=? AND video_id=?').get(userId, row.id), createdAt: row.created_at }
}
function snapshot(db, userId, base) {
  const state = userState(db, userId)
  const projects = all(db, 'projects').map(p => projectView(db, p, userId))
  const events = all(db, 'events').map(e => eventView(db, e, userId))
  const videos = db.prepare("SELECT * FROM videos WHERE status='published' ORDER BY created_at DESC").all().map(v => videoView(db, v, userId, base))
  const ids = new Set([userId, ...projects.flatMap(p => p.memberIds), ...projects.flatMap(p => p.applications?.map(a => a.user_id) ?? []), ...videos.map(v => v.userId), ...videos.flatMap(v => v.comments.map(c => c.userId))])
  return { profile: state.profile, users: [...ids].filter(id => id !== userId).map(publicUser(db)).filter(Boolean).map(u => ({ ...u, initials: u.name.split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase(), maxUrl: u.maxProfileUrl })), directions: seedDirections.map(d => ({ ...d, currentLevel: state.unlocked[d.id], started: state.unlocked[d.id] > 1 || seedTasks.some(task => task.directionId === d.id && ['active', 'checking', 'revision', 'completed'].includes(state.progress[task.id]?.status)) })), tasks: seedTasks, taskProgress: state.progress, unlockedLevels: state.unlocked, projects, projectApplications: Object.fromEntries(projects.filter(p => p.applicationStatus === 'pending').map(p => [p.id, p.applicationRole])), events, registeredEvents: events.filter(e => e.registered).map(e => e.id), videos: videos.map(v => ({ ...v, poster: v.poster ?? `url(${v.posterUrl})`, src: v.playbackUrl ?? undefined, comments: v.comments.map(c => ({ ...c, userId: c.userId, date: c.createdAt })) })), settings: state.settings }
}

async function bodyJson(request, max = 1_000_000) {
  let size = 0, chunks = []
  for await (const chunk of request) { size += chunk.length; if (size > max) fail(413, 'too_large', 'Тело запроса слишком велико'); chunks.push(chunk) }
  if (!size) return {}
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { fail(400, 'validation_error', 'Некорректный JSON') }
}
async function bodyBuffer(request, max) {
  let size = 0, chunks = []
  for await (const chunk of request) { size += chunk.length; if (size > max) fail(413, 'too_large', 'Файл должен быть не больше 5 МБ'); chunks.push(chunk) }
  return Buffer.concat(chunks)
}
function imageType(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { mime: 'image/jpeg', ext: '.jpg' }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))) return { mime: 'image/png', ext: '.png' }
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') return { mime: 'image/webp', ext: '.webp' }
  return null
}
function send(response, status, value, headers = {}) { response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }); response.end(json(value)) }
const route = (path, pattern) => path.match(pattern)
function like(db, table, userId, resourceId, liked, column) {
  bool(liked, 'liked')
  if (liked) db.prepare(`INSERT OR IGNORE INTO ${table}(user_id,${column}) VALUES (?,?)`).run(userId, resourceId)
  else db.prepare(`DELETE FROM ${table} WHERE user_id=? AND ${column}=?`).run(userId, resourceId)
}

export function createApp({ botToken = process.env.MAX_BOT_TOKEN, dbPath = process.env.DB_PATH ?? './data/app.sqlite', mediaDir = process.env.MEDIA_DIR ?? './data/media', publicBaseUrl = process.env.PUBLIC_BASE_URL, fetchImpl = fetch } = {}) {
  const db = openDatabase(dbPath)
  const mediaPath = resolve(mediaDir)
  const avatarPath = join(mediaPath, 'profile-avatars')
  mkdirSync(avatarPath, { recursive: true })
  seed(db)
  const pending = db.prepare("SELECT id FROM submissions WHERE status='checking'").all()
  const processSubmission = async id => {
    const submission = db.prepare('SELECT * FROM submissions WHERE id=?').get(id)
    if (!submission || submission.status !== 'checking') return
    const task = taskById(submission.task_id)
    const match = submission.repository_url.match(repoPattern)
    let score = 0, feedback = 'Репозиторий не удалось проверить. Убедитесь, что он публичный.'
    let breakdown = [{ name: 'Доступность', score: 0, maxScore: 25 }, { name: 'Структура', score: 0, maxScore: 30 }, { name: 'README', score: 0, maxScore: 25 }, { name: 'Содержимое', score: 0, maxScore: 20 }]
    try {
      const headers = { 'user-agent': 'EDU-Review', accept: 'application/vnd.github+json' }
      if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`
      const repo = await fetchImpl(`https://api.github.com/repos/${match[1]}/${match[2]}`, { headers, signal: AbortSignal.timeout(10000) })
      if (repo.ok) {
        breakdown[0].score = 25
        const filesResponse = await fetchImpl(`https://api.github.com/repos/${match[1]}/${match[2]}/contents`, { headers, signal: AbortSignal.timeout(10000) })
        const files = filesResponse.ok ? await filesResponse.json() : []
        const names = Array.isArray(files) ? files.map(item => String(item.name).toLowerCase()) : []
        breakdown[1].score = Math.min(30, names.length * 6)
        breakdown[2].score = names.some(name => /^readme(\.|$)/.test(name)) ? 25 : 0
        breakdown[3].score = names.some(name => /\.(js|jsx|ts|tsx|kt|go|py|html|css)$/.test(name) || ['src', 'app', 'lib'].includes(name)) ? 20 : 0
        feedback = 'Автоматическая базовая проверка публичного репозитория. Содержимое решения пока не оценивается по смыслу.'
      }
    } catch { /* ошибка GitHub приводит к доработке с объяснением */ }
    score = breakdown.reduce((sum, item) => sum + item.score, 0)
    const status = score >= 60 ? 'completed' : 'revision'
    transaction(db, () => {
      const current = db.prepare('SELECT status FROM submissions WHERE id=?').get(id)
      if (current?.status !== 'checking') return
      const state = userState(db, submission.user_id)
      const progress = state.progress[task.id] ?? { status: 'active' }
      const alreadyAwarded = progress.status === 'completed'
      state.progress[task.id] = { ...progress, status, repo: submission.repository_url, score }
      if (status === 'completed' && !alreadyAwarded) {
        state.profile.xp += task.xp
        while (state.profile.xp >= state.profile.xpNext) { state.profile.xp -= state.profile.xpNext; state.profile.level++ }
        const lastLevel = directionById(task.directionId).levels.length
        state.unlocked[task.directionId] = Math.max(state.unlocked[task.directionId] ?? 1, Math.min(task.level + 1, lastLevel))
        state.profile.skills[task.directionId] = Math.max(state.profile.skills[task.directionId] ?? 1, Math.min(task.level + 1, lastLevel))
      }
      saveUser(db, submission.user_id, state)
      const result = { submissionId: id, taskId: task.id, status, score, earnedXp: status === 'completed' && !alreadyAwarded ? task.xp : 0, breakdown, feedback, unlockedLevel: state.unlocked[task.directionId] }
      db.prepare('UPDATE submissions SET status=?,result=? WHERE id=?').run(status, json(result), id)
    })
  }
  for (const row of pending) queueMicrotask(() => processSubmission(row.id))

  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost')
      const path = url.pathname
      const method = request.method
      const base = publicBaseUrl ?? `${request.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http'}://${request.headers.host}`
      if (path === '/healthz') return send(response, 200, { ok: true })
      if (path === '/poster.svg') { response.writeHead(200, { 'content-type': 'image/svg+xml', 'cache-control': 'public, max-age=86400' }); return response.end('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 1280"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#183579"/><stop offset="1" stop-color="#7496e8"/></linearGradient></defs><rect width="720" height="1280" fill="url(#g)"/></svg>') }
      let match
      if (method === 'GET' && (match = route(path, /^\/profile-media\/([0-9a-f-]+)\.(jpg|png|webp)$/i))) {
        const file = join(avatarPath, `${match[1]}.${match[2].toLowerCase()}`)
        if (!existsSync(file)) fail(404, 'not_found', 'Аватар не найден')
        const mime = match[2].toLowerCase() === 'jpg' ? 'image/jpeg' : `image/${match[2].toLowerCase()}`
        response.writeHead(200, { 'content-type': mime, 'cache-control': 'public, max-age=31536000, immutable', 'content-length': statSync(file).size })
        return createReadStream(file).pipe(response)
      }
      if (method === 'GET' && (match = route(path, /^\/media\/([^/]+)$/))) {
        const row = db.prepare("SELECT upload_id FROM videos WHERE id=? AND status='published'").get(match[1])
        if (!row?.upload_id) fail(404, 'not_found', 'Видео не найдено')
        const upload = db.prepare('SELECT * FROM uploads WHERE id=?').get(row.upload_id)
        const file = join(mediaPath, upload.id)
        if (!existsSync(file)) fail(404, 'not_found', 'Файл не найден')
        const size = statSync(file).size
        const range = request.headers.range?.match(/^bytes=(\d*)-(\d*)$/)
        const start = range ? Number(range[1] || 0) : 0
        const end = range ? Math.min(size - 1, Number(range[2] || size - 1)) : size - 1
        if (start > end || end >= size) { response.writeHead(416, { 'content-range': `bytes */${size}` }); return response.end() }
        response.writeHead(range ? 206 : 200, { 'content-type': upload.mime, 'accept-ranges': 'bytes', 'content-length': end - start + 1, ...(range ? { 'content-range': `bytes ${start}-${end}/${size}` } : {}) })
        return createReadStream(file, { start, end }).pipe(response)
      }
      if (method === 'PUT' && (match = route(path, /^\/api\/v1\/uploads\/([^/]+)$/))) {
        const upload = db.prepare('SELECT * FROM uploads WHERE id=?').get(match[1])
        if (!upload || upload.token !== request.headers['x-upload-token'] || upload.expires_at < Date.now()) fail(403, 'forbidden', 'Ссылка загрузки недействительна')
        if (upload.uploaded) fail(409, 'conflict', 'Файл уже загружен')
        const chunks = [], limit = upload.size
        let size = 0
        for await (const chunk of request) { size += chunk.length; if (size > limit) fail(413, 'too_large', 'Видео превышает заявленный размер'); chunks.push(chunk) }
        if (size !== limit) fail(400, 'validation_error', 'Размер файла не совпадает')
        const file = Buffer.concat(chunks)
        const mp4 = file.subarray(4, 8).toString() === 'ftyp'
        const webm = file.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
        if (!(upload.mime === 'video/mp4' && mp4 || upload.mime === 'video/webm' && webm)) fail(400, 'validation_error', 'Неверный формат видео')
        await writeFile(join(mediaPath, upload.id), file, { flag: 'wx' })
        db.prepare('UPDATE uploads SET uploaded=1 WHERE id=?').run(upload.id)
        return send(response, 200, { uploadId: upload.id, status: 'uploaded' })
      }
      if (!path.startsWith('/api/v1')) {
        const file = resolve('dist', path === '/' ? 'index.html' : `.${path}`)
        const root = resolve('dist')
        if ((file === root || file.startsWith(`${root}/`)) && existsSync(file) && statSync(file).isFile()) { const mime = ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[extname(file)] ?? 'application/octet-stream'; const cache = extname(file) === '.html' ? 'no-cache' : path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache'; response.writeHead(200, { 'content-type': mime, 'cache-control': cache }); return createReadStream(file).pipe(response) }
        if (existsSync(join(root, 'index.html'))) { response.writeHead(200, { 'content-type': 'text/html', 'cache-control': 'no-cache' }); return createReadStream(join(root, 'index.html')).pipe(response) }
        fail(404, 'not_found', 'Маршрут не найден')
      }
      const maxUser = requireUser(request, botToken)
      ensureUser(db, maxUser)
      const userId = maxUser.id
      const user = () => userState(db, userId)
      const resource = path.slice(7)
      if (method === 'PUT' && resource === '/me/avatar') {
        const file = await bodyBuffer(request, 5_000_000)
        const type = imageType(file)
        if (!type) fail(400, 'validation_error', 'Поддерживаются JPEG, PNG и WebP')
        const state = user(), previous = state.profile.customAvatarFile
        const fileName = `${randomUUID()}${type.ext}`
        await writeFile(join(avatarPath, fileName), file, { flag: 'wx' })
        state.profile.avatarUrl = `${base}/profile-media/${fileName}`
        state.profile.customAvatarFile = fileName
        saveUser(db, userId, state)
        if (previous) await unlink(join(avatarPath, previous)).catch(() => undefined)
        return send(response, 200, profileView(state.profile))
      }
      if (method === 'DELETE' && resource === '/me/avatar') {
        const state = user(), previous = state.profile.customAvatarFile
        state.profile.avatarUrl = null
        delete state.profile.customAvatarFile
        saveUser(db, userId, state)
        if (previous) await unlink(join(avatarPath, previous)).catch(() => undefined)
        return send(response, 200, profileView(state.profile))
      }
      const payload = ['POST', 'PATCH', 'PUT'].includes(method) ? await bodyJson(request) : {}
      if (method === 'GET' && resource === '/me/bootstrap') return send(response, 200, { profile: profileView(user().profile), settings: user().settings })
      if (method === 'GET' && resource === '/me/snapshot') return send(response, 200, snapshot(db, userId, base))
      if (method === 'PATCH' && resource === '/me/profile') {
        const state = user()
        if (payload.name !== undefined) {
          const name = need(payload.name, 'name', 80)
          if (name.length < 2) fail(400, 'validation_error', 'Имя должно содержать не меньше 2 символов', { name: 'too_short' })
          state.profile.name = name
          state.profile.initials = name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
        }
        if (payload.bio !== undefined) {
          if (typeof payload.bio !== 'string' || payload.bio.trim().length > 300) fail(400, 'validation_error', 'Описание должно быть не длиннее 300 символов', { bio: 'too_long' })
          state.profile.bio = payload.bio.trim()
        }
        if (payload.username !== undefined) {
          const username = String(payload.username).replace(/^@/, '').trim()
          if (!/^[A-Za-z0-9._]{3,24}$/.test(username)) fail(400, 'validation_error', 'Username: 3–24 символа, латиница, цифры, точка или подчёркивание', { username: 'invalid' })
          const duplicate = db.prepare('SELECT id FROM users WHERE username_key=? AND id<>?').get(normalizeUsername(username), userId)
          if (duplicate) fail(409, 'username_taken', 'Этот username уже занят', { username: 'taken' })
          state.profile.username = username
          state.profile.handle = `@${username}`
        }
        if (payload.githubUrl !== undefined) state.profile.githubUrl = normalizeGithubProfile(payload.githubUrl)
        saveUser(db, userId, state)
        return send(response, 200, profileView(state.profile))
      }
      if (method === 'GET' && (match = route(resource, /^\/users\/([^/]+)$/))) {
        const profile = publicUser(db)(decodeURIComponent(match[1]))
        if (!profile) fail(404, 'not_found', 'Пользователь не найден')
        const completedTasks = db.prepare('SELECT progress FROM users WHERE id=?').get(profile.id)
        return send(response, 200, { ...profile, completedTasks: completedTasks ? Object.values(JSON.parse(completedTasks.progress)).filter(p => p.status === 'completed').length : 0, projects: all(db, 'projects').filter(p => p.memberIds.includes(profile.id)).length, videos: db.prepare('SELECT COUNT(*) AS count FROM videos WHERE json_extract(data,\'$.userId\')=?').get(profile.id).count })
      }
      if (method === 'PATCH' && resource === '/me/settings') {
        const state = user()
        if (payload.theme !== undefined) { if (!['light', 'system', 'dark'].includes(payload.theme)) fail(400, 'validation_error', 'Некорректная тема'); state.settings.theme = payload.theme }
        if (payload.notifications !== undefined) { for (const [key, value] of Object.entries(payload.notifications)) { if (!['deadlines', 'comments', 'projects', 'events'].includes(key)) fail(400, 'validation_error', 'Неизвестное уведомление'); state.settings.notifications[key] = bool(value, key) } }
        saveUser(db, userId, state); return send(response, 200, state.settings)
      }
      if (method === 'GET' && resource === '/directions') return send(response, 200, page(seedDirections.map(d => ({ id: d.id, title: d.title, longTitle: d.longTitle, description: d.description, color: d.color, started: user().unlocked[d.id] > 1 || seedTasks.some(task => task.directionId === d.id && ['active', 'checking', 'revision', 'completed'].includes(user().progress[task.id]?.status)), currentLevel: user().unlocked[d.id], unlockedLevel: user().unlocked[d.id] })), url.searchParams.get('cursor')))
      if (method === 'GET' && (match = route(resource, /^\/directions\/([^/]+)\/roadmap$/))) {
        const d = directionById(match[1]), unlocked = user().unlocked[d.id]
        return send(response, 200, { direction: d, levels: d.levels.map((title, index) => ({ number: index + 1, title, state: index + 1 < unlocked ? 'completed' : index + 1 === unlocked ? 'current' : 'locked', tasks: index + 1 > unlocked ? [] : seedTasks.filter(t => t.directionId === d.id && t.level === index + 1).slice(0, 3).map(t => ({ id: t.id, title: t.title, difficulty: t.difficulty, xp: t.xp, hours: t.hours })) })) })
      }
      if (method === 'GET' && (match = route(resource, /^\/tasks\/([^/]+)$/))) { const task = taskById(match[1]); return send(response, 200, taskView(task, user().progress[task.id])) }
      if (method === 'GET' && resource === '/me/tasks') {
        const status = url.searchParams.get('status') ?? 'all'
        if (!['active', 'completed', 'liked', 'all'].includes(status)) fail(400, 'validation_error', 'Некорректный статус')
        return send(response, 200, page(seedTasks.filter(task => { const p = user().progress[task.id]; return p && (status === 'all' || status === 'liked' && p.liked || status === 'active' && ['active', 'revision', 'checking'].includes(p.status) || status === 'completed' && p.status === 'completed') }).map(task => taskView(task, user().progress[task.id])), url.searchParams.get('cursor')))
      }
      if ((match = route(resource, /^\/tasks\/([^/]+)\/(accept|progress|submit|abandon|like)$/))) {
        const task = taskById(match[1]), action = match[2], state = user(), progress = state.progress[task.id] ?? { status: 'new' }
        if (action === 'like' && method === 'PUT') { progress.liked = bool(payload.liked, 'liked'); state.progress[task.id] = progress; saveUser(db, userId, state); return send(response, 200, { liked: progress.liked }) }
        if (task.level > (state.unlocked[task.directionId] ?? 1)) fail(403, 'forbidden', 'Уровень пока закрыт')
        if (action === 'accept' && method === 'POST') { if (!['new', 'abandoned'].includes(progress.status)) fail(409, 'conflict', 'Задание уже принято'); progress.status = 'active'; state.progress[task.id] = progress; saveUser(db, userId, state); return send(response, 200, { status: progress.status, repositoryUrl: progress.repo ?? null, liked: !!progress.liked }) }
        if (action === 'progress' && method === 'PATCH') { if (!['active', 'revision'].includes(progress.status)) fail(409, 'conflict', 'Задание не в работе'); progress.repo = need(payload.repositoryUrl, 'repositoryUrl'); if (!repoPattern.test(progress.repo)) fail(400, 'validation_error', 'Нужна ссылка GitHub'); state.progress[task.id] = progress; saveUser(db, userId, state); return send(response, 200, { status: progress.status, repositoryUrl: progress.repo, liked: !!progress.liked }) }
        if (action === 'abandon' && method === 'POST') { if (!['active', 'revision'].includes(progress.status)) fail(409, 'conflict', 'Задание нельзя завершить'); progress.status = 'abandoned'; state.progress[task.id] = progress; saveUser(db, userId, state); return send(response, 200, { status: progress.status, repositoryUrl: progress.repo ?? null }) }
        if (action === 'submit' && method === 'POST') {
          const key = request.headers['idempotency-key']; if (typeof key !== 'string' || !/^[0-9a-f-]{36}$/i.test(key)) fail(400, 'validation_error', 'Нужен Idempotency-Key UUID')
          const previous = db.prepare('SELECT id,status FROM submissions WHERE user_id=? AND task_id=? AND idempotency_key=?').get(userId, task.id, key)
          if (previous) return send(response, 200, { submissionId: previous.id, status: previous.status })
          if (!['active', 'revision'].includes(progress.status)) fail(409, 'conflict', 'Задание не готово к отправке')
          const repositoryUrl = need(payload.repositoryUrl, 'repositoryUrl'); if (!repoPattern.test(repositoryUrl)) fail(400, 'validation_error', 'Нужна ссылка GitHub')
          const id = randomUUID()
          transaction(db, () => { state.progress[task.id] = { ...progress, status: 'checking', repo: repositoryUrl }; saveUser(db, userId, state); db.prepare('INSERT INTO submissions VALUES (?,?,?,?,?,?,?,?)').run(id, userId, task.id, repositoryUrl, 'checking', null, key, new Date().toISOString()) })
          queueMicrotask(() => processSubmission(id))
          return send(response, 202, { submissionId: id, status: 'checking' })
        }
      }
      if (method === 'GET' && (match = route(resource, /^\/submissions\/([^/]+)$/))) {
        const row = db.prepare('SELECT * FROM submissions WHERE id=?').get(match[1]); if (!row) fail(404, 'not_found', 'Отправка не найдена'); if (row.user_id !== userId) fail(403, 'forbidden', 'Нет доступа к отправке')
        return send(response, 200, row.result ? JSON.parse(row.result) : { submissionId: row.id, taskId: row.task_id, status: row.status })
      }
      if (method === 'GET' && resource === '/projects') return send(response, 200, page(all(db, 'projects').filter(p => !url.searchParams.get('q') || `${p.title} ${p.description} ${p.roles.map(r => r.name).join(' ')}`.toLowerCase().includes(url.searchParams.get('q').toLowerCase())).map(p => projectView(db, p, userId)), url.searchParams.get('cursor')))
      if (method === 'GET' && resource === '/me/projects') return send(response, 200, page(all(db, 'projects').filter(p => p.ownerId === userId || p.memberIds.includes(userId) || db.prepare('SELECT 1 FROM applications WHERE project_id=? AND user_id=?').get(p.id, userId)).map(p => projectView(db, p, userId)), url.searchParams.get('cursor')))
      if (method === 'POST' && resource === '/projects') {
        const title = need(payload.title, 'title', 100), description = need(payload.description, 'description', 1000), goal = need(payload.goal, 'goal', 1000), duration = need(payload.duration, 'duration', 100)
        if (!['remote', 'offline'].includes(payload.format) || !Number.isInteger(payload.maxMembers) || payload.maxMembers < 2 || payload.maxMembers > 20 || !Array.isArray(payload.tags) || !Array.isArray(payload.roles) || !payload.roles.length) fail(400, 'validation_error', 'Некорректные параметры проекта')
        const roles = payload.roles.map(role => ({ name: need(role.name, 'role.name', 50), minLevel: Number(role.minLevel), requirement: String(role.requirement ?? '').slice(0, 300) }))
        if (roles.some(role => !Number.isInteger(role.minLevel) || role.minLevel < 1 || role.minLevel > 20)) fail(400, 'validation_error', 'Некорректный уровень роли')
        const project = { id: randomUUID(), title, description, goal, duration, format: payload.format, maxMembers: payload.maxMembers, tags: payload.tags.slice(0, 10).map(tag => need(tag, 'tag', 50)), roles, ownerId: userId, memberIds: [userId] }
        db.prepare('INSERT INTO projects VALUES (?,?)').run(project.id, json(project)); return send(response, 201, projectView(db, project, userId))
      }
      if (method === 'GET' && (match = route(resource, /^\/projects\/([^/]+)$/))) { const project = read(db, 'projects', match[1]); if (!project) fail(404, 'not_found', 'Проект не найден'); return send(response, 200, projectView(db, project, userId)) }
      if (method === 'PUT' && (match = route(resource, /^\/projects\/([^/]+)\/like$/))) { if (!read(db, 'projects', match[1])) fail(404, 'not_found', 'Проект не найден'); like(db, 'project_likes', userId, match[1], payload.liked, 'project_id'); return send(response, 200, { liked: payload.liked }) }
      if (method === 'POST' && (match = route(resource, /^\/projects\/([^/]+)\/applications$/))) {
        const project = read(db, 'projects', match[1]); if (!project) fail(404, 'not_found', 'Проект не найден')
        const role = project.roles.find(r => r.name === payload.role); if (!role) fail(400, 'validation_error', 'Роль не найдена')
        if (project.memberIds.includes(userId) || db.prepare('SELECT 1 FROM applications WHERE project_id=? AND user_id=?').get(project.id, userId)) fail(409, 'conflict', 'Заявка уже существует')
        if (project.memberIds.length >= project.maxMembers) fail(409, 'conflict', 'Команда набрана')
        const direction = seedDirections.find(d => d.title === role.name); if (direction && (user().profile.skills[direction.id] ?? 1) < role.minLevel) fail(403, 'forbidden', 'Недостаточный уровень навыка')
        const application = { id: randomUUID(), status: 'pending', role: role.name }
        db.prepare('INSERT INTO applications VALUES (?,?,?,?,?,?)').run(application.id, project.id, userId, role.name, application.status, new Date().toISOString())
        return send(response, 201, application)
      }
      if (method === 'PATCH' && (match = route(resource, /^\/projects\/([^/]+)\/applications\/([^/]+)$/))) {
        if (!['accepted', 'rejected'].includes(payload.status)) fail(400, 'validation_error', 'Некорректный статус')
        const updated = transaction(db, () => {
          const project = read(db, 'projects', match[1]); if (!project) fail(404, 'not_found', 'Проект не найден'); if (project.ownerId !== userId) fail(403, 'forbidden', 'Только автор может решать по заявке')
          const application = db.prepare('SELECT * FROM applications WHERE id=? AND project_id=?').get(match[2], project.id)
          if (!application) fail(404, 'not_found', 'Заявка не найдена'); if (application.status !== 'pending') fail(409, 'conflict', 'Заявка уже обработана')
          if (payload.status === 'accepted') { if (project.memberIds.length >= project.maxMembers) fail(409, 'conflict', 'Команда набрана'); project.memberIds.push(application.user_id); db.prepare('UPDATE projects SET data=? WHERE id=?').run(json(project), project.id) }
          db.prepare('UPDATE applications SET status=? WHERE id=?').run(payload.status, application.id)
          return { id: application.id, status: payload.status, role: application.role }
        })
        return send(response, 200, updated)
      }
      if (method === 'GET' && resource === '/events') return send(response, 200, page(all(db, 'events').filter(e => (!url.searchParams.get('format') || e.format === url.searchParams.get('format')) && (!url.searchParams.get('kind') || e.kind === url.searchParams.get('kind'))).map(e => eventView(db, e, userId)), url.searchParams.get('cursor')))
      if (method === 'GET' && resource === '/me/events') return send(response, 200, page(all(db, 'events').filter(e => db.prepare('SELECT 1 FROM registrations WHERE user_id=? AND event_id=?').get(userId, e.id)).map(e => eventView(db, e, userId)), url.searchParams.get('cursor')))
      if (method === 'GET' && (match = route(resource, /^\/events\/([^/]+)$/))) { const event = read(db, 'events', match[1]); if (!event) fail(404, 'not_found', 'Мероприятие не найдено'); return send(response, 200, eventView(db, event, userId)) }
      if (method === 'PUT' && (match = route(resource, /^\/events\/([^/]+)\/like$/))) { if (!read(db, 'events', match[1])) fail(404, 'not_found', 'Мероприятие не найдено'); like(db, 'event_likes', userId, match[1], payload.liked, 'event_id'); return send(response, 200, { liked: payload.liked }) }
      if (method === 'POST' && (match = route(resource, /^\/events\/([^/]+)\/registrations$/))) { if (!read(db, 'events', match[1])) fail(404, 'not_found', 'Мероприятие не найдено'); db.prepare('INSERT OR IGNORE INTO registrations VALUES (?,?)').run(userId, match[1]); return send(response, 200, { eventId: match[1], status: 'registered' }) }
      if (method === 'DELETE' && (match = route(resource, /^\/events\/([^/]+)\/registrations\/me$/))) { db.prepare('DELETE FROM registrations WHERE user_id=? AND event_id=?').run(userId, match[1]); return send(response, 200, { eventId: match[1], status: 'cancelled' }) }
      if (method === 'GET' && resource === '/videos') return send(response, 200, page(db.prepare("SELECT * FROM videos WHERE status='published' ORDER BY created_at DESC").all().filter(row => !url.searchParams.get('directionId') || JSON.parse(row.data).directionId === url.searchParams.get('directionId')).map(row => videoView(db, row, userId, base)), url.searchParams.get('cursor')))
      if (method === 'POST' && resource === '/videos/uploads') {
        const fileName = need(payload.fileName, 'fileName', 255), mime = payload.mimeType, size = payload.size
        if (!['video/mp4', 'video/webm'].includes(mime)) fail(400, 'validation_error', 'Поддерживаются MP4 и WebM')
        if (!Number.isInteger(size) || size < 16 || size > 100_000_000) fail(413, 'too_large', 'Видео должно быть не больше 100 МБ')
        const id = randomUUID(), token = randomBytes(24).toString('hex')
        db.prepare('INSERT INTO uploads(id,user_id,token,file_name,mime,size,expires_at) VALUES (?,?,?,?,?,?,?)').run(id, userId, token, fileName, mime, size, Date.now() + 600_000)
        return send(response, 201, { uploadId: id, uploadUrl: `${base}/api/v1/uploads/${id}`, method: 'PUT', headers: { 'x-upload-token': token, 'content-type': mime } })
      }
      if (method === 'POST' && resource === '/videos') {
        const upload = db.prepare('SELECT * FROM uploads WHERE id=?').get(payload.uploadId)
        if (!upload || upload.user_id !== userId || !upload.uploaded) fail(400, 'validation_error', 'Видео не загружено')
        if (db.prepare('SELECT 1 FROM videos WHERE upload_id=?').get(upload.id)) fail(409, 'conflict', 'Видео уже опубликовано')
        const caption = need(payload.caption, 'caption', 500), direction = directionById(payload.directionId)
        if (payload.linkedTaskId) taskById(payload.linkedTaskId)
        if (payload.linkedProjectId && !read(db, 'projects', payload.linkedProjectId)) fail(404, 'not_found', 'Проект не найден')
        const video = { id: randomUUID(), userId, caption, directionId: direction.id, linkedTaskId: payload.linkedTaskId ?? null, linkedProjectId: payload.linkedProjectId ?? null, poster: 'linear-gradient(140deg,#142d6e,#417ee2 52%,#c5d7ff)' }
        db.prepare('INSERT INTO videos VALUES (?,?,?,?,?)').run(video.id, json(video), 'published', upload.id, new Date().toISOString())
        return send(response, 201, videoView(db, db.prepare('SELECT * FROM videos WHERE id=?').get(video.id), userId, base))
      }
      if (method === 'GET' && (match = route(resource, /^\/videos\/([^/]+)$/))) { const row = db.prepare('SELECT * FROM videos WHERE id=?').get(match[1]); if (!row) fail(404, 'not_found', 'Видео не найдено'); if (row.status !== 'published' && JSON.parse(row.data).userId !== userId) fail(403, 'forbidden', 'Видео ещё недоступно'); return send(response, 200, videoView(db, row, userId, base)) }
      if (method === 'PUT' && (match = route(resource, /^\/videos\/([^/]+)\/like$/))) { if (!db.prepare('SELECT 1 FROM videos WHERE id=?').get(match[1])) fail(404, 'not_found', 'Видео не найдено'); like(db, 'video_likes', userId, match[1], payload.liked, 'video_id'); const row = db.prepare('SELECT * FROM videos WHERE id=?').get(match[1]); const view = videoView(db, row, userId, base); return send(response, 200, { liked: view.liked, likes: view.likes }) }
      if (method === 'GET' && (match = route(resource, /^\/videos\/([^/]+)\/comments$/))) { if (!db.prepare('SELECT 1 FROM videos WHERE id=?').get(match[1])) fail(404, 'not_found', 'Видео не найдено'); return send(response, 200, page(db.prepare('SELECT * FROM comments WHERE video_id=? ORDER BY created_at').all(match[1]).map(row => commentView(db, row, userId)), url.searchParams.get('cursor')) ) }
      if (method === 'POST' && (match = route(resource, /^\/videos\/([^/]+)\/comments$/))) {
        if (!db.prepare("SELECT 1 FROM videos WHERE id=? AND status='published'").get(match[1])) fail(404, 'not_found', 'Видео не найдено')
        const text = need(payload.text, 'text', 1000)
        if (payload.parentId && !db.prepare('SELECT 1 FROM comments WHERE id=? AND video_id=?').get(payload.parentId, match[1])) fail(400, 'validation_error', 'Родительский комментарий не найден')
        const id = randomUUID(), now = new Date().toISOString()
        db.prepare('INSERT INTO comments VALUES (?,?,?,?,?,?)').run(id, match[1], userId, text, payload.parentId ?? null, now)
        return send(response, 201, commentView(db, db.prepare('SELECT * FROM comments WHERE id=?').get(id), userId))
      }
      if (method === 'PUT' && (match = route(resource, /^\/videos\/([^/]+)\/comments\/([^/]+)\/like$/))) { if (!db.prepare('SELECT 1 FROM comments WHERE id=? AND video_id=?').get(match[2], match[1])) fail(404, 'not_found', 'Комментарий не найден'); like(db, 'comment_likes', userId, match[2], payload.liked, 'comment_id'); return send(response, 200, { liked: payload.liked, likes: db.prepare('SELECT COUNT(*) AS count FROM comment_likes WHERE comment_id=?').get(match[2]).count }) }
      fail(404, 'not_found', 'Маршрут не найден')
    } catch (error) {
      if (error instanceof ApiError) return send(response, error.status, { error: { code: error.code, message: error.message, fields: error.fields } })
      console.error(error)
      return send(response, 500, { error: { code: 'internal_error', message: 'Ошибка сервера', fields: {} } })
    }
  })
  return { server, db, close: () => { server.close(); db.close() } }
}
