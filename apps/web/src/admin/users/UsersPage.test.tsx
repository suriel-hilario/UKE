import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useAuth0 } from '@auth0/auth0-react'
import { UsersPage } from './UsersPage'

vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }))

const mockUseAuth0 = vi.mocked(useAuth0)

describe('UsersPage', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
      this.removeAttribute('open')
    }
    mockUseAuth0.mockReset()
    mockUseAuth0.mockReturnValue({
      getAccessTokenSilently: vi.fn().mockResolvedValue('token'),
    } as unknown as ReturnType<typeof useAuth0>)

    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    })
    global.fetch = fetchMock as unknown as typeof fetch
  })

  it('creation modal calls POST /admin/users with the correct payload', async () => {
    render(<UsersPage />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    fetchMock.mockClear()
    fetchMock.mockImplementation((url: string, options?: RequestInit) => {
      if (options?.method === 'POST' && url.endsWith('/admin/users')) {
        return Promise.resolve({ ok: true, status: 201, json: async () => ({}) })
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => [] })
    })

    fireEvent.click(screen.getByRole('button', { name: /Sortu|Crear/ }))

    fireEvent.change(screen.getByLabelText(/Emaila|Email/), {
      target: { value: 'nueva@club.com' },
    })
    fireEvent.change(screen.getByLabelText(/Izena|Nombre/), {
      target: { value: 'Nueva Persona' },
    })

    fireEvent.click(screen.getByRole('button', { name: /Gorde|Guardar/ }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/admin/users'),
        expect.objectContaining({ method: 'POST' }),
      ),
    )

    const call = fetchMock.mock.calls.find((c: unknown[]) => (c[0] as string).endsWith('/admin/users'))!
    const options = call[1] as RequestInit
    expect(JSON.parse(options.body as string)).toEqual({
      email: 'nueva@club.com',
      nombre_visible: 'Nueva Persona',
      rol: 'entrenador',
      categoria_asignada: undefined,
      equipo_ids: [],
    })
  })

  it('reset password button calls POST /admin/users/:id/reset-password and shows confirmation', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith('/admin/users')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [
            { id: 'u1', nombre_visible: 'Ana', email: 'ana@club.com', rol: 'entrenador', categoria_asignada: null, equipo_ids: [] },
          ],
        })
      }
      if (url.endsWith('/admin/users/u1/reset-password')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true }) })
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => [] })
    })

    render(<UsersPage />)

    await waitFor(() => expect(screen.getByText('Ana')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: /Pasahitza berrezarri|Restablecer contraseña/ }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/admin/users/u1/reset-password'),
        expect.objectContaining({ method: 'POST' }),
      ),
    )

    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy())
  })
})
