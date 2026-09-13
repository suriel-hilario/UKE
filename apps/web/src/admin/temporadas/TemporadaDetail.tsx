import { useEffect, useState } from 'react'
import { useAdminApi } from '../api'
import { t } from '../i18n'
import { useLang } from '../LangContext'

interface Bloque {
  id: string
  tipo: string
  fecha_activacion: string
}

interface Festivo {
  id: string
  fecha: string
  descripcion?: string
}

export function TemporadaDetail({
  temporadaId,
  onClose,
}: {
  temporadaId: string
  onClose: () => void
}) {
  const api = useAdminApi()
  const lang = useLang()
  const [bloques, setBloques] = useState<Bloque[]>([])
  const [festivos, setFestivos] = useState<Festivo[]>([])
  const [bloqueForm, setBloqueForm] = useState({ tipo: 'unico', fecha_activacion: '' })
  const [festivoForm, setFestivoForm] = useState({ fecha: '', descripcion: '' })

  async function refresh() {
    setBloques(await api.get(`/admin/temporadas/${temporadaId}/bloques`))
    setFestivos(await api.get(`/admin/temporadas/${temporadaId}/festivos`))
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temporadaId])

  async function handleCreateBloque(e: React.FormEvent) {
    e.preventDefault()
    await api.post(`/admin/temporadas/${temporadaId}/bloques`, bloqueForm)
    setBloqueForm({ tipo: 'unico', fecha_activacion: '' })
    await refresh()
  }

  async function handleCreateFestivo(e: React.FormEvent) {
    e.preventDefault()
    await api.post(`/admin/temporadas/${temporadaId}/festivos`, festivoForm)
    setFestivoForm({ fecha: '', descripcion: '' })
    await refresh()
  }

  async function handleDeleteFestivo(id: string) {
    await api.del(`/admin/temporadas/${temporadaId}/festivos/${id}`)
    await refresh()
  }

  return (
    <div>
      <button onClick={onClose}>{t('cancelar', lang)}</button>

      <h3>{t('bloques', lang)}</h3>
      <ul>
        {bloques.map((bloque) => (
          <li key={bloque.id}>
            {bloque.tipo} — {bloque.fecha_activacion}
          </li>
        ))}
      </ul>
      <form onSubmit={handleCreateBloque}>
        <select
          value={bloqueForm.tipo}
          onChange={(e) => setBloqueForm({ ...bloqueForm, tipo: e.target.value })}
        >
          <option value="pretemporada">pretemporada</option>
          <option value="temporada">temporada</option>
          <option value="unico">unico</option>
        </select>
        <input
          type="date"
          required
          value={bloqueForm.fecha_activacion}
          onChange={(e) => setBloqueForm({ ...bloqueForm, fecha_activacion: e.target.value })}
        />
        <button type="submit">{t('crear', lang)}</button>
      </form>

      <h3>{t('festivos', lang)}</h3>
      <ul>
        {festivos.map((festivo) => (
          <li key={festivo.id}>
            {festivo.fecha} {festivo.descripcion}
            <button onClick={() => handleDeleteFestivo(festivo.id)}>×</button>
          </li>
        ))}
      </ul>
      <form onSubmit={handleCreateFestivo}>
        <input
          type="date"
          required
          value={festivoForm.fecha}
          onChange={(e) => setFestivoForm({ ...festivoForm, fecha: e.target.value })}
        />
        <input
          placeholder={t('descripcion', lang)}
          value={festivoForm.descripcion}
          onChange={(e) => setFestivoForm({ ...festivoForm, descripcion: e.target.value })}
        />
        <button type="submit">{t('crear', lang)}</button>
      </form>
    </div>
  )
}
