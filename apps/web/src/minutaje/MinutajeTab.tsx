import { useEffect, useState } from 'react'
import { useAsistenciaApi, ApiError } from '../asistencia/api'
import { t, Lang, PILLS_BAJA, PillBaja } from './i18n'
import { JornadaDetalle, JornadaResumen, DashboardMiembro, Participacion, duracionPartido, aplicarReglasParticipacion } from './model'
import { PanelEstadisticasJugador } from './PanelEstadisticasJugador'
import { DashboardMinutaje } from './DashboardMinutaje'
import styles from './MinutajeTab.module.css'
import { Spinner } from '../styles/Spinner'
import { EmptyState } from '../styles/EmptyState'

interface Equipo {
  id: string
  categoria: string
  minutos_por_periodo: number
  num_periodos: number
}

function resultadoJornada(golesFavor: number, golesContra: number): 'V' | 'E' | 'D' {
  if (golesFavor > golesContra) return 'V'
  if (golesFavor < golesContra) return 'D'
  return 'E'
}

const RESULTADO_COLOR: Record<'V' | 'E' | 'D', string> = {
  V: 'var(--color-success)',
  E: 'var(--color-neutral)',
  D: 'var(--color-danger)',
}

const PILL_COLOR: Record<'conv' | 'jug' | 'tit' | PillBaja, string> = {
  conv: 'var(--color-pill-conv)',
  jug: 'var(--color-pill-jug)',
  tit: 'var(--color-pill-tit)',
  LES: 'var(--color-pill-les)',
  SAN: 'var(--color-pill-san)',
  ENF: 'var(--color-pill-enf)',
  VAC: 'var(--color-pill-vac)',
  NJ: 'var(--color-pill-nj)',
}

function pillStyle(pressed: boolean, color: string) {
  return pressed ? { backgroundColor: color } : undefined
}

