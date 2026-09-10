import { useEffect, useState } from 'react'
import { useAsistenciaApi } from '../asistencia/api'
import { t, Lang, umbralMinutaje, UMBRAL_COLOR } from './i18n'
import { DashboardMiembro } from './model'
import styles from './PanelEstadisticasJugador.module.css'
import { EmptyState } from '../styles/EmptyState'

function PctBar({ label, pct }: { label: string; pct: number | '--' }) {
  const nivel = umbralMinutaje(pct)
  const color = UMBRAL_COLOR[nivel]
  const width = pct === '--' ? 0 : Math.max(0, Math.min(100, pct))
  return (
    <div className={styles.bar}>
      <span>
        {label} <span style={{ color }}>{pct === '--' ? '--' : `${pct}%`}</span>
      </span>
      <div className={styles.barTrack}>
        <div className={styles.barFill} style={{ width: `${width}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

export function PanelEstadisticasJugador({
  equipoId,
  miembroEquipoId,
  lang = 'eu',
}: {
  equipoId: string
  miembroEquipoId: string
  lang?: Lang
}) {
  const api = useAsistenciaApi()
  const [datos, setDatos] = useState<DashboardMiembro | null>(null)

  useEffect(() => {
    api.get(`/equipos/${equipoId}/dashboard`).then((res: DashboardMiembro[]) => {
      setDatos(res.find((m) => m.miembro_equipo_id === miembroEquipoId) ?? null)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipoId, miembroEquipoId])

  if (!datos) return null

  if (datos.jornadasDesdeDebut === 0) {
    return <EmptyState text={t('sinJornadas', lang)} icon="📅" />
  }

  return (
    <div>
      <dl>
        <dt>{t('jornadas', lang)}</dt>
        <dd>{datos.jornadasDesdeDebut}</dd>
        <dt>{t('conv2', lang)}</dt>
        <dd>{datos.convocados}</dd>
        <dt>{t('jugados', lang)}</dt>
        <dd>{datos.jugados}</dd>
        <dt>{t('titular', lang)}</dt>
        <dd>{datos.titulares}</dd>
        <dt>{t('minutos', lang)}</dt>
        <dd>{datos.minutos}</dd>
        <dt>{t('goles', lang)}</dt>
        <dd>{datos.goles}</dd>
        {Object.entries(datos.bajas)
          .filter(([, count]) => count > 0)
          .map(([tipo, count]) => (
            <span key={tipo}>
              <dt>{tipo}</dt>
              <dd>{count}</dd>
            </span>
          ))}
      </dl>

      <PctBar label={t('porcTotal', lang)} pct={datos.porcentaje_total} />
      <PctBar label={t('porcConv', lang)} pct={datos.porcentaje_conv} />
      <PctBar label={t('porcDisp', lang)} pct={datos.porcentaje_disp} />

      {datos.alerta === 'intervenir' && (
        <span className={`${styles.alerta} ${styles.alertaIntervenir}`}>{t('alertaIntervenir', lang)}</span>
      )}
      {datos.alerta === 'vigilar' && (
        <span className={`${styles.alerta} ${styles.alertaVigilar}`}>{t('alertaVigilar', lang)}</span>
      )}
    </div>
  )
}
