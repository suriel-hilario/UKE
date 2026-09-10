import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCatalogoApi } from '../catalogo/api'
import { t, Lang } from './i18n'
import { PanelDetailDrawer } from './PanelDetailDrawer'
import styles from './PanelPage.module.css'
import { EmptyState } from '../styles/EmptyState'

interface Temporada {
  id: string
  nombre: string
  estado: 'abierta' | 'cerrada'
}

export interface EquipoEstado {
  id: string
  nombre: string
  categoria: 'eskola' | 'f7' | 'f11'
  asistencia_pendiente: boolean | null
  minutaje_pendiente: boolean | null
  semaforo: 'verde' | 'rojo' | 'sin_datos'
  ultima_actualizacion_asistencia: string | null
  ultima_actualizacion_minutaje: string | null
}

const CATEGORIAS: EquipoEstado['categoria'][] = ['eskola', 'f7', 'f11']
const REFRESH_MS = 60000

function SemaforoIcono({ semaforo }: { semaforo: EquipoEstado['semaforo'] }) {
  if (semaforo === 'rojo')
    return (
      <span aria-label="rojo" className={`${styles.semaforo} ${styles.semaforoRojo}`}>
        🔴
      </span>
    )
  if (semaforo === 'verde')
    return (
      <span aria-label="verde" className={`${styles.semaforo} ${styles.semaforoVerde}`}>
        🟢
      </span>
    )
  return (
    <span aria-label="sin_datos" className={`${styles.semaforo} ${styles.semaforoSinDatos}`}>
      ⚪
    </span>
  )
}

function Chip({ pendiente, lang }: { pendiente: boolean | null; lang: Lang }) {
  if (pendiente === null) return <span className={styles.chip}>—</span>
  return <span className={styles.chip}>{pendiente ? `⚠️ ${t('pendiente', lang)}` : `✅ ${t('alDia', lang)}`}</span>
}

export function PanelPage({ lang = 'eu' }: { lang?: Lang }) {
  const api = useCatalogoApi()
  const [temporadas, setTemporadas] = useState<Temporada[]>([])
  const [temporadaId, setTemporadaId] = useState('')
  const [equipos, setEquipos] = useState<EquipoEstado[]>([])
  const [drawerEquipoId, setDrawerEquipoId] = useState<string | null>(null)

  useEffect(() => {
    api.get('/catalogo/temporadas').then((data: Temporada[]) => {
      setTemporadas(data)
      const abiertas = data.filter((temporada) => temporada.estado === 'abierta')
      if (abiertas.length === 1) setTemporadaId(abiertas[0].id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function refresh() {
    if (!temporadaId) return
    const data: EquipoEstado[] = await api.get(`/panel/estado?temporada_id=${temporadaId}`)
    setEquipos(data)
  }

  useEffect(() => {
    refresh()
    if (!temporadaId) return
    const interval = setInterval(refresh, REFRESH_MS)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temporadaId])

  const categoriasPresentes = CATEGORIAS.filter((cat) => equipos.some((e) => e.categoria === cat))

  return (
    <div>
      <Link to="/">{'←'}</Link>
      <h2>{t('panel', lang)}</h2>

      {temporadas.length > 0 && !temporadaId && (
        <select value={temporadaId} onChange={(e) => setTemporadaId(e.target.value)}>
          <option value="" disabled>
            {t('seleccionaTemporada', lang)}
          </option>
          {temporadas.map((temporada) => (
            <option key={temporada.id} value={temporada.id}>
              {temporada.nombre}
              {temporada.estado === 'cerrada' ? ` (${t('cerrada', lang)})` : ''}
            </option>
          ))}
        </select>
      )}

      {temporadaId && categoriasPresentes.length === 0 && <EmptyState text={t('sinEquipos', lang)} icon="🛡️" />}

      {categoriasPresentes.map((categoria) => (
        <section key={categoria} className={styles.section}>
          <h3>{t(categoria, lang)}</h3>
          <div className={styles.grid}>
            {equipos
              .filter((equipo) => equipo.categoria === categoria)
              .map((equipo) => (
                <button key={equipo.id} className={styles.card} onClick={() => setDrawerEquipoId(equipo.id)}>
                  <SemaforoIcono semaforo={equipo.semaforo} />
                  <strong>{equipo.nombre}</strong>
                  <span>{t(categoria, lang)}</span>
                  <div>
                    {t('asistencia', lang)}: <Chip pendiente={equipo.asistencia_pendiente} lang={lang} />
                  </div>
                  <div>
                    {t('minutaje', lang)}: <Chip pendiente={equipo.minutaje_pendiente} lang={lang} />
                  </div>
                  {equipo.ultima_actualizacion_asistencia && (
                    <div>
                      {t('ultimaActualizacion', lang)} ({t('asistencia', lang)}):{' '}
                      {new Date(equipo.ultima_actualizacion_asistencia).toLocaleString()}
                    </div>
                  )}
                  {equipo.ultima_actualizacion_minutaje && (
                    <div>
                      {t('ultimaActualizacion', lang)} ({t('minutaje', lang)}):{' '}
                      {new Date(equipo.ultima_actualizacion_minutaje).toLocaleString()}
                    </div>
                  )}
                </button>
              ))}
          </div>
        </section>
      ))}

      {drawerEquipoId && (
        <PanelDetailDrawer equipoId={drawerEquipoId} lang={lang} onClose={() => setDrawerEquipoId(null)} />
      )}
    </div>
  )
}
