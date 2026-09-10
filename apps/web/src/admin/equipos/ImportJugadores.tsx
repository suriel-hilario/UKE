import { useState } from 'react'
import { useAdminApi } from '../api'
import { t } from '../i18n'

interface Preview {
  valid: { row: number; nombre: string; fecha_incorporacion: string }[]
  errors: { row: number; field: string; message: string }[]
}

export function ImportJugadores({ equipoId, onImported }: { equipoId: string; onImported: () => void }) {
  const api = useAdminApi()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)

  async function handlePreview(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    setPreview(await api.postForm(`/admin/equipos/${equipoId}/import-jugadores`, formData))
  }

  async function handleConfirm() {
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    await api.postForm(`/admin/equipos/${equipoId}/import-jugadores?confirm=true`, formData)
    setPreview(null)
    setFile(null)
    onImported()
  }

  return (
    <div>
      <h3>{t('importarJugadoreak')}</h3>
      <form onSubmit={handlePreview}>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button type="submit" disabled={!file}>
          {t('crear')}
        </button>
      </form>

      {preview && (
        <div>
          <table>
            <thead>
              <tr>
                <th>{t('fila')}</th>
                <th>{t('nombre')}</th>
                <th>{t('fechaIncorporacion')}</th>
              </tr>
            </thead>
            <tbody>
              {preview.valid.map((row) => (
                <tr key={row.row}>
                  <td>{row.row}</td>
                  <td>{row.nombre}</td>
                  <td>{row.fecha_incorporacion}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table>
            <thead>
              <tr>
                <th>{t('fila')}</th>
                <th>{t('campo')}</th>
                <th>{t('error')}</th>
              </tr>
            </thead>
            <tbody>
              {preview.errors.map((error, i) => (
                <tr key={i}>
                  <td>{error.row}</td>
                  <td>{error.field}</td>
                  <td>{error.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={handleConfirm} disabled={preview.valid.length === 0}>
            {t('confirmar')}
          </button>
        </div>
      )}
    </div>
  )
}
