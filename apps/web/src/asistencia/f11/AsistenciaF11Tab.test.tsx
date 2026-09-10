import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useAuth0 } from '@auth0/auth0-react'
import { AsistenciaF11Tab } from './AsistenciaF11Tab'

vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }))
const mockUseAuth0 = vi.mocked(useAuth0)

const SESION = { id: 's1', fecha: '2026-03-02T00:00:00.000Z', numero: 1, tipo: 'entrenamiento', origen: 'regla' }
const SESION2 = { id: 's2', fecha: '2026-03-04T00:00:00.000Z', numero: 2, tipo: 'entrenamiento', origen: 'regla' }

function miembro(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'm1',
    grupo: 'con_ficha',
    rol_entrenador: null,
    orden: 0,
    persona: { nombre: 'Jon Etxeberria', alias: null, foto_url: null },
    registros: [
      { sesion_id: 's1', estado: null, nota: null },
      { sesion_id: 's2', estado: null, nota: null },
    ],
    contadores: {},
    porcentaje_mes: null,
    porcentaje_ano: null,
    ...overrides,
  }
}

function baseAsistencia(miembros = [miembro()]) {
  return { sesiones: [SESION, SESION2], miembros }
}

describe('AsistenciaF11Tab', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockUseAuth0.mockReset()
    mockUseAuth0.mockReturnValue({
      getAccessTokenSilently: vi.fn().mockResolvedValue('token'),
    } as unknown as ReturnType<typeof useAuth0>)

    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => baseAsistencia() })
    global.fetch = fetchMock as unknown as typeof fetch
  })

  it('selecting a state from the context menu calls PATCH with that estado', async () => {
    render(<AsistenciaF11Tab equipoId="e1" />)
    await screen.findByText('Jon Etxeberria')

    const cell = screen.getAllByText('·')[0]
    fireEvent.click(cell)

    fetchMock.mockClear()
    fireEvent.click(screen.getByRole('button', { name: /EM — Bazterrean|Al margen/ }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/equipos/e1/asistencia'),
        expect.objectContaining({ method: 'PATCH' }),
      ),
    )
    const [, options] = fetchMock.mock.calls[0]
    expect(JSON.parse(options.body as string)).toMatchObject({ estado: 'EM' })
  })

  it('mark-all button only calls PATCH for members without a mark on that session', async () => {
    const marcado = miembro({ id: 'm1', registros: [{ sesion_id: 's1', estado: '1', nota: null }, { sesion_id: 's2', estado: null, nota: null }] })
    const sinMarcar = miembro({
      id: 'm2',
      persona: { nombre: 'Ane Zubi', alias: null, foto_url: null },
      registros: [{ sesion_id: 's1', estado: null, nota: null }, { sesion_id: 's2', estado: null, nota: null }],
    })
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => baseAsistencia([marcado, sinMarcar]) })

    render(<AsistenciaF11Tab equipoId="e1" />)
    await screen.findByText('Ane Zubi')

    fetchMock.mockClear()
    fireEvent.click(screen.getAllByLabelText('marcar-todos')[0])

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const calls = fetchMock.mock.calls.filter(
      (c: unknown[]) => (c[0] as string).includes('/asistencia') && (c[1] as RequestInit)?.method === 'PATCH',
    )
    expect(calls).toHaveLength(1)
    expect(JSON.parse((calls[0][1] as RequestInit).body as string)).toMatchObject({
      miembro_equipo_id: 'm2',
      estado: '1',
    })
  })

  it('sections show correct totals', async () => {
    const jugador1 = miembro({ id: 'm1', registros: [{ sesion_id: 's1', estado: '1', nota: null }, { sesion_id: 's2', estado: '1', nota: null }] })
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => baseAsistencia([jugador1]) })

    render(<AsistenciaF11Tab equipoId="e1" />)
    await screen.findByText('Jon Etxeberria')

    expect(
      screen.getByText((_, el) => el?.tagName === 'STRONG' && el.textContent === 'Fitxadunak (1)'),
    ).toBeTruthy()
  })

  it('export button downloads the season CSV', async () => {
    render(<AsistenciaF11Tab equipoId="e1" />)
    await screen.findByText('Jon Etxeberria')

    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/exportar')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'Content-Disposition': 'attachment; filename="Asistencias_Equipo_26-27.csv"' }),
          blob: async () => new Blob(['SECCION;JUGADOR'], { type: 'text/csv' }),
        })
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => baseAsistencia() })
    })

    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock')
    global.URL.revokeObjectURL = vi.fn()
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    fireEvent.click(screen.getByRole('button', { name: /CSV/ }))

    await waitFor(() => expect(clickSpy).toHaveBeenCalled())
  })

  it('dragging a row calls PATCH miembros/:id with the new orden', async () => {
    const m1 = miembro({ id: 'm1', orden: 0 })
    const m2 = miembro({
      id: 'm2',
      orden: 1,
      persona: { nombre: 'Ane Zubi', alias: null, foto_url: null },
    })
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => baseAsistencia([m1, m2]) })

    render(<AsistenciaF11Tab equipoId="e1" />)
    await screen.findByText('Ane Zubi')

    const rows = screen.getAllByRole('row').filter((r) => r.hasAttribute('draggable'))
    expect(rows).toHaveLength(2)

    fetchMock.mockClear()
    fireEvent.dragStart(rows[0])
    fireEvent.dragOver(rows[1])
    fireEvent.drop(rows[1])

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/equipos/e1/miembros/'),
        expect.objectContaining({ method: 'PATCH' }),
      ),
    )
  })

  it('ficha overlay shows Resumen temporada and Evolución mensual', async () => {
    render(<AsistenciaF11Tab equipoId="e1" />)
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
            estadisticas: { porcentaje_total: 66.7, presencias: 2, faltas: 1, sesiones: 3 },
            contadores: { '1': 1, EM: 1, LS: 1 },
            desglose_mensual: [
              {
                mes: '2026-03',
                sesiones: 3,
                presencias: 2,
                porcentaje: 66.7,
                detalle_sesiones: [
                  { fecha: '2026-03-02', estado: '1' },
                  { fecha: '2026-03-04', estado: 'EM' },
                  { fecha: '2026-03-06', estado: 'LS' },
                ],
              },
            ],
          }),
        })
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => baseAsistencia() })
    })

    fireEvent.click(screen.getByRole('button', { name: 'Jon Etxeberria' }))

    await waitFor(() => expect(screen.getByText(/Resumen temporada|Denboraldiko laburpena/)).toBeTruthy())
    expect(screen.getByText(/Evolución mensual|Hileroko bilakaera/)).toBeTruthy()
  })

  it('readOnly: clicking a cell does not open the context menu', async () => {
    render(<AsistenciaF11Tab equipoId="e1" readOnly />)
    await screen.findByText('Jon Etxeberria')

    const cell = screen.getAllByText('·')[0]
    fireEvent.click(cell)

    expect(screen.queryByRole('button', { name: /EM — Bazterrean|Al margen/ })).toBeNull()
  })
})
