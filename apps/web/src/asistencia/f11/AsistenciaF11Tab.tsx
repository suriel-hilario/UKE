import { Fragment, useEffect, useState } from 'react'
import { useAsistenciaApi, ApiError } from '../api'
import { mesLabel, Lang } from '../i18n'
import { t, estadoLabel, ESTADOS_F11, EstadoF11, umbralF11, UMBRAL_COLOR } from './i18n'
import { ContextMenuEstado } from './ContextMenuEstado'
import { FichaOverlayF11 } from './FichaOverlayF11'
import styles from './AsistenciaF11Tab.module.css'
import { ESTADO_F11_COLOR } from '../../styles/estadoF11Colors'
import { Spinner } from '../../styles/Spinner'

interface Sesion {
  id: string
  fecha: string
  numero: number | null
  tipo: string
  origen: string
}

interface Miembro {
  id: string
  grupo: string
  rol_entrenador: string | null
  orden: number
  persona: { nombre: string; alias: string | null; foto_url: string | null }
  registros: { sesion_id: string; estado: string | null; nota: string | null }[]
  contadores: Record<string, number>
  porcentaje_mes: number | null
  porcentaje_ano: number | null
}

interface AsistenciaResponse {
  sesiones: Sesion[]
  miembros: Miembro[]
}

const CONTADOR_COLS: EstadoF11[] = ['EM', 'RC', 'LS', 'EN', 'TR', 'EX', 'VA', 'OT', 'NJ']

const GRUPOS: { key: string; labelKey: 'conFicha' | 'sinFicha' | 'entrenadores' }[] = [
  { key: 'con_ficha', labelKey: 'conFicha' },
  { key: 'sin_ficha', labelKey: 'sinFicha' },
  { key: 'entrenador', labelKey: 'entrenadores' },
]

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
  for (let i = cantidad - 1; i >= 0; i--) meses.push(shiftMes(mesFinal, -i))
  return meses
}

function pctLabel(pct: number | null): string {
  return pct == null ? '--' : `${pct}%`
}

function PctPill({ pct }: { pct: number | null }) {
  const nivel = umbralF11(pct == null ? '--' : pct)
  return (
    <span className="pill" style={{ color: UMBRAL_COLOR[nivel] }}>
      {pctLabel(pct)}
    </span>
  )
}

