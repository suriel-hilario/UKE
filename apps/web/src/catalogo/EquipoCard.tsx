import { useNavigate } from 'react-router-dom'
import { t, Lang } from './i18n'
import styles from './EquipoCard.module.css'

export interface EquipoResumen {
  id: string
  nombre: string
  categoria: string
  color?: string | null
  icono?: string | null
  num_miembros_activos: number
}

export function EquipoCard({ equipo, lang }: { equipo: EquipoResumen; lang: Lang }) {
  const navigate = useNavigate()

  return (
    <div className={styles.card} onClick={() => navigate(`/equipos/${equipo.id}`)}>
      {equipo.color && <span aria-hidden className={styles.dot} style={{ backgroundColor: equipo.color }} />}
      {equipo.icono && <span aria-hidden>{equipo.icono}</span>}
      <strong className={styles.nombre}>{equipo.nombre}</strong>
      <span className={styles.categoria}>{equipo.categoria}</span>
      <span className={styles.miembros}>
        {equipo.num_miembros_activos} {t('miembrosActivos', lang)}
      </span>
    </div>
  )
}
