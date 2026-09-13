import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminApi } from '../api'
import { t } from '../i18n'
import { useLang } from '../LangContext'

interface TemporadaHistorico {
  id: string
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  estado: 'cerrada'
  total_equipos: number
  total_sesiones: number
  total_jornadas: number
}

export function HistoricoPage() {
  const api = useAdminApi()
  const navigate = useNavigate()
  const lang = useLang()
  const [temporadas, setTemporadas] = useState<TemporadaHistorico[]>([])

  useEffect(() => {
    api.get('/admin/historico').then(setTemporadas)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      <h2>{t('historico', lang)}</h2>
      <ul>
        {temporadas.map((temporada) => (
          <li key={temporada.id}>
            <button onClick={() => navigate(`/?temporada_id=${temporada.id}`)}>
              {temporada.nombre} ({temporada.fecha_inicio} — {temporada.fecha_fin})
            </button>
            <span>
              {' '}
              {temporada.total_equipos} equipos · {temporada.total_sesiones} sesiones · {temporada.total_jornadas}{' '}
              jornadas
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
