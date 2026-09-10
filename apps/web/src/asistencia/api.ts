import { useAuth0 } from '@auth0/auth0-react'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

async function toError(res: Response) {
  const body = await res.json().catch(() => undefined)
  return new ApiError(body?.message ?? `API error ${res.status}`, res.status)
}

export function useAsistenciaApi() {
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

  async function downloadFile(path: string): Promise<{ blob: Blob; filename: string }> {
    const token = await getAccessTokenSilently()
    const res = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) {
      throw await toError(res)
    }
    const disposition = res.headers.get('Content-Disposition') ?? ''
    const match = /filename="?([^"]+)"?/.exec(disposition)
    const filename = match?.[1] ?? 'export.csv'
    return { blob: await res.blob(), filename }
  }

  return {
    get: (path: string) => request(path),
    post: (path: string, body?: unknown) =>
      request(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
    patch: (path: string, body?: unknown) =>
      request(path, { method: 'PATCH', body: JSON.stringify(body) }),
    del: (path: string) => request(path, { method: 'DELETE' }),
    postForm: (path: string, formData: FormData, method: 'POST' | 'PATCH' = 'POST') =>
      request(path, { method, body: formData }),
    downloadFile,
  }
}