export function AsistenciaF11Tab({
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
  const [error, setError] = useState<'forbidden' | 'other' | null>(null)
  const [menu, setMenu] = useState<{ x: number; y: number; sesion: Sesion; miembro: Miembro } | null>(null)
  const [fichaMiembroId, setFichaMiembroId] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)

  const meses = ultimosMeses(mesActualISO(), 9)

  async function refresh() {
    try {
      const res: AsistenciaResponse = await api.get(`/equipos/${equipoId}/asistencia?mes=${mes}`)
      setData(res)
      setError(null)
    } catch (err) {
      setError(err instanceof ApiError && err.status === 403 ? 'forbidden' : 'other')
    }
  }

  async function handleWriteAction(action: () => Promise<void>) {
    try {
      await action()
    } catch {
      window.alert(t('markarSaioa', lang))
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes, equipoId])

  if (error === 'forbidden') {
    return <p>{t('markarSaioa', lang)}</p>
  }
  if (!data) return <Spinner />

  async function marcarEstado(sesionId: string, miembroId: string, estado: EstadoF11) {
    await handleWriteAction(async () => {
      await api.patch(`/equipos/${equipoId}/asistencia`, {
        sesion_id: sesionId,
        miembro_equipo_id: miembroId,
        estado,
      })
      await refresh()
    })
  }

  async function marcarTodos(sesion: Sesion) {
    const sinMarcar = data!.miembros.filter(
      (m) => !m.registros.find((r) => r.sesion_id === sesion.id)?.estado,
    )
    await handleWriteAction(async () => {
      await Promise.all(
        sinMarcar.map((m) =>
          api.patch(`/equipos/${equipoId}/asistencia`, {
            sesion_id: sesion.id,
            miembro_equipo_id: m.id,
            estado: '1',
          }),
        ),
      )
      await refresh()
    })
  }

  async function handleDrop(grupo: string, targetId: string) {
    if (!dragId || dragId === targetId) return
    const miembrosGrupo = data!.miembros.filter((m) => m.grupo === grupo).sort((a, b) => a.orden - b.orden)
    const fromIndex = miembrosGrupo.findIndex((m) => m.id === dragId)
    const toIndex = miembrosGrupo.findIndex((m) => m.id === targetId)
    if (fromIndex === -1 || toIndex === -1) return
    const reordenados = [...miembrosGrupo]
    const [moved] = reordenados.splice(fromIndex, 1)
    reordenados.splice(toIndex, 0, moved)

    await handleWriteAction(async () => {
      await Promise.all(
        reordenados.map((m, index) =>
          api.patch(`/equipos/${equipoId}/miembros/${m.id}`, { orden: index }),
        ),
      )
      await refresh()
    })
    setDragId(null)
  }

  async function handleExportar() {
    await handleWriteAction(async () => {
      const { blob, filename } = await api.downloadFile(`/equipos/${equipoId}/asistencia/exportar`)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  const sesiones = data.sesiones
  const totalSesiones = sesiones.length
  const conFichaCount = data.miembros.filter((m) => m.grupo === 'con_ficha').length
  const sinFichaCount = data.miembros.filter((m) => m.grupo === 'sin_ficha').length
  const asistenciasTotal = data.miembros.reduce(
    (acc, m) => acc + m.registros.filter((r) => r.estado === '1' || r.estado === 'EM' || r.estado === 'RC').length,
    0,
  )
  const mediaGeneral = data.miembros.length
    ? Math.round(
        (data.miembros.reduce((acc, m) => acc + (m.porcentaje_mes ?? 0), 0) / data.miembros.length) * 10,
      ) / 10
    : 0
  const mediaFicha = conFichaCount
    ? Math.round(
        (data.miembros
          .filter((m) => m.grupo === 'con_ficha')
          .reduce((acc, m) => acc + (m.porcentaje_mes ?? 0), 0) /
          conFichaCount) *
          10,
      ) / 10
    : 0

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        {meses.map((m) => (
          <button key={m} onClick={() => setMes(m)} disabled={m === mes}>
            {mesLabel(m, lang)}
          </button>
        ))}
      </aside>

      <div>
        <h3>{mesLabel(mes, lang)}</h3>
        <button onClick={handleExportar}>{t('exportarCsv', lang)}</button>

        <dl className={styles.statsBar}>
          <dt>{t('sesiones', lang)}</dt>
          <dd>{totalSesiones}</dd>
          <dt>{t('totalTemporada', lang)}</dt>
          <dd>{totalSesiones}</dd>
          <dt>{t('conFicha', lang)}</dt>
          <dd>{conFichaCount}</dd>
          <dt>{t('sinFicha', lang)}</dt>
          <dd>{sinFichaCount}</dd>
          <dt>{t('asistencias', lang)}</dt>
          <dd>{asistenciasTotal}</dd>
          <dt>{t('mediaGeneral', lang)}</dt>
          <dd>{mediaGeneral}%</dd>
          <dt>{t('mediaFicha', lang)}</dt>
          <dd>{mediaFicha}%</dd>
        </dl>

        <details>
          <summary>{t('leyenda', lang)}</summary>
          <ul>
            <li>{t('sinMarcar', lang)}: ·</li>
            {ESTADOS_F11.map((estado) => (
              <li key={estado}>
                {estado}: {estadoLabel(estado, lang)}
              </li>
            ))}
          </ul>
        </details>

        <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t('porcAno', lang)}</th>
              <th>{t('porcMes', lang)}</th>
              <th>{t('jugador', lang)}</th>
              {sesiones.map((sesion) => (
                <th key={sesion.id} className={sesion.tipo === 'partido' ? styles.headerPartido : undefined}>
                  {sesion.tipo === 'partido' ? '⚽' : sesion.numero ?? ''} {diaNumero(sesion.fecha)}
                  <button onClick={() => marcarTodos(sesion)} aria-label="marcar-todos">
                    ✓
                  </button>
                </th>
              ))}
              <th>TOT</th>
              {CONTADOR_COLS.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GRUPOS.map(({ key, labelKey }) => {
              const miembrosGrupo = data.miembros.filter((m) => m.grupo === key).sort((a, b) => a.orden - b.orden)
              if (miembrosGrupo.length === 0) return null

              const totalGrupo = miembrosGrupo.reduce(
                (acc, m) => acc + m.registros.filter((r) => r.estado === '1' || r.estado === 'EM' || r.estado === 'RC').length,
                0,
              )
              const mediaGrupo = miembrosGrupo.length
                ? Math.round((miembrosGrupo.reduce((acc, m) => acc + (m.porcentaje_mes ?? 0), 0) / miembrosGrupo.length) * 10) / 10
                : 0

              return (
                <Fragment key={key}>
                  <tr key={`${key}-header`}>
                    <td colSpan={4 + sesiones.length + 1 + CONTADOR_COLS.length}>
                      <strong>
                        {t(labelKey, lang)} ({miembrosGrupo.length})
                      </strong>
                    </td>
                  </tr>
                  {miembrosGrupo.map((miembro) => (
                    <tr
                      key={miembro.id}
                      draggable
                      onDragStart={() => setDragId(miembro.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(key, miembro.id)}
                    >
                      <td>
                        <PctPill pct={miembro.porcentaje_ano} />
                      </td>
                      <td>
                        <PctPill pct={miembro.porcentaje_mes} />
                      </td>
                      <td>
                        {miembro.persona.foto_url ? (
                          <img src={miembro.persona.foto_url} alt="" width={24} height={24} />
                        ) : (
                          <span aria-hidden>{miembro.persona.nombre.slice(0, 2).toUpperCase()}</span>
                        )}
                        <button onClick={() => setFichaMiembroId(miembro.id)}>{miembro.persona.nombre}</button>
                      </td>
                      {sesiones.map((sesion) => {
                        const registro = miembro.registros.find((r) => r.sesion_id === sesion.id)
                        if (!registro) return <td key={sesion.id} />
                        const color = registro.estado
                          ? ESTADO_F11_COLOR[registro.estado as keyof typeof ESTADO_F11_COLOR]
                          : undefined
                        return (
                          <td
                            key={sesion.id}
                            className={styles.cell}
                            style={{ color }}
                            onClick={(e) =>
                              !readOnly && setMenu({ x: e.clientX, y: e.clientY, sesion, miembro })
                            }
                          >
                            {registro.estado ?? '·'}
                          </td>
                        )
                      })}
                      <td>{miembro.registros.filter((r) => r.estado === '1' || r.estado === 'EM' || r.estado === 'RC').length}</td>
                      {CONTADOR_COLS.map((c) => (
                        <td key={c}>{miembro.contadores[c] || ''}</td>
                      ))}
                    </tr>
                  ))}
                  <tr key={`${key}-total`}>
                    <td colSpan={3}>{t('total', lang)}</td>
                    <td colSpan={sesiones.length} />
                    <td>{totalGrupo}</td>
                  </tr>
                  <tr key={`${key}-media`}>
                    <td colSpan={3}>{t('media', lang)}</td>
                    <td colSpan={sesiones.length} />
                    <td>{mediaGrupo}%</td>
                  </tr>
                </Fragment>
              )
            })}
            <tr>
              <td colSpan={3}>
                <strong>{t('totalGeneral', lang)}</strong>
              </td>
              <td colSpan={sesiones.length} />
              <td>{asistenciasTotal}</td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>

      {menu && (
        <ContextMenuEstado
          x={menu.x}
          y={menu.y}
          actual={menu.miembro.registros.find((r) => r.sesion_id === menu.sesion.id)?.estado ?? null}
          lang={lang}
          onSelect={(estado) => {
            marcarEstado(menu.sesion.id, menu.miembro.id, estado)
            setMenu(null)
          }}
          onClose={() => setMenu(null)}
        />
      )}

      {fichaMiembroId && (
        <FichaOverlayF11
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
