import { createHmac, timingSafeEqual } from 'node:crypto'

export class ApiError extends Error {
  constructor(status, code, message, fields = {}) {
    super(message)
    this.status = status
    this.code = code
    this.fields = fields
  }
}

export function verifyMaxInit(raw, botToken, now = Date.now()) {
  if (!botToken || !raw || raw.length > 16000) throw new ApiError(401, 'unauthorized', 'Данные MAX отсутствуют')
  const pairs = raw.split('&').map(part => {
    const separator = part.indexOf('=')
    if (separator < 1) throw new ApiError(401, 'unauthorized', 'Некорректные данные MAX')
    try { return [decodeURIComponent(part.slice(0, separator)), decodeURIComponent(part.slice(separator + 1).replace(/\+/g, ' '))] }
    catch { throw new ApiError(401, 'unauthorized', 'Некорректная кодировка MAX') }
  })
  if (new Set(pairs.map(([key]) => key)).size !== pairs.length) throw new ApiError(401, 'unauthorized', 'Повторяющийся параметр MAX')
  const params = Object.fromEntries(pairs)
  if (!/^[a-f0-9]{64}$/i.test(params.hash ?? '')) throw new ApiError(401, 'unauthorized', 'Подпись MAX отсутствует')
  const signed = pairs.filter(([key]) => key !== 'hash').sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, value]) => `${key}=${value}`).join('\n')
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest()
  const expected = createHmac('sha256', secret).update(signed).digest()
  if (!timingSafeEqual(Buffer.from(params.hash, 'hex'), expected)) throw new ApiError(401, 'unauthorized', 'Неверная подпись MAX')
  const issued = Number(params.auth_date)
  if (!Number.isInteger(issued) || issued * 1000 > now + 60_000 || now - issued * 1000 > 86_400_000) throw new ApiError(401, 'unauthorized', 'Срок действия данных MAX истёк')
  let user
  try { user = JSON.parse(params.user) } catch { throw new ApiError(401, 'unauthorized', 'Пользователь MAX отсутствует') }
  if (!user || !/^[0-9]+$/.test(String(user.id))) throw new ApiError(401, 'unauthorized', 'Некорректный пользователь MAX')
  return { id: `max:${user.id}`, firstName: String(user.first_name ?? ''), lastName: String(user.last_name ?? ''), username: user.username ? String(user.username) : null, avatarUrl: user.photo_url || null }
}

export function requireUser(request, botToken) {
  const authorization = request.headers.authorization ?? ''
  if (!authorization.startsWith('MaxInit ')) throw new ApiError(401, 'unauthorized', 'Откройте приложение через MAX')
  return verifyMaxInit(authorization.slice(8), botToken)
}
