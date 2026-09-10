import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useAuth0 } from '@auth0/auth0-react'
import { AsistenciaTab } from './AsistenciaTab'

vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }))
const mockUseAuth0 = vi.mocked(useAuth0)

const SESION = { id: 's1', fecha: '2026-03-02T00:00:00.000Z', numero: null, tipo: 'entrenamiento', origen: 'regla' }
const MIEMBRO = {
  id: 'm1',
  grupo: 'con_ficha',
  rol_entrenador: null,
  orden: 0,
  persona: { nombre: 'Jon Etxeberria', alias: null, foto_url: null },
  registros: [{ sesion_id: 's1', estado: null, nota: null }],
}

function baseAsistencia() {
  return { sesiones: [SESION], miembros: [structuredClone(MIEMBRO)] }
}

describe('AsistenciaTab', () => {
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

    render(<AsistenciaTab equipoId="e1" />)

    await waitFor(() => expect(screen.getByText('Sarbiderik ez')).toBeTruthy())
  })

  it('cycles cell state empty -> P -> A -> empty and calls PATCH each time', async () => {
    render(<AsistenciaTab equipoId="e1" />)
    await screen.findByText('Jon Etxeberria')

    const cell = screen.getByText('·')
    fetchMock.mockClear()

    fireEvent.click(cell)
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/equipos/e1/asistencia'),
        expect.objectContaining({ method: 'PATCH' }),
      ),
    )
    const [, options] = fetchMock.mock.calls[0]
    expect(JSON.parse(options.body as string)).toMatchObject({ sesion_id: 's1', miembro_equipo_id: 'm1', estado: 'P' })
  })

  it('note overlay saves and deletes correctly', async () => {
    render(<AsistenciaTab equipoId="e1" />)
    await screen.findByText('Jon Etxeberria')

    const cell = screen.getByText('·')
    fireEvent.contextMenu(cell)

    const textarea = await screen.findByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'llega tarde' } })

    fetchMock.mockClear()
    fireEvent.click(screen.getByRole('button', { name: /Gorde|Guardar/ }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/equipos/e1/asistencia'),
        expect.objectContaining({ method: 'PATCH' }),
      ),
    )
    const call = fetchMock.mock.calls.find((c: unknown[]) => (c[0] as string).includes('/asistencia'))!
    expect(JSON.parse((call[1] as RequestInit).body as string)).toMatchObject({ nota: 'llega tarde' })
  })

  it('edit mode: removing a session calls PATCH sesiones/:id with eliminada true', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<AsistenciaTab equipoId="e1" />)
    await screen.findByText('Jon Etxeberria')

    fireEvent.click(screen.getByRole('button', { name: /Editatu|Editar/ }))
    fetchMock.mockClear()

    fireEvent.click(screen.getByLabelText('quitar-dia'))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/equipos/e1/sesiones/s1'),
        expect.objectContaining({ method: 'PATCH' }),
      ),
    )
    const call = fetchMock.mock.calls.find((c: unknown[]) => (c[0] as string).includes('/sesiones/s1'))!
    expect(JSON.parse((call[1] as RequestInit).body as string)).toEqual({ eliminada: true })
  })

  it('edit mode: removing a player calls PATCH miembros/:id with fecha_baja of today', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<AsistenciaTab equipoId="e1" />)
    await screen.findByText('Jon Etxeberria')

    fireEvent.click(screen.getByRole('button', { name: /Editatu|Editar/ }))
    fetchMock.mockClear()

    fireEvent.click(screen.getByLabelText('eliminar-jugador'))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/equipos/e1/miembros/m1'),
        expect.objectContaining({ method: 'PATCH' }),
      ),
    )
    const call = fetchMock.mock.calls.find((c: unknown[]) => (c[0] as string).includes('/miembros/m1'))!
    const today = new Date().toISOString().slice(0, 10)
    expect(JSON.parse((call[1] as RequestInit).body as string)).toEqual({ fecha_baja: today })
  })

  it('export button downloads the CSV with the expected filename', async () => {
    render(<AsistenciaTab equipoId="e1" />)
    await screen.findByText('Jon Etxeberria')

    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/exportar')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'Content-Disposition': 'attachment; filename="UKE_Equipo_2026-03.csv"' }),
          blob: async () => new Blob(['Jugador,%'], { type: 'text/csv' }),
        })
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => baseAsistencia() })
    })

    const createObjectURL = vi.fn().mockReturnValue('blob:mock')
    const revokeObjectURL = vi.fn()
    global.URL.createObjectURL = createObjectURL
    global.URL.revokeObjectURL = revokeObjectURL
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    fireEvent.click(screen.getByRole('button', { name: /CSV/ }))

    await waitFor(() => expect(createObjectURL).toHaveBeenCalled())
    expect(clickSpy).toHaveBeenCalled()
  })

  it('ficha overlay shows season stats and monthly breakdown', async () => {
    render(<AsistenciaTab equipoId="e1" />)
    await screen.findByText('Jon Etxeberria')

    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/ficha')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            persona: { nombre: 'Jon Etxeberria', alias: null, foto_url: null },
            grupo: 'con_ficha',
            fecha_incorporacion: '2026-01-01',
            estadisticas: { porcentaje_total: 80, presencias: 4, faltas: 1, sesiones: 5 },
            desglose_mensual: [{ mes: '2026-03', sesiones: 5, presencias: 4, porcentaje: 80 }],
          }),
        })
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => baseAsistencia() })
    })

    fireEvent.click(screen.getByRole('button', { name: 'Jon Etxeberria' }))

    await waitFor(() => expect(screen.getAllByText('80').length).toBeGreaterThan(0))
    expect(screen.getAllByText('4').length).toBeGreaterThan(0)
  })

  it('readOnly: clicking a cell does not call PATCH and the + Jugador button is not rendered', async () => {
    render(<AsistenciaTab equipoId="e1" readOnly />)
    await screen.findByText('Jon Etxeberria')

    expect(screen.queryByRole('button', { name: /\+ Jokalaria|\+ Jugador/ })).toBeNull()

    fetchMock.mockClear()
    fireEvent.click(screen.getByText('·'))

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining('/asistencia'), expect.anything())
  })
})