export function MinutajeTab({
  equipo,
  lang = 'eu',
  readOnly = false,
}: {
  equipo: Equipo
  lang?: Lang
  readOnly?: boolean
}) {
  const api = useAsistenciaApi()
  const duracion = duracionPartido(equipo)

  const [vista, setVista] = useState<'jornada' | 'dashboard'>('jornada')
  const [numero, setNumero] = useState(1)
  const [jornada, setJornada] = useState<JornadaDetalle | null>(null)
  const [historial, setHistorial] = useState<JornadaResumen[]>([])
  const [dashboard, setDashboard] = useState<DashboardMiembro[] | null>(null)
  const [error, setError] = useState<'forbidden' | 'other' | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function refreshHistorial() {
    try {
      const res: JornadaResumen[] = await api.get(`/equipos/${equipo.id}/jornadas`)
      setHistorial(res)
      setError(null)
    } catch (err) {
      setError(err instanceof ApiError && err.status === 403 ? 'forbidden' : 'other')
    }
  }

  async function loadJornada(n: number) {
    try {
      const res: JornadaDetalle = await api.get(`/equipos/${equipo.id}/jornadas/${n}`)
      setJornada(res)
      setNumero(n)
      setError(null)
    } catch (err) {
      setError(err instanceof ApiError && err.status === 403 ? 'forbidden' : 'other')
    }
  }

  useEffect(() => {
    refreshHistorial()
    loadJornada(numero)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipo.id])

  useEffect(() => {
    if (vista === 'dashboard' && !dashboard) {
      api.get(`/equipos/${equipo.id}/dashboard`).then(setDashboard)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista])

  if (error === 'forbidden') {
    return <p>{t('minutaje', lang)}</p>
  }
  if (!jornada) return <Spinner />

  function updateJornadaField<K extends keyof JornadaDetalle>(key: K, value: JornadaDetalle[K]) {
    setJornada((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  function updateParticipacion(miembroId: string, cambio: Partial<Participacion>) {
    setJornada((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        participaciones: prev.participaciones.map((p) => {
          if (p.miembro_equipo_id !== miembroId) return p
          const actualizado = { ...p, ...cambio }
          return aplicarReglasParticipacion(actualizado, duracion)
        }),
      }
    })
  }

  const jornadaActual = jornada

  function togglePillEstado(miembroId: string, campo: 'convocado' | 'jugado' | 'titular') {
    if (readOnly) return
    const p = jornadaActual.participaciones.find((x) => x.miembro_equipo_id === miembroId)
    if (!p) return
    updateParticipacion(miembroId, { [campo]: !p[campo] } as Partial<Participacion>)
  }

  function togglePillBaja(miembroId: string, baja: PillBaja) {
    if (readOnly) return
    const p = jornadaActual.participaciones.find((x) => x.miembro_equipo_id === miembroId)
    if (!p) return
    updateParticipacion(miembroId, { baja: p.baja === baja ? null : baja })
  }

  function setMinutos(miembroId: string, minutos: number) {
    updateParticipacion(miembroId, { minutos })
  }

  function setGoles(miembroId: string, goles: number) {
    updateParticipacion(miembroId, { goles })
  }

  async function handleGuardar() {
    try {
      await api.post(`/equipos/${equipo.id}/jornadas`, {
        numero: jornadaActual.numero,
        rival: jornadaActual.rival ?? undefined,
        fecha: jornadaActual.fecha ?? undefined,
        campo: jornadaActual.campo ?? 'local',
        goles_favor: jornadaActual.goles_favor,
        goles_contra: jornadaActual.goles_contra,
        participaciones: jornadaActual.participaciones.map((p) => ({
          miembro_equipo_id: p.miembro_equipo_id,
          convocado: p.convocado,
          jugado: p.jugado,
          titular: p.titular,
          baja: p.baja,
          minutos: p.minutos,
          goles: p.goles,
        })),
      })
      await refreshHistorial()
      await loadJornada(jornadaActual.numero)
    } catch {
      window.alert(t('guardarJornada', lang))
    }
  }

  const convocados = jornada.participaciones.filter((p) => p.convocado).length
  const jugados = jornada.participaciones.filter((p) => p.jugado).length

  const duracionLabel =
    equipo.num_periodos === 2
      ? `2×${equipo.minutos_por_periodo} min · ${t('duracionPartido', lang)}`
      : `3×${equipo.minutos_por_periodo} min (${duracion} min)`

  return (
    <div>
      <nav className={styles.tabs}>
        <button onClick={() => setVista('jornada')} disabled={vista === 'jornada'}>
          {t('jornadaTab', lang)}
        </button>
        <button onClick={() => setVista('dashboard')} disabled={vista === 'dashboard'}>
          {t('dashboardTab', lang)}
        </button>
      </nav>

      {vista === 'dashboard' && dashboard && (
        <DashboardMinutaje
          dashboard={dashboard}
          historial={historial}
          duracionLabel={duracionLabel}
          lang={lang}
        />
      )}

      {vista === 'jornada' && (
        <>
          <section>
            <label>
              {t('jornadaNumero', lang)}
              <input
                type="number"
                min={1}
                max={40}
                value={numero}
                onChange={(e) => loadJornada(Number(e.target.value))}
              />
            </label>
            <label>
              {t('rival', lang)}
              <input value={jornada.rival ?? ''} onChange={(e) => updateJornadaField('rival', e.target.value)} />
            </label>
            <label>
              {t('fecha', lang)}
              <input
                type="date"
                value={jornada.fecha ? jornada.fecha.slice(0, 10) : ''}
                onChange={(e) => updateJornadaField('fecha', e.target.value)}
              />
            </label>
            <label>
              {t('campo', lang)}
              <select value={jornada.campo ?? 'local'} onChange={(e) => updateJornadaField('campo', e.target.value as 'local' | 'visitante')}>
                <option value="local">{t('local', lang)}</option>
                <option value="visitante">{t('visitante', lang)}</option>
              </select>
            </label>
            <label>
              {t('golesFavor', lang)}
              <input
                type="number"
                min={0}
                value={jornada.goles_favor}
                onChange={(e) => updateJornadaField('goles_favor', Number(e.target.value))}
              />
            </label>
            <label>
              {t('golesContra', lang)}
              <input
                type="number"
                min={0}
                value={jornada.goles_contra}
                onChange={(e) => updateJornadaField('goles_contra', Number(e.target.value))}
              />
            </label>
            <span aria-label="duracion-partido">{duracionLabel}</span>
          </section>

          <p>
            {convocados} {t('convocadosContador', lang).split(' · ')[0]} · {jugados} {t('convocadosContador', lang).split(' · ')[1]}
          </p>

          <div className={styles.tableWrap}>
          <table className={styles.table}>
            <tbody>
              {jornada.participaciones.map((p, idx) => (
                <tr key={p.miembro_equipo_id}>
                  <td>{idx + 1}</td>
                  <td className={styles.nombreCell}>
                    <button onClick={() => setExpandedId(expandedId === p.miembro_equipo_id ? null : p.miembro_equipo_id)}>
                      {p.persona.nombre}
                    </button>
                    <button
                      aria-label="stats-jugador"
                      onClick={() => setExpandedId(expandedId === p.miembro_equipo_id ? null : p.miembro_equipo_id)}
                    >
                      📊
                    </button>
                  </td>
                  <td className={styles.pillsCell}>
                    <button
                      aria-pressed={p.convocado}
                      className={`${styles.pill} ${p.convocado ? styles.pillActive : ''}`}
                      style={pillStyle(p.convocado, PILL_COLOR.conv)}
                      onClick={() => togglePillEstado(p.miembro_equipo_id, 'convocado')}
                    >
                      {t('conv', lang)}
                    </button>
                    <button
                      aria-pressed={p.jugado}
                      className={`${styles.pill} ${p.jugado ? styles.pillActive : ''}`}
                      style={pillStyle(p.jugado, PILL_COLOR.jug)}
                      onClick={() => togglePillEstado(p.miembro_equipo_id, 'jugado')}
                    >
                      {t('jug', lang)}
                    </button>
                    <button
                      aria-pressed={p.titular}
                      className={`${styles.pill} ${p.titular ? styles.pillActive : ''}`}
                      style={pillStyle(p.titular, PILL_COLOR.tit)}
                      onClick={() => togglePillEstado(p.miembro_equipo_id, 'titular')}
                    >
                      {t('tit', lang)}
                    </button>
                    {PILLS_BAJA.map((baja) => (
                      <button
                        key={baja}
                        aria-pressed={p.baja === baja}
                        className={`${styles.pill} ${p.baja === baja ? styles.pillActive : ''}`}
                        style={pillStyle(p.baja === baja, PILL_COLOR[baja])}
                        onClick={() => togglePillBaja(p.miembro_equipo_id, baja)}
                      >
                        {t(baja.toLowerCase() as 'les' | 'san' | 'enf' | 'vac' | 'nj', lang)}
                      </button>
                    ))}
                  </td>
                  <td className={styles.minutosCell}>
                    <label>
                      {t('minutos', lang)}
                      <input
                        type="number"
                        min={0}
                        value={p.minutos}
                        onChange={(e) => setMinutos(p.miembro_equipo_id, Number(e.target.value))}
                      />
                    </label>
                    <button onClick={() => setMinutos(p.miembro_equipo_id, equipo.minutos_por_periodo)}>
                      {t('unPeriodo', lang)}
                    </button>
                    <button onClick={() => setMinutos(p.miembro_equipo_id, duracion)}>{t('partidoCompleto', lang)}</button>
                    {equipo.num_periodos === 3 && (
                      <button onClick={() => setMinutos(p.miembro_equipo_id, equipo.minutos_por_periodo * 3)}>
                        {t('tresPeriodos', lang)}
                      </button>
                    )}
                    <label>
                      {t('goles', lang)}
                      <input
                        type="number"
                        min={0}
                        value={p.goles}
                        onChange={(e) => setGoles(p.miembro_equipo_id, Number(e.target.value))}
                      />
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {jornada.participaciones.map(
            (p) =>
              expandedId === p.miembro_equipo_id && (
                <PanelEstadisticasJugador
                  key={p.miembro_equipo_id}
                  equipoId={equipo.id}
                  miembroEquipoId={p.miembro_equipo_id}
                  lang={lang}
                />
              ),
          )}

          {!readOnly && <button onClick={handleGuardar}>{t('guardarJornada', lang)}</button>}

          <section>
            <h3>
              {t('historial', lang)} · {historial.length} {t('registradas', lang)}
            </h3>
            {historial.length === 0 && <EmptyState text={t('sinJornadas', lang)} icon="📅" />}
            {historial.map((j) => {
              const resultado = resultadoJornada(j.goles_favor, j.goles_contra)
              return (
                <article key={j.id} className={styles.jornadaCard} onClick={() => loadJornada(j.numero)}>
                  <span className={styles.resultado} style={{ backgroundColor: RESULTADO_COLOR[resultado] }}>
                    {resultado}
                  </span>
                  <span>{j.rival}</span>
                  <span>{j.fecha ? j.fecha.slice(0, 10) : ''}</span>
                </article>
              )
            })}
          </section>
        </>
      )}
    </div>
  )
}
