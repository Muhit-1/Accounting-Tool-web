// VITE_API_URL is inlined at build time, so a missing value would otherwise
// surface as requests to "undefined/auth/login" — fail at load with a message
// that says what to fix instead. Trailing slashes are stripped because every
// request path below starts with "/".
function resolveApiUrl(): string {
  const raw = import.meta.env.VITE_API_URL?.trim()
  if (!raw) {
    throw new Error(
      'VITE_API_URL is not set. It is a build-time variable: set it (e.g. https://api.example.com) and rebuild.',
    )
  }
  return raw.replace(/\/+$/, '')
}

export const API_URL = resolveApiUrl()

const TOKEN_STORAGE_KEY = 'accounting_tool_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  }
}

// Registered by AuthProvider: called when an authenticated request comes back
// 401 (token expired, revoked, or its user deleted) so the app can drop the
// dead session and send the user back to the login screen instead of
// leaving them on a page where every request now fails.
let unauthorizedHandler: (() => void) | null = null

export function onUnauthorized(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

function handleUnauthorized(hadToken: boolean): void {
  if (hadToken) {
    unauthorizedHandler?.()
  }
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// Nest's default exception filter returns { statusCode, message, error },
// where `message` is a string for most errors and a string[] for
// class-validator failures — normalize both into one readable string.
function extractErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message: unknown }).message
    if (Array.isArray(message)) return message.join(', ')
    if (typeof message === 'string') return message
  }
  return fallback
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')
  if (typeof options.body === 'string') {
    // Left unset for FormData bodies — the browser sets the multipart
    // boundary itself, which we can't reproduce by hand.
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (response.status === 204) {
    return undefined as T
  }

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const body = isJson ? await response.json() : undefined

  if (!response.ok) {
    // Only a 401 on an already-authenticated request means the session died
    // (the /auth/login and /auth/register 401s just mean bad credentials).
    if (response.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/auth/register')) {
      handleUnauthorized(token !== null)
    }
    throw new ApiError(response.status, extractErrorMessage(body, response.statusText))
  }

  return body as T
}

async function requestBlob(path: string): Promise<Blob> {
  const token = getToken()
  const headers = new Headers()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_URL}${path}`, { headers })
  if (!response.ok) {
    if (response.status === 401) handleUnauthorized(token !== null)
    const isJson = response.headers.get('content-type')?.includes('application/json')
    const body = isJson ? await response.json().catch(() => undefined) : undefined
    throw new ApiError(response.status, extractErrorMessage(body, response.statusText))
  }
  return response.blob()
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  postForm: <T>(path: string, formData: FormData) => request<T>(path, { method: 'POST', body: formData }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PATCH', body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  getBlob: (path: string) => requestBlob(path),
}
