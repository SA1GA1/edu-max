import type { Action, AppState, Project, User } from './domain'
import { maxBridge } from './max'

export class ApiFailure extends Error {
  constructor(public status: number, message: string) { super(message) }
}

export async function apiRequest<T>(path: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}): Promise<T> {
  const initData = maxBridge.initData
  if (!initData) throw new ApiFailure(401, 'Откройте приложение через MAX')
  let response: Response
  try {
    response = await fetch(`/api/v1${path}`, {
      method,
      headers: { Authorization: `MaxInit ${initData}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch { throw new ApiFailure(0, 'Нет связи с сервером') }
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new ApiFailure(response.status, payload.error?.message ?? 'Ошибка сервера')
  return payload as T
}

export const loadSnapshot = () => apiRequest<AppState>('/me/snapshot')
export const updateProfile = (profile: { name?: string; username?: string; bio?: string; githubUrl?: string | null }) => apiRequest<User>('/me/profile', 'PATCH', profile)

export async function uploadAvatar(file: File) {
  if (!maxBridge.initData) throw new ApiFailure(401, 'Откройте приложение через MAX')
  let response: Response
  try { response = await fetch('/api/v1/me/avatar', { method: 'PUT', headers: { Authorization: `MaxInit ${maxBridge.initData}`, 'Content-Type': file.type }, body: file }) }
  catch { throw new ApiFailure(0, 'Не удалось загрузить аватар') }
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new ApiFailure(response.status, payload.error?.message ?? 'Не удалось загрузить аватар')
  return payload as User
}

export const deleteAvatar = () => apiRequest<User>('/me/avatar', 'DELETE')

export async function applyAction(action: Action, state: AppState) {
  switch (action.type) {
    case 'acceptTask': return apiRequest(`/tasks/${action.taskId}/accept`, 'POST')
    case 'abandonTask': return apiRequest(`/tasks/${action.taskId}/abandon`, 'POST')
    case 'saveRepo': return apiRequest(`/tasks/${action.taskId}/progress`, 'PATCH', { repositoryUrl: action.repo })
    case 'toggleTaskLike': return apiRequest(`/tasks/${action.taskId}/like`, 'PUT', { liked: !state.taskProgress[action.taskId]?.liked })
    case 'toggleProjectLike': return apiRequest(`/projects/${action.projectId}/like`, 'PUT', { liked: !state.projects.find(p => p.id === action.projectId)?.liked })
    case 'applyProject': return apiRequest(`/projects/${action.projectId}/applications`, 'POST', { role: action.role })
    case 'createProject': return apiRequest<Project>('/projects', 'POST', action.project)
    case 'toggleEventLike': return apiRequest(`/events/${action.eventId}/like`, 'PUT', { liked: !state.events.find(e => e.id === action.eventId)?.liked })
    case 'registerEvent': return apiRequest(`/events/${action.eventId}/registrations`, 'POST')
    case 'toggleVideoLike': return apiRequest(`/videos/${action.videoId}/like`, 'PUT', { liked: !state.videos.find(v => v.id === action.videoId)?.liked })
    case 'addComment': return apiRequest(`/videos/${action.videoId}/comments`, 'POST', { text: action.text, parentId: action.parentId })
    case 'toggleCommentLike': {
      const comment = state.videos.find(v => v.id === action.videoId)?.comments.find(c => c.id === action.commentId)
      return apiRequest(`/videos/${action.videoId}/comments/${action.commentId}/like`, 'PUT', { liked: !comment?.liked })
    }
    case 'theme': return apiRequest('/me/settings', 'PATCH', { theme: action.theme })
    case 'notification': return apiRequest('/me/settings', 'PATCH', { notifications: { [action.key]: !state.settings.notifications[action.key] } })
    default: return undefined
  }
}

export const submitTask = (taskId: string, repositoryUrl: string) => apiRequest<{ submissionId: string; status: string }>(`/tasks/${taskId}/submit`, 'POST', { repositoryUrl }, { 'Idempotency-Key': crypto.randomUUID() })
export type SubmissionResult = { submissionId: string; taskId: string; status: 'checking' | 'completed' | 'revision'; score?: number; earnedXp?: number; breakdown?: { name: string; score: number; maxScore: number }[]; feedback?: string; unlockedLevel?: number }
export const getSubmission = (id: string) => apiRequest<SubmissionResult>(`/submissions/${id}`)

export async function uploadVideo(file: File, caption: string, directionId: string) {
  const upload = await apiRequest<{ uploadId: string; uploadUrl: string; method: string; headers: Record<string, string> }>('/videos/uploads', 'POST', { fileName: file.name, mimeType: file.type, size: file.size })
  let response: Response
  try { response = await fetch(upload.uploadUrl, { method: upload.method, headers: upload.headers, body: file }) }
  catch { throw new ApiFailure(0, 'Не удалось загрузить видео') }
  if (!response.ok) { const data = await response.json().catch(() => ({})); throw new ApiFailure(response.status, data.error?.message ?? 'Не удалось загрузить видео') }
  return apiRequest('/videos', 'POST', { uploadId: upload.uploadId, caption, directionId })
}
