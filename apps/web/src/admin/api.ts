import { useAuth0 } from '@auth0/auth0-react'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

async function toError(res: Response) {
  const body = await res.json().catch(() => undefined)
  return new Error(body?.message ?? `API error ${res.status}`)
}

export function useAdminApi() {
  const { getAccessTokenSilently } = useAuth0()

  async function request(path: string, options: RequestInit = {}) {
    const token = await getAccessTokenSilently()
    const isFormData = options.body instanceof FormData
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    })

    if (!res.ok) {
      throw await toError(res)
    }
    if (res.status === 204) return undefined
    return res.json()
  }

  return {
    get: (path: string) => request(path),
    post: (path: string, body?: unknown) =>
      request(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
    patch: (path: string, body?: unknown) =>
      request(path, { method: 'PATCH', body: JSON.stringify(body) }),
    del: (path: string) => request(path, { method: 'DELETE' }),
    postForm: (path: string, formData: FormData) => request(path, { method: 'POST', body: formData }),
  }
}
