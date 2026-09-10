import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useEquipo } from './EquipoContext'
import { PlantillaTab } from './PlantillaTab'
import { ReadOnlyBanner } from './ReadOnlyBanner'
import { t } from './i18n'
import { AsistenciaTab } from '../asistencia/AsistenciaTab'
import { AsistenciaF11Tab } from '../asistencia/f11/AsistenciaF11Tab'
import { t as tAsistencia } from '../asistencia/i18n'
import { AsistenciaEntrenadoresTab } from '../asistencia/entrenadores/AsistenciaEntrenadoresTab'
import { t as tEntrenadores } from '../asistencia/entrenadores/i18n'
import { MinutajeTab } from '../minutaje/MinutajeTab'
import { t as tMinutaje } from '../minutaje/i18n'

const CATEGORIAS_CON_ASISTENCIA = ['eskola', 'f7', 'f11']
const CATEGORIAS_CON_MINUTAJE = ['f7', 'f11']
const CATEGORIAS_CON_ENTRENADORES = ['f7']

export function EquipoDetailPage() {
  const equipo = useEquipo()
  const tieneAsistencia = CATEGORIAS_CON_ASISTENCIA.includes(equipo.categoria)
  const tieneMinutaje = CATEGORIAS_CON_MINUTAJE.includes(equipo.categoria)
  const tieneEntrenadores = CATEGORIAS_CON_ENTRENADORES.includes(equipo.categoria)
  const esF11 = equipo.categoria === 'f11'
  const soloLectura = equipo.temporada.estado === 'cerrada'
  const [tab, setTab] = useState<'plantilla' | 'asistencia' | 'minutaje' | 'entrenadores'>('plantilla')

  return (
    <div>
      <Link to="/">{t('volver')}</Link>
      {soloLectura && <ReadOnlyBanner />}
      <header>
        {equipo.icono && <span>{equipo.icono}</span>}
        <h2>{equipo.nombre}</h2>
        <span>{equipo.categoria}</span>
        {equipo.color && (
          <span
            aria-hidden
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: equipo.color,
            }}
          />
        )}
      </header>

      <nav>
        <button onClick={() => setTab('plantilla')} disabled={tab === 'plantilla'}>
          {t('plantilla')}
        </button>
        {tieneAsistencia && (
          <button onClick={() => setTab('asistencia')} disabled={tab === 'asistencia'}>
            {tAsistencia('asistencia')}
          </button>
        )}
        {tieneMinutaje && (
          <button onClick={() => setTab('minutaje')} disabled={tab === 'minutaje'}>
            {tMinutaje('minutaje')}
          </button>
        )}
        {tieneEntrenadores && (
          <button onClick={() => setTab('entrenadores')} disabled={tab === 'entrenadores'}>
            {tEntrenadores('entrenadores')}
          </button>
        )}
      </nav>

      {tab === 'plantilla' && <PlantillaTab />}
      {tab === 'asistencia' && tieneAsistencia && esF11 && (
        <AsistenciaF11Tab equipoId={equipo.id} readOnly={soloLectura} />
      )}
      {tab === 'asistencia' && tieneAsistencia && !esF11 && (
        <AsistenciaTab equipoId={equipo.id} readOnly={soloLectura} />
      )}
      {tab === 'minutaje' && tieneMinutaje && <MinutajeTab equipo={equipo} readOnly={soloLectura} />}
      {tab === 'entrenadores' && tieneEntrenadores && (
        <AsistenciaEntrenadoresTab equipoId={equipo.id} readOnly={soloLectura} />
      )}
    </div>
  )
}
