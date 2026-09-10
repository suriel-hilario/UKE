import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useAuth0 } from '@auth0/auth0-react'
import { MinutajeTab } from './MinutajeTab'

vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }))
const mockUseAuth0 = vi.mocked(useAuth0)

const EQUIPO = { id: 'e1', categoria: 'f11', minutos_por_periodo: 40, num_periodos: 2 }
const JORNADA_NUMERO_RE = /\/jornadas\/\d+/

function participacion(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    miembro_equipo_id: 'm1',
    persona: { nombre: 'Jon Etxeberria', alias: null, foto_url: null },
    convocado: false,
    jugado: false,
    titular: false,
    baja: null,
    minutos: 0,
    goles: 0,
    ...overrides,
  }
}

function jornadaDetalle(participaciones = [participacion()]) {
  return { numero: 1, rival: null, fecha: null, campo: 'local', goles_favor: 0, goles_contra: 0, participaciones }
}

describe('MinutajeTab', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockUseAuth0.mockReset()
    mockUseAuth0.mockReturnValue({
      getAccessTokenSilently: vi.fn().mockResolvedValue('token'),
    } as unknown as ReturnType<typeof useAuth0>)

    fetchMock = vi.fn().mockImplementation((url: string) => {
      if (JORNADA_NUMERO_RE.test(url)) {
        return Promise.resolve({ ok: true, status: 200, json: async () => jornadaDetalle() })
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => [] })
    })
    global.fetch = fetchMock as unknown as typeof fetch
  })

  it('toggling the JUG pill also activates CONV before saving', async () => {
    render(<MinutajeTab equipo={EQUIPO} lang="es" />)
    await screen.findByText('Jon Etxeberria')

    fireEvent.click(screen.getByRole('button', { name: 'JUG' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'CONV', pressed: true })).toBeTruthy()
    })
  })

  it('toggling the TIT pill with minutos at 0 fills minutos with match duration', async () => {
    render(<MinutajeTab equipo={EQUIPO} lang="es" />)
    await screen.findByText('Jon Etxeberria')

    fireEvent.click(screen.getByRole('button', { name: 'TIT' }))

    await waitFor(() => {
      const minutosInput = screen.getByLabelText('Minutos') as HTMLInputElement
      expect(minutosInput.value).toBe('80')
    })
  })

  it('marking LES deactivates SAN if it was active', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (JORNADA_NUMERO_RE.test(url)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => jornadaDetalle([participacion({ baja: 'SAN' })]),
        })
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => [] })
    })

    render(<MinutajeTab equipo={EQUIPO} lang="es" />)
    await screen.findByText('Jon Etxeberria')

    expect(screen.getByRole('button', { name: 'SAN', pressed: true })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'LES' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'SAN', pressed: false })).toBeTruthy()
      expect(screen.getByRole('button', { name: 'LES', pressed: true })).toBeTruthy()
    })
  })

  it('clicking GUARDAR JORNADA calls POST and refreshes historial', async () => {
    render(<MinutajeTab equipo={EQUIPO} lang="es" />)
    await screen.findByText('Jon Etxeberria')

    fetchMock.mockClear()
    fireEvent.click(screen.getByRole('button', { name: /GUARDAR JORNADA/ }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/equipos/e1/jornadas'),
        expect.objectContaining({ method: 'POST' }),
      ),
    )
  })

  it('loading an existing jornada number fills the form and participations', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/jornadas/2')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            numero: 2,
            rival: 'CD Rival',
            fecha: '2026-03-01',
            campo: 'visitante',
            goles_favor: 1,
            goles_contra: 2,
            participaciones: [participacion({ convocado: true, jugado: true, minutos: 40 })],
          }),
        })
      }
      if (JORNADA_NUMERO_RE.test(url)) {
        return Promise.resolve({ ok: true, status: 200, json: async () => jornadaDetalle() })
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => [] })
    })

    render(<MinutajeTab equipo={EQUIPO} lang="es" />)
    await screen.findByText('Jon Etxeberria')

    const numeroInput = screen.getByLabelText('Jornada nº')
    fireEvent.change(numeroInput, { target: { value: '2' } })

    await waitFor(() => {
      const rivalInput = screen.getByLabelText('Rival') as HTMLInputElement
      expect(rivalInput.value).toBe('CD Rival')
    })
  })

  it('stats panel shows the correct alert badge according to alerta', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/dashboard')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [
            {
              miembro_equipo_id: 'm1',
              persona: { nombre: 'Jon Etxeberria', alias: null, foto_url: null },
              jornadasDesdeDebut: 5,
              disponibles: 5,
              convocados: 5,
              jugados: 3,
              titulares: 1,
              decTec: 0,
              minutos: 150,
              goles: 1,
              bajas: {},
              porcentaje_total: 37.5,
              porcentaje_conv: 37.5,
              porcentaje_disp: 37.5,
              alerta: 'intervenir',
            },
          ],
        })
      }
      if (JORNADA_NUMERO_RE.test(url)) {
        return Promise.resolve({ ok: true, status: 200, json: async () => jornadaDetalle() })
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => [] })
    })

    render(<MinutajeTab equipo={EQUIPO} lang="es" />)
    await screen.findByText('Jon Etxeberria')

    fireEvent.click(screen.getAllByLabelText('stats-jugador')[0])

    await waitFor(() => expect(screen.getByText(/Participación baja|Parte-hartze txikia/)).toBeTruthy())
  })

  it('dashboard view renders the participation table and alerts panel', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/dashboard')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [
            {
              miembro_equipo_id: 'm1',
              persona: { nombre: 'Jon Etxeberria', alias: null, foto_url: null },
              jornadasDesdeDebut: 5,
              disponibles: 5,
              convocados: 5,
              jugados: 3,
              titulares: 1,
              decTec: 0,
              minutos: 150,
              goles: 1,
              bajas: {},
              porcentaje_total: 37.5,
              porcentaje_conv: 37.5,
              porcentaje_disp: 37.5,
              alerta: 'intervenir',
            },
          ],
        })
      }
      if (JORNADA_NUMERO_RE.test(url)) {
        return Promise.resolve({ ok: true, status: 200, json: async () => jornadaDetalle() })
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => [] })
    })

    render(<MinutajeTab equipo={EQUIPO} lang="es" />)
    await screen.findByText('Jon Etxeberria')

    fireEvent.click(screen.getByRole('button', { name: /Dashboard/ }))

    await waitFor(() => expect(screen.getAllByText('Jon Etxeberria').length).toBeGreaterThan(0))
    expect(screen.getByText(/Participación baja|Parte-hartze txikia/)).toBeTruthy()
  })

  it('readOnly: GUARDAR JORNADA button is not rendered and pills are not interactive', async () => {
    render(<MinutajeTab equipo={EQUIPO} lang="es" readOnly />)
    await screen.findByText('Jon Etxeberria')

    expect(screen.queryByRole('button', { name: /GUARDAR JORNADA/ })).toBeNull()

    fetchMock.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'CONV' }))

    expect(screen.getByRole('button', { name: 'CONV', pressed: false })).toBeTruthy()
  })
})
