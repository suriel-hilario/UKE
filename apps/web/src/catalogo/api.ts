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

export function useCatalogoApi() {
  const { getAccessTokenSilently } = useAuth0()

  async function request(path: string, options: RequestInit = {}) {
    const token = await getAccessTokenSilently()
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
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
    patch: (path: string, body?: unknown) =>
      request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  }
}
