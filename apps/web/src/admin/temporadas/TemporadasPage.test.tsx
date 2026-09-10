import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useAuth0 } from '@auth0/auth0-react'
import { TemporadasPage } from './TemporadasPage'

vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }))

const mockUseAuth0 = vi.mocked(useAuth0)

const TEMPORADA = {
  id: 't1',
  nombre: 'Denboraldia 25-26',
  fecha_inicio: '2025-09-01',
  fecha_fin: '2026-06-30',
  estado: 'abierta' as const,
}

describe('TemporadasPage', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let confirmSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockUseAuth0.mockReset()
    mockUseAuth0.mockReturnValue({
      getAccessTokenSilently: vi.fn().mockResolvedValue('token'),
    } as unknown as ReturnType<typeof useAuth0>)

    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [TEMPORADA],
    })
    global.fetch = fetchMock as unknown as typeof fetch
    confirmSpy = vi.fn()
    window.confirm = confirmSpy as unknown as typeof window.confirm
  })

  it('does not call the close endpoint when the confirmation is declined', async () => {
    confirmSpy.mockReturnValue(false)
    render(<TemporadasPage />)

    await screen.findByText(TEMPORADA.nombre)
    fetchMock.mockClear()

    fireEvent.click(screen.getByRole('button', { name: /Denboraldia itxi|Cerrar temporada/ }))

    expect(confirmSpy).toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/close'),
      expect.anything(),
    )
  })

  it('calls the close endpoint only after confirmation is accepted', async () => {
    confirmSpy.mockReturnValue(true)
    render(<TemporadasPage />)

    await screen.findByText(TEMPORADA.nombre)
    fetchMock.mockClear()

    fireEvent.click(screen.getByRole('button', { name: /Denboraldia itxi|Cerrar temporada/ }))

    expect(confirmSpy).toHaveBeenCalled()
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/admin/temporadas/t1/close'),
        expect.objectContaining({ method: 'POST' }),
      ),
    )
  })
})
