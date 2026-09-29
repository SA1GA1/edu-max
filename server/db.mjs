import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

export function openDatabase(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path)
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;')
  const version = db.prepare('PRAGMA user_version').get().user_version
  if (version > 2) throw new Error(`Unsupported database schema version: ${version}`)
  if (version === 0) db.exec(`
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, profile TEXT NOT NULL, settings TEXT NOT NULL, progress TEXT NOT NULL, unlocked TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS project_likes (user_id TEXT NOT NULL, project_id TEXT NOT NULL, PRIMARY KEY(user_id,project_id));
    CREATE TABLE IF NOT EXISTS applications (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, user_id TEXT NOT NULL, role TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(project_id,user_id));
    CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS event_likes (user_id TEXT NOT NULL, event_id TEXT NOT NULL, PRIMARY KEY(user_id,event_id));
    CREATE TABLE IF NOT EXISTS registrations (user_id TEXT NOT NULL, event_id TEXT NOT NULL, PRIMARY KEY(user_id,event_id));
    CREATE TABLE IF NOT EXISTS uploads (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token TEXT NOT NULL, file_name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL, expires_at INTEGER NOT NULL, uploaded INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS videos (id TEXT PRIMARY KEY, data TEXT NOT NULL, status TEXT NOT NULL, upload_id TEXT, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS video_likes (user_id TEXT NOT NULL, video_id TEXT NOT NULL, PRIMARY KEY(user_id,video_id));
    CREATE TABLE IF NOT EXISTS comments (id TEXT PRIMARY KEY, video_id TEXT NOT NULL, user_id TEXT NOT NULL, text TEXT NOT NULL, parent_id TEXT, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS comment_likes (user_id TEXT NOT NULL, comment_id TEXT NOT NULL, PRIMARY KEY(user_id,comment_id));
    CREATE TABLE IF NOT EXISTS submissions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, task_id TEXT NOT NULL, repository_url TEXT NOT NULL, status TEXT NOT NULL, result TEXT, idempotency_key TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(user_id,task_id,idempotency_key));
    PRAGMA user_version=1;
  `)
  const currentVersion = db.prepare('PRAGMA user_version').get().user_version
  if (currentVersion === 1) {
    db.exec('ALTER TABLE users ADD COLUMN username_key TEXT;')
    const rows = db.prepare('SELECT id,profile FROM users ORDER BY id').all()
    const used = new Set()
    const update = db.prepare('UPDATE users SET profile=?,username_key=? WHERE id=?')
    for (const row of rows) {
      const profile = JSON.parse(row.profile)
      const original = String(profile.username ?? profile.handle ?? `user_${row.id}`).replace(/^@/, '')
      const base = sanitizeUsername(original) || `user_${String(row.id).replace(/[^a-z0-9]/gi, '').slice(-12)}`
      let username = base.slice(0, 24), suffix = 2
      while (used.has(normalizeUsername(username))) {
        const tail = String(suffix++)
        username = `${base.slice(0, 24 - tail.length)}${tail}`
      }
      const key = normalizeUsername(username)
      used.add(key)
      profile.username = username
      profile.handle = `@${username}`
      update.run(JSON.stringify(profile), key, row.id)
    }
    db.exec('CREATE UNIQUE INDEX users_username_key_unique ON users(username_key); PRAGMA user_version=2;')
  }
  return db
}

export const normalizeUsername = value => String(value ?? '').toLowerCase()
export const sanitizeUsername = value => String(value ?? '').replace(/^@/, '').replace(/[^A-Za-z0-9._]/g, '').slice(0, 24)

export const parse = row => row ? JSON.parse(row.data) : null
export function transaction(db, action) {
  db.exec('BEGIN IMMEDIATE')
  try { const result = action(); db.exec('COMMIT'); return result }
  catch (error) { db.exec('ROLLBACK'); throw error }
}
