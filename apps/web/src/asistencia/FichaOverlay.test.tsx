import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useAuth0 } from '@auth0/auth0-react'
import { FichaOverlay } from './FichaOverlay'

vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }))
const mockUseAuth0 = vi.mocked(useAuth0)

function fichaResponse(grupo: string) {
  return {
    persona: { nombre: 'Entrenador Uno', alias: null, foto_url: null },
    grupo,
    fecha_incorporacion: '2026-01-01',
    estadisticas: { porcentaje_total: 90, presencias: 9, faltas: 1, sesiones: 10 },
    desglose_mensual: [],
  }
}

describe('FichaOverlay', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockUseAuth0.mockReset()
    mockUseAuth0.mockReturnValue({
      getAccessTokenSilently: vi.fn().mockResolvedValue('token'),
    } as unknown as ReturnType<typeof useAuth0>)
  })

  it('shows and saves rol_entrenador when the member is an entrenador', async () => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => fichaResponse('entrenador') })
    global.fetch = fetchMock as unknown as typeof fetch

    render(
      <FichaOverlay
        equipoId="e1"
        miembroId="m1"
        lang="es"
        rolEntrenadorInicial="Primer entrenador"
        onClose={() => {}}
        onChanged={() => {}}
      />,
    )

    const rolInput = await screen.findByLabelText('Rol')
    expect((rolInput as HTMLInputElement).value).toBe('Primer entrenador')

    fireEvent.change(rolInput, { target: { value: 'Segundo entrenador' } })
    fetchMock.mockClear()

    const guardarButtons = screen.getAllByRole('button', { name: 'Guardar' })
    fireEvent.click(guardarButtons[guardarButtons.length - 1])

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/equipos/e1/miembros/m1'),
        expect.objectContaining({ method: 'PATCH' }),
      ),
    )
    const [, options] = fetchMock.mock.calls[0]
    expect(JSON.parse(options.body as string)).toEqual({ rol_entrenador: 'Segundo entrenador' })
  })

  it('does not show the rol field for a non-entrenador member', async () => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => fichaResponse('con_ficha') })
    global.fetch = fetchMock as unknown as typeof fetch

    render(
      <FichaOverlay equipoId="e1" miembroId="m1" lang="es" onClose={() => {}} onChanged={() => {}} />,
    )

    await screen.findByDisplayValue('Entrenador Uno')
    expect(screen.queryByLabelText('Rol')).toBeNull()
  })
})
