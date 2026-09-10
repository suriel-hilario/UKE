import { useEffect, useState } from 'react'
import { useAdminApi } from '../api'
import { t } from '../i18n'
import { TemporadaDetail } from './TemporadaDetail'

interface Temporada {
  id: string
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  estado: 'abierta' | 'cerrada'
}

export function TemporadasPage() {
  const api = useAdminApi()
  const [temporadas, setTemporadas] = useState<Temporada[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [form, setForm] = useState({ nombre: '', fecha_inicio: '', fecha_fin: '' })

  async function refresh() {
    setTemporadas(await api.get('/admin/temporadas'))
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    await api.post('/admin/temporadas', form)
    setForm({ nombre: '', fecha_inicio: '', fecha_fin: '' })
    await refresh()
  }

  async function handleClose(id: string) {
    if (!window.confirm(t('cerrarTemporadaConfirm'))) return
    await api.post(`/admin/temporadas/${id}/close`)
    await refresh()
  }

  return (
    <div>
      <h2>{t('temporadas')}</h2>
      <form onSubmit={handleCreate}>
        <input
          placeholder={t('nombre')}
          required
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
        />
        <input
          type="date"
          required
          value={form.fecha_inicio}
          onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
        />
        <input
          type="date"
          required
          value={form.fecha_fin}
          onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
        />
        <button type="submit">{t('crear')}</button>
      </form>

      <table>
        <thead>
          <tr>
            <th>{t('nombre')}</th>
            <th>{t('estado')}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {temporadas.map((temporada) => (
            <tr key={temporada.id}>
              <td>{temporada.nombre}</td>
              <td>
                <span>{temporada.estado === 'abierta' ? t('abierta') : t('cerrada')}</span>
              </td>
              <td>
                <button onClick={() => setSelected(temporada.id)}>{t('editar')}</button>
                {temporada.estado === 'abierta' && (
                  <button onClick={() => handleClose(temporada.id)}>{t('cerrarTemporada')}</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected && <TemporadaDetail temporadaId={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
