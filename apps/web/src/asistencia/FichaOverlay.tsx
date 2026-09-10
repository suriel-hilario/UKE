import { useEffect, useRef, useState } from 'react'
import { useAsistenciaApi } from './api'
import { t, mesLabel, Lang } from './i18n'
import styles from './FichaOverlay.module.css'

function progressClass(pct: number): string {
  if (pct >= 80) return styles.progressSuccess
  if (pct >= 60) return styles.progressWarning
  return styles.progressDanger
}

interface Ficha {
  persona: { nombre: string; alias: string | null; foto_url: string | null }
  grupo: string
  fecha_incorporacion: string
  estadisticas: {
    porcentaje_total: number | '--'
    presencias: number
    faltas: number
    sesiones: number
  }
  desglose_mensual: { mes: string; sesiones: number; presencias: number; porcentaje: number | '--' }[]
}

export function FichaOverlay({
  equipoId,
  miembroId,
  lang,
  rolEntrenadorInicial,
  onClose,
  onChanged,
}: {
  equipoId: string
  miembroId: string
  lang: Lang
  rolEntrenadorInicial?: string | null
  onClose: () => void
  onChanged: () => void
}) {
  const api = useAsistenciaApi()
  const [ficha, setFicha] = useState<Ficha | null>(null)
  const [nombre, setNombre] = useState('')
  const [rolEntrenador, setRolEntrenador] = useState(rolEntrenadorInicial ?? '')
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

  async function handleGuardarRolEntrenador() {
    await api.patch(`/equipos/${equipoId}/miembros/${miembroId}`, { rol_entrenador: rolEntrenador })
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
    if (!window.confirm(t('eliminarJugadorConfirm', lang))) return
    await api.patch(`/equipos/${equipoId}/miembros/${miembroId}`, {
      fecha_baja: new Date().toISOString().slice(0, 10),
    })
    onChanged()
    onClose()
  }

  if (!ficha) return null

  return (
    <dialog open onClose={onClose}>
      <h3>{t('fichaJugador', lang)}</h3>

      {ficha.persona.foto_url ? (
        <img className={styles.avatar} src={ficha.persona.foto_url} alt="" width={64} height={64} />
      ) : (
        <span aria-hidden className={styles.avatarFallback}>
          {ficha.persona.nombre.slice(0, 2).toUpperCase()}
        </span>
      )}
      <button onClick={() => fileInputRef.current?.click()}>{t('subirFoto', lang)}</button>
      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleSubirFoto} />

      <label>
        {t('nombre', lang)}
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </label>
      <button onClick={handleGuardarNombre}>{t('guardar', lang)}</button>

      {ficha.grupo === 'entrenador' && (
        <>
          <label>
            {t('rolEntrenador', lang)}
            <input value={rolEntrenador} onChange={(e) => setRolEntrenador(e.target.value)} />
          </label>
          <button onClick={handleGuardarRolEntrenador}>{t('guardar', lang)}</button>
        </>
      )}

      <dl className={styles.statsGrid}>
        <dt>{t('totalPorc', lang)}</dt>
        <dd>{ficha.estadisticas.porcentaje_total}</dd>
        <dt>{t('presencias', lang)}</dt>
        <dd>{ficha.estadisticas.presencias}</dd>
        <dt>{t('faltas', lang)}</dt>
        <dd>{ficha.estadisticas.faltas}</dd>
        <dt>{t('sesiones', lang)}</dt>
        <dd>{ficha.estadisticas.sesiones}</dd>
      </dl>

      <table>
        <thead>
          <tr>
            <th>{t('sesiones', lang)}</th>
            <th>{t('presencias', lang)}</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
          {ficha.desglose_mensual.map((fila) => (
            <tr key={fila.mes}>
              <td>{mesLabel(fila.mes, lang)}</td>
              <td>{fila.presencias}</td>
              <td>
                {fila.porcentaje}
                {typeof fila.porcentaje === 'number' && (
                  <progress className={progressClass(fila.porcentaje)} value={fila.porcentaje} max={100} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={handleEliminarJugador}>{t('eliminarJugador', lang)}</button>
      <button onClick={onClose}>{t('cerrar', lang)}</button>
    </dialog>
  )
}
