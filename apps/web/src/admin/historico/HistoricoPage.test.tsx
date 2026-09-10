import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { HistoricoPage } from './HistoricoPage'

vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }))

const mockUseAuth0 = vi.mocked(useAuth0)

const TEMPORADA_CERRADA = {
  id: 't1',
  nombre: 'Denboraldia 24-25',
  fecha_inicio: '2024-09-01',
  fecha_fin: '2025-06-30',
  estado: 'cerrada' as const,
  total_equipos: 5,
  total_sesiones: 120,
  total_jornadas: 20,
}

describe('HistoricoPage', () => {
  beforeEach(() => {
    mockUseAuth0.mockReset()
    mockUseAuth0.mockReturnValue({
      getAccessTokenSilently: vi.fn().mockResolvedValue('token'),
    } as unknown as ReturnType<typeof useAuth0>)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [TEMPORADA_CERRADA],
    }) as unknown as typeof fetch
  })

  it('renders the list of closed temporadas with summary stats', async () => {
    render(
      <MemoryRouter>
        <HistoricoPage />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByText(/Denboraldia 24-25/)).toBeTruthy())
    expect(screen.getByText(/5 equipos/)).toBeTruthy()
    expect(screen.getByText(/120 sesiones/)).toBeTruthy()
    expect(screen.getByText(/20 jornadas/)).toBeTruthy()
  })

  it('navigates to the temporada view on click', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/historico']}>
        <Routes>
          <Route path="/admin/historico" element={<HistoricoPage />} />
          <Route path="/" element={<p>home-page</p>} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByText(/Denboraldia 24-25/)).toBeTruthy())
    fireEvent.click(screen.getByText(/Denboraldia 24-25/))

    await waitFor(() => expect(screen.getByText('home-page')).toBeTruthy())
  })
})
