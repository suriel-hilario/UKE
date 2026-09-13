import { useEffect, useState } from 'react'
import { useAsistenciaApi, ApiError } from '../api'
import { mesLabel, diaSemanaLabel, Lang } from '../i18n'
import { t, umbralEskolaF7, UMBRAL_COLOR } from './i18n'
import { FichaOverlay } from '../FichaOverlay'
import styles from '../AsistenciaTab.module.css'

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

function Porcentaje({ valor }: { valor: number | null }) {
  const nivel = umbralEskolaF7(valor)
  return (
    <span className="pill" style={{ color: UMBRAL_COLOR[nivel] }}>
      {valor != null ? `${valor}%` : '--'}
    </span>
  )
}

export function AsistenciaEntrenadoresTab({
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
  const [fichaMiembroId, setFichaMiembroId] = useState<string | null>(null)
  const [error, setError] = useState<'forbidden' | 'other' | null>(null)

  const meses = ultimosMeses(mesActualISO(), 9)

  async function refresh() {
    try {
      const res: AsistenciaResponse = await api.get(`/equipos/${equipoId}/asistencia/entrenadores?mes=${mes}`)
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
      await api.patch(`/equipos/${equipoId}/asistencia/entrenadores`, {
        sesion_id: sesion.id,
        miembro_equipo_id: miembro.id,
        estado: nuevo,
      })
      await refresh()
    })
  }

  async function handleQuitarSesion(sesionId: string) {
    if (!window.confirm(t('quitarDiaConfirm', lang))) return
    await handleWriteAction(async () => {
      await api.patch(`/equipos/${equipoId}/asistencia/entrenadores/sesiones/${sesionId}`, { eliminada: true })
      await refresh()
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
        {!readOnly && (
          <div className={styles.toolbar}>
            <button onClick={() => setEditMode((v) => !v)}>{editMode ? t('guardar', lang) : t('editar', lang)}</button>
          </div>
        )}

        <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t('entrenador', lang)}</th>
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
                const pct = activos.length === 0 ? null : Math.round((presentes / activos.length) * 1000) / 10
                return (
                  <td key={sesion.id}>
                    <Porcentaje valor={pct} />
                  </td>
                )
              })}
              <td>
                <Porcentaje valor={porcentajesMes[mes] ?? null} />
              </td>
            </tr>

            {data.miembros.map((miembro) => {
              const presentes = miembro.registros.filter((r) => r.estado === 'P').length
              const pctEntrenador =
                miembro.registros.length === 0 ? null : Math.round((presentes / miembro.registros.length) * 1000) / 10
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
                      >
                        {registro.estado === 'P' ? '✓' : registro.estado === 'A' ? '✗' : '·'}
                      </td>
                    )
                  })}
                  <td>
                    <Porcentaje valor={pctEntrenador} />
                  </td>
                </tr>
              )
            })}

            <tr>
              <td>{t('total', lang)}</td>
              <td colSpan={data.sesiones.length} />
              <td>
                <Porcentaje valor={porcentajesMes[mes] ?? null} />
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>

      {fichaMiembroId && (
        <FichaOverlay
          equipoId={equipoId}
          miembroId={fichaMiembroId}
          lang={lang}
          rolEntrenadorInicial={data.miembros.find((m) => m.id === fichaMiembroId)?.rol_entrenador}
          onClose={() => setFichaMiembroId(null)}
          onChanged={refresh}
        />
      )}
    </div>
  )
}
