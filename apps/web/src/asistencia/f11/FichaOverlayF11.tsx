import { useEffect, useRef, useState } from 'react'
import { useAsistenciaApi } from '../api'
import { t as tBase, mesLabel, Lang } from '../i18n'
import { t, estadoLabel, EstadoF11 } from './i18n'
import styles from '../FichaOverlay.module.css'

function progressClass(pct: number): string {
  if (pct >= 85) return styles.progressSuccess
  if (pct >= 60) return styles.progressWarning
  return styles.progressDanger
}

interface DetalleSesion {
  fecha: string
  estado: string | null
}

interface Ficha {
  persona: { nombre: string; alias: string | null; foto_url: string | null }
  grupo: string
  fecha_incorporacion: string
  estadisticas: { porcentaje_total: number | '--'; presencias: number; faltas: number; sesiones: number }
  contadores: Record<string, number>
  desglose_mensual: {
    mes: string
    sesiones: number
    presencias: number
    porcentaje: number | '--'
    detalle_sesiones: DetalleSesion[]
  }[]
}

export function FichaOverlayF11({
  equipoId,
  miembroId,
  lang,
  onClose,
  onChanged,
}: {
  equipoId: string
  miembroId: string
  lang: Lang
  onClose: () => void
  onChanged: () => void
}) {
  const api = useAsistenciaApi()
  const [ficha, setFicha] = useState<Ficha | null>(null)
  const [nombre, setNombre] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function refresh() {
    const data: Ficha = await api.get(`/miembros/${miembroId}/ficha?equipo_id=${equipoId}`)
    setFicha(data)
    setNombre(data.persona.nombre)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [miembroId])

  async function handleGuardarNombre() {
    await api.patch(`/equipos/${equipoId}/miembros/${miembroId}`, { nombre })
    await refresh()
    onChanged()
  }

  async function handleSubirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    await api.postForm(`/miembros/${miembroId}/foto`, formData, 'PATCH')
    await refresh()
    onChanged()
  }

  async function handleEliminarJugador() {
    if (!window.confirm(tBase('eliminarJugadorConfirm', lang))) return
    await api.patch(`/equipos/${equipoId}/miembros/${miembroId}`, {
      fecha_baja: new Date().toISOString().slice(0, 10),
    })
    onChanged()
    onClose()
  }

  if (!ficha) return null

  const contadoresPositivos = Object.entries(ficha.contadores).filter(([, count]) => count > 0)

  return (
    <dialog open onClose={onClose}>
      <h3>{tBase('fichaJugador', lang)}</h3>

      {ficha.persona.foto_url ? (
        <img className={styles.avatar} src={ficha.persona.foto_url} alt="" width={64} height={64} />
      ) : (
        <span aria-hidden className={styles.avatarFallback}>
          {ficha.persona.nombre.slice(0, 2).toUpperCase()}
        </span>
      )}
      <button onClick={() => fileInputRef.current?.click()}>{tBase('subirFoto', lang)}</button>
      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleSubirFoto} />

      <label>
        {tBase('nombre', lang)}
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </label>
      <button onClick={handleGuardarNombre}>{tBase('guardar', lang)}</button>

      <dl className={styles.statsGrid}>
        <dt>{tBase('totalPorc', lang)}</dt>
        <dd>{ficha.estadisticas.porcentaje_total}</dd>
        <dt>{tBase('presencias', lang)}</dt>
        <dd>{ficha.estadisticas.presencias}</dd>
        <dt>{tBase('faltas', lang)}</dt>
        <dd>{ficha.estadisticas.faltas}</dd>
        <dt>{tBase('sesiones', lang)}</dt>
        <dd>{ficha.estadisticas.sesiones}</dd>
      </dl>

      <h4>{t('resumenTemporada', lang)}</h4>
      <ul>
        {contadoresPositivos.map(([estado, count]) => (
          <li key={estado}>
            {estado} ({estadoLabel(estado as EstadoF11, lang)}): {count}
          </li>
        ))}
      </ul>

      <h4>{t('evolucionMensual', lang)}</h4>
      {ficha.desglose_mensual.map((fila) => (
        <div key={fila.mes}>
          <strong>{mesLabel(fila.mes, lang)}</strong>
          {typeof fila.porcentaje === 'number' && (
            <progress className={progressClass(fila.porcentaje)} value={fila.porcentaje} max={100} />
          )}
          <span>{fila.porcentaje}</span>
          <div>
            {fila.detalle_sesiones.map((sesion, i) => (
              <span key={i} title={sesion.fecha}>
                {sesion.estado ?? '·'}
              </span>
            ))}
          </div>
        </div>
      ))}

      <button onClick={handleEliminarJugador}>{tBase('eliminarJugador', lang)}</button>
      <button onClick={onClose}>{tBase('cerrar', lang)}</button>
    </dialog>
  )
}
