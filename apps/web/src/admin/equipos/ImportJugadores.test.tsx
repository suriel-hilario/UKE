import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useAuth0 } from '@auth0/auth0-react'
import { ImportJugadores } from './ImportJugadores'

vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }))

const mockUseAuth0 = vi.mocked(useAuth0)

const PREVIEW_RESPONSE = {
  valid: [{ row: 2, nombre: 'Jon', fecha_incorporacion: '2025-09-01' }],
  errors: [{ row: 3, field: 'fecha_incorporacion', message: 'obligatoria' }],
}

function selectFile() {
  const file = new File(['contenido'], 'jugadores.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(input, { target: { files: [file] } })
  return file
}

describe('ImportJugadores', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockUseAuth0.mockReset()
    mockUseAuth0.mockReturnValue({
      getAccessTokenSilently: vi.fn().mockResolvedValue('token'),
    } as unknown as ReturnType<typeof useAuth0>)

    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => PREVIEW_RESPONSE,
    })
    global.fetch = fetchMock as unknown as typeof fetch
  })

  it('shows valid rows and error rows separately after preview', async () => {
    render(<ImportJugadores equipoId="e1" onImported={vi.fn()} />)

    selectFile()
    fireEvent.click(screen.getByRole('button', { name: /Sortu|Crear/ }))

    await screen.findByText('Jon')
    expect(screen.getByText('obligatoria')).toBeTruthy()

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toContain('/admin/equipos/e1/import-jugadores')
    expect(url).not.toContain('confirm=true')
    expect(options.method).toBe('POST')
  })

  it('resends the same file with confirm=true when confirming', async () => {
    const onImported = vi.fn()
    render(<ImportJugadores equipoId="e1" onImported={onImported} />)

    selectFile()
    fireEvent.click(screen.getByRole('button', { name: /Sortu|Crear/ }))
    await screen.findByText('Jon')

    fetchMock.mockClear()
    fireEvent.click(screen.getByRole('button', { name: /Berretsi|Confirmar/ }))

    await waitFor(() => expect(onImported).toHaveBeenCalled())
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toContain('/admin/equipos/e1/import-jugadores?confirm=true')
    expect(options.method).toBe('POST')
    expect(options.body.get('file').name).toBe('jugadores.xlsx')
  })
})
