import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useAuth0 } from '@auth0/auth0-react'
import { AsistenciaEntrenadoresTab } from './AsistenciaEntrenadoresTab'

vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }))
const mockUseAuth0 = vi.mocked(useAuth0)

const SESION = { id: 's1', fecha: '2026-03-02T00:00:00.000Z', numero: null, tipo: 'entrenamiento', origen: 'regla' }
const MIEMBRO = {
  id: 'm1',
  grupo: 'entrenador',
  rol_entrenador: 'Primer entrenador',
  orden: 0,
  persona: { nombre: 'Mikel Etxarri', alias: null, foto_url: null },
  registros: [{ sesion_id: 's1', estado: null, nota: null }],
}

function baseAsistencia() {
  return { sesiones: [SESION], miembros: [structuredClone(MIEMBRO)] }
}

describe('AsistenciaEntrenadoresTab', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockUseAuth0.mockReset()
    mockUseAuth0.mockReturnValue({
      getAccessTokenSilently: vi.fn().mockResolvedValue('token'),
    } as unknown as ReturnType<typeof useAuth0>)

    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => baseAsistencia() })
    global.fetch = fetchMock as unknown as typeof fetch
  })

  it('shows a friendly "sin acceso" message on 403 instead of an unhandled error', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403, json: async () => ({ message: 'Forbidden' }) })

    render(<AsistenciaEntrenadoresTab equipoId="e1" />)

    await waitFor(() => expect(screen.getByText('Sarbiderik ez')).toBeTruthy())
  })

  it('renders the training table and cycles cell state empty -> P -> A -> empty via the entrenadores endpoint', async () => {
    render(<AsistenciaEntrenadoresTab equipoId="e1" />)
    await screen.findByText('Mikel Etxarri')

    const cell = screen.getByText('·')
    fetchMock.mockClear()

    fireEvent.click(cell)
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/equipos/e1/asistencia/entrenadores'),
        expect.objectContaining({ method: 'PATCH' }),
      ),
    )
    const [, options] = fetchMock.mock.calls[0]
    expect(JSON.parse(options.body as string)).toMatchObject({ sesion_id: 's1', miembro_equipo_id: 'm1', estado: 'P' })
  })

  it('edit mode: removing a session calls PATCH entrenadores/sesiones/:id with eliminada true', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<AsistenciaEntrenadoresTab equipoId="e1" />)
    await screen.findByText('Mikel Etxarri')

    fireEvent.click(screen.getByRole('button', { name: /Editatu|Editar/ }))
    fetchMock.mockClear()

    fireEvent.click(screen.getByLabelText('quitar-dia'))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/equipos/e1/asistencia/entrenadores/sesiones/s1'),
        expect.objectContaining({ method: 'PATCH' }),
      ),
    )
    const call = fetchMock.mock.calls.find((c: unknown[]) => (c[0] as string).includes('/sesiones/s1'))!
    expect(JSON.parse((call[1] as RequestInit).body as string)).toEqual({ eliminada: true })
  })

  it('does not offer any control to add or remove an entrenador', async () => {
    render(<AsistenciaEntrenadoresTab equipoId="e1" />)
    await screen.findByText('Mikel Etxarri')

    expect(screen.queryByText(/\+ Entrenador/)).toBeNull()
    expect(screen.queryByLabelText('eliminar-jugador')).toBeNull()
  })

  it('readOnly: clicking a cell does not call PATCH and edit mode is not available', async () => {
    render(<AsistenciaEntrenadoresTab equipoId="e1" readOnly />)
    await screen.findByText('Mikel Etxarri')

    expect(screen.queryByRole('button', { name: /Editatu|Editar/ })).toBeNull()

    fetchMock.mockClear()
    fireEvent.click(screen.getByText('·'))

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/asistencia/entrenadores'),
      expect.anything(),
    )
  })
})
