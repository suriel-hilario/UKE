import { useEffect, useState } from 'react'
import { useAsistenciaApi, ApiError } from './api'
import { t, mesLabel, diaSemanaLabel, Lang } from './i18n'
import { NotaOverlay } from './NotaOverlay'
import { AddJugadorModal } from './AddJugadorModal'
import { FichaOverlay } from './FichaOverlay'
import styles from './AsistenciaTab.module.css'
import { pctPillClass } from '../styles/thresholds'

interface Sesion {
  id: string
  fecha: string
  numero: number | null
  tipo: string
  origen: string
}

interface Registro {
  sesion_id: string
  estado: 'P' | 'A' | null
  nota: string | null
}

interface Miembro {
  id: string
  grupo: string
  rol_entrenador: string | null
  orden: number
  persona: { nombre: string; alias: string | null; foto_url: string | null }
  registros: Registro[]
}

interface AsistenciaResponse {
  sesiones: Sesion[]
  miembros: Miembro[]
}

function fechaCorta(fechaISO: string): string {
  return fechaISO.slice(0, 10)
}

function diaNumero(fechaISO: string): number {
  return Number(fechaISO.slice(8, 10))
}

function mesActualISO(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

function shiftMes(mes: string, delta: number): string {
  const [y, m] = mes.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

function ultimosMeses(mesFinal: string, cantidad: number): string[] {
  const meses: string[] = []
  for (let i = cantidad - 1; i >= 0; i--) {
    meses.push(shiftMes(mesFinal, -i))
  }
  return meses
}

function nextCiclo(estado: 'P' | 'A' | null): 'P' | 'A' | null {
  if (estado === null) return 'P'
  if (estado === 'P') return 'A'
  return null
}

export function AsistenciaTab({
  equipoId,
  lang = 'eu',
  readOnly = false,
}: {
  equipoId: string
  lang?: Lang
  readOnly?: boolean
}) {
  const api = useAsistenciaApi()
  const [mes, setMes] = useState(mesActualISO())
  const [data, setData] = useState<AsistenciaResponse | null>(null)
  const [porcentajesMes, setPorcentajesMes] = useState<Record<string, number | null>>({})
  const [editMode, setEditMode] = useState(false)
  const [notaCelda, setNotaCelda] = useState<{ sesion: Sesion; miembro: Miembro } | null>(null)
  const [addingJugador, setAddingJugador] = useState(false)
  const [fichaMiembroId, setFichaMiembroId] = useState<string | null>(null)
  const [error, setError] = useState<'forbidden' | 'other' | null>(null)

  const meses = ultimosMeses(mesActualISO(), 9)

  async function refresh() {
    try {
      const res: AsistenciaResponse = await api.get(`/equipos/${equipoId}/asistencia?mes=${mes}`)
      setData(res)
      setPorcentajesMes((prev) => ({ ...prev, [mes]: calcularTotalEquipo(res) }))
      setError(null)
    } catch (err) {
      setError(err instanceof ApiError && err.status === 403 ? 'forbidden' : 'other')
    }
  }

  async function handleWriteAction(action: () => Promise<void>) {
    try {
      await action()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        window.alert(t('temporadaCerrada', lang))
      } else {
        window.alert(t('errorGenerico', lang))
      }
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes, equipoId])

  function calcularTotalEquipo(res: AsistenciaResponse): number | null {
    let presentes = 0
    let total = 0
    for (const miembro of res.miembros) {
      for (const registro of miembro.registros) {
        total += 1
        if (registro.estado === 'P') presentes += 1
      }
    }
    return total === 0 ? null : Math.round((presentes / total) * 1000) / 10
  }

  async function handleCellClick(sesion: Sesion, miembro: Miembro, actual: 'P' | 'A' | null) {
    if (readOnly) return
    const nuevo = nextCiclo(actual)
    await handleWriteAction(async () => {
      await api.patch(`/equipos/${equipoId}/asistencia`, {
        sesion_id: sesion.id,
        miembro_equipo_id: miembro.id,
        estado: nuevo,
      })
      await refresh()
    })
  }

  function handleCellContextMenu(e: React.MouseEvent, sesion: Sesion, miembro: Miembro) {
    e.preventDefault()
    setNotaCelda({ sesion, miembro })
  }

  async function handleSaveNota(nota: string) {
    if (!notaCelda) return
    const registro = notaCelda.miembro.registros.find((r) => r.sesion_id === notaCelda.sesion.id)
    await handleWriteAction(async () => {
      await api.patch(`/equipos/${equipoId}/asistencia`, {
        sesion_id: notaCelda.sesion.id,
        miembro_equipo_id: notaCelda.miembro.id,
        estado: registro?.estado ?? null,
        nota,
      })
      setNotaCelda(null)
      await refresh()
    })
  }

  async function handleDeleteNota() {
    if (!notaCelda) return
    const registro = notaCelda.miembro.registros.find((r) => r.sesion_id === notaCelda.sesion.id)
    await handleWriteAction(async () => {
      await api.patch(`/equipos/${equipoId}/asistencia`, {
        sesion_id: notaCelda.sesion.id,
        miembro_equipo_id: notaCelda.miembro.id,
        estado: registro?.estado ?? null,
        nota: '',
      })
      setNotaCelda(null)
      await refresh()
    })
  }

  async function handleQuitarSesion(sesionId: string) {
    if (!window.confirm(t('quitarDiaConfirm', lang))) return
    await handleWriteAction(async () => {
      await api.patch(`/equipos/${equipoId}/sesiones/${sesionId}`, { eliminada: true })
      await refresh()
    })
  }

  async function handleEliminarJugador(miembroId: string) {
    if (!window.confirm(t('eliminarJugadorConfirm', lang))) return
    await handleWriteAction(async () => {
      await api.patch(`/equipos/${equipoId}/miembros/${miembroId}`, {
        fecha_baja: new Date().toISOString().slice(0, 10),
      })
      await refresh()
    })
  }

  async function handleAddJugador(nombre: string) {
    await handleWriteAction(async () => {
      await api.post(`/equipos/${equipoId}/miembros`, { nombre })
      setAddingJugador(false)
      await refresh()
    })
  }

  async function handleExportar() {
    await handleWriteAction(async () => {
      const { blob, filename } = await api.downloadFile(`/equipos/${equipoId}/asistencia/exportar?mes=${mes}`)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  if (error === 'forbidden') {
    return (
      <div>
        <h3>{t('sinAcceso', lang)}</h3>
        <p>{t('sinAccesoAsistenciaMensaje', lang)}</p>
      </div>
    )
  }
  if (error === 'other') {
    return <p>{t('errorGenerico', lang)}</p>
  }
  if (!data) return <p>{t('sinDatos', lang)}</p>

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        {meses.map((m) => (
          <button key={m} onClick={() => setMes(m)} disabled={m === mes}>
            {mesLabel(m, lang)} {porcentajesMes[m] != null ? `${porcentajesMes[m]}%` : ''}
          </button>
        ))}
      </aside>

      <div>
        <h3>{mesLabel(mes, lang)}</h3>
        <div className={styles.toolbar}>
          {!readOnly && <button onClick={() => setAddingJugador(true)}>{t('anadirJugador', lang)}</button>}
          <button onClick={() => setEditMode((v) => !v)}>{editMode ? t('guardar', lang) : t('editar', lang)}</button>
          <button onClick={handleExportar}>{t('exportarCsv', lang)}</button>
        </div>

        <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t('jugador', lang)}</th>
              {data.sesiones.map((sesion) => (
                <th key={sesion.id}>
                  {diaSemanaLabel(fechaCorta(sesion.fecha), lang)} {diaNumero(sesion.fecha)}
                  {editMode && (
                    <button onClick={() => handleQuitarSesion(sesion.id)} aria-label="quitar-dia">
                      ✕
                    </button>
                  )}
                </th>
              ))}
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{t('sesionPorc', lang)}</td>
              {data.sesiones.map((sesion) => {
                const activos = data.miembros.filter((m) => m.registros.some((r) => r.sesion_id === sesion.id))
                const presentes = activos.filter((m) =>
                  m.registros.some((r) => r.sesion_id === sesion.id && r.estado === 'P'),
                ).length
                const pctValue = activos.length === 0 ? null : Math.round((presentes / activos.length) * 1000) / 10
                const pct = pctValue == null ? '--' : `${pctValue}%`
                return <td key={sesion.id}>{pct}</td>
              })}
              <td>
                <span className={pctPillClass(porcentajesMes[mes] ?? null, 80, 60)}>
                  {porcentajesMes[mes] != null ? `${porcentajesMes[mes]}%` : '--'}
                </span>
              </td>
            </tr>

            {data.miembros.map((miembro) => {
              const presentes = miembro.registros.filter((r) => r.estado === 'P').length
              const pctJugadorValue =
                miembro.registros.length === 0 ? null : Math.round((presentes / miembro.registros.length) * 1000) / 10
              const pctJugador = pctJugadorValue == null ? '--' : `${pctJugadorValue}%`
              return (
                <tr key={miembro.id}>
                  <td className={styles.playerCell}>
                    <span className={styles.playerAvatar}>
                      {miembro.persona.foto_url ? (
                        <img src={miembro.persona.foto_url} alt="" width={24} height={24} />
                      ) : (
                        <span aria-hidden>
                          {miembro.persona.nombre
                            .split(' ')
                            .slice(0, 2)
                            .map((p) => p[0]?.toUpperCase())
                            .join('')}
                        </span>
                      )}
                    </span>
                    <button className={styles.playerName} onClick={() => setFichaMiembroId(miembro.id)}>
                      {miembro.persona.nombre}
                    </button>
                    {editMode && (
                      <button onClick={() => handleEliminarJugador(miembro.id)} aria-label="eliminar-jugador">
                        ✕
                      </button>
                    )}
                  </td>
                  {data.sesiones.map((sesion) => {
                    const registro = miembro.registros.find((r) => r.sesion_id === sesion.id)
                    if (!registro) return <td key={sesion.id} />
                    const cellClass =
                      registro.estado === 'P' ? 'cell-p' : registro.estado === 'A' ? 'cell-a' : 'cell-empty'
                    return (
                      <td
                        key={sesion.id}
                        className={`${styles.cell} ${cellClass}`}
                        onClick={() => handleCellClick(sesion, miembro, registro.estado)}
                        onContextMenu={(e) => handleCellContextMenu(e, sesion, miembro)}
                      >
                        {registro.estado === 'P' ? '✓' : registro.estado === 'A' ? '✗' : '·'}
                        {registro.nota && <span aria-label="tiene-nota">•</span>}
                      </td>
                    )
                  })}
                  <td>
                    <span className={pctPillClass(pctJugadorValue, 80, 60)}>{pctJugador}</span>
                  </td>
                </tr>
              )
            })}

            <tr>
              <td>{t('total', lang)}</td>
              <td colSpan={data.sesiones.length} />
              <td>
                <span className={pctPillClass(porcentajesMes[mes] ?? null, 80, 60)}>
                  {porcentajesMes[mes] != null ? `${porcentajesMes[mes]}%` : '--'}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>

      {notaCelda && (
        <NotaOverlay
          jugadorNombre={notaCelda.miembro.persona.nombre}
          fecha={fechaCorta(notaCelda.sesion.fecha)}
          notaInicial={notaCelda.miembro.registros.find((r) => r.sesion_id === notaCelda.sesion.id)?.nota ?? ''}
          onSave={handleSaveNota}
          onDelete={handleDeleteNota}
          onClose={() => setNotaCelda(null)}
        />
      )}

      {addingJugador && <AddJugadorModal onAdd={handleAddJugador} onClose={() => setAddingJugador(false)} />}

      {fichaMiembroId && (
        <FichaOverlay
          equipoId={equipoId}
          miembroId={fichaMiembroId}
          lang={lang}
          onClose={() => setFichaMiembroId(null)}
          onChanged={refresh}
        />
      )}
    </div>
  )
}
