import { useEffect, useState } from 'react'
import { useAdminApi } from '../api'
import { t, DictKey } from '../i18n'
import { useLang } from '../LangContext'
import { EquipoDetail } from './EquipoDetail'

interface Equipo {
  id: string
  nombre: string
  categoria: string
  temporada_id: string
}

interface Temporada {
  id: string
  nombre: string
}

const DIAS = [1, 2, 3, 4, 5, 6, 7]
const DIA_KEYS: Record<number, DictKey> = {
  1: 'lunes',
  2: 'martes',
  3: 'miercoles',
  4: 'jueves',
  5: 'viernes',
  6: 'sabado',
  7: 'domingo',
}

export function EquiposPage() {
  const api = useAdminApi()
  const lang = useLang()
  const [temporadas, setTemporadas] = useState<Temporada[]>([])
  const [temporadaId, setTemporadaId] = useState<string>('')
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [form, setForm] = useState({
    nombre: '',
    categoria: 'f7',
    color: '',
    icono: '',
    minutos_por_periodo: 25,
    num_periodos: 3,
    dias_entrenamiento: [] as number[],
  })

  useEffect(() => {
    api.get('/admin/temporadas').then((data: Temporada[]) => {
      setTemporadas(data)
      if (data[0]) setTemporadaId(data[0].id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function refresh() {
    if (!temporadaId) return
    setEquipos(await api.get(`/admin/equipos?temporada_id=${temporadaId}`))
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temporadaId])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    await api.post('/admin/equipos', { ...form, temporada_id: temporadaId })
    await refresh()
  }

  function toggleDia(dia: number) {
    setForm((f) => ({
      ...f,
      dias_entrenamiento: f.dias_entrenamiento.includes(dia)
        ? f.dias_entrenamiento.filter((d) => d !== dia)
        : [...f.dias_entrenamiento, dia],
    }))
  }

  return (
    <div>
      <h2>{t('equipos', lang)}</h2>
      <select value={temporadaId} onChange={(e) => setTemporadaId(e.target.value)}>
        {temporadas.map((temporada) => (
          <option key={temporada.id} value={temporada.id}>
            {temporada.nombre}
          </option>
        ))}
      </select>

      <form onSubmit={handleCreate}>
        <input
          placeholder={t('nombre', lang)}
          required
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
        />
        <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
          <option value="eskola">eskola</option>
          <option value="f7">f7</option>
          <option value="f11">f11</option>
        </select>
        <input
          placeholder={t('color', lang)}
          value={form.color}
          onChange={(e) => setForm({ ...form, color: e.target.value })}
        />
        <input
          placeholder={t('icono', lang)}
          value={form.icono}
          onChange={(e) => setForm({ ...form, icono: e.target.value })}
        />
        <input
          type="number"
          value={form.minutos_por_periodo}
          onChange={(e) => setForm({ ...form, minutos_por_periodo: Number(e.target.value) })}
        />
        <input
          type="number"
          value={form.num_periodos}
          onChange={(e) => setForm({ ...form, num_periodos: Number(e.target.value) })}
        />
        {DIAS.map((dia) => (
          <label key={dia}>
            <input
              type="checkbox"
              checked={form.dias_entrenamiento.includes(dia)}
              onChange={() => toggleDia(dia)}
            />
            {t(DIA_KEYS[dia], lang)}
          </label>
        ))}
        <button type="submit">{t('crear', lang)}</button>
      </form>

      <table>
        <thead>
          <tr>
            <th>{t('nombre', lang)}</th>
            <th>{t('categoria', lang)}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {equipos.map((equipo) => (
            <tr key={equipo.id}>
              <td>{equipo.nombre}</td>
              <td>{equipo.categoria}</td>
              <td>
                <button onClick={() => setSelected(equipo.id)}>{t('editar', lang)}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected && <EquipoDetail equipoId={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
