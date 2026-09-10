import { useState } from 'react'
import { t, Lang, umbralMinutaje, UMBRAL_COLOR } from './i18n'
import { DashboardMiembro, JornadaResumen } from './model'
import { EmptyState } from '../styles/EmptyState'

function resultadoJornada(golesFavor: number, golesContra: number): 'V' | 'E' | 'D' {
  if (golesFavor > golesContra) return 'V'
  if (golesFavor < golesContra) return 'D'
  return 'E'
}

function PctCell({ pct }: { pct: number | '--' }) {
  const nivel = umbralMinutaje(pct)
  return <span style={{ color: UMBRAL_COLOR[nivel] }}>{pct === '--' ? '--' : `${pct}%`}</span>
}

export function DashboardMinutaje({
  dashboard,
  historial,
  duracionLabel,
  lang = 'eu',
}: {
  dashboard: DashboardMiembro[]
  historial: JornadaResumen[]
  duracionLabel: string
  lang?: Lang
}) {
  const [detalleIndex, setDetalleIndex] = useState(0)
  const [vistaDetalle, setVistaDetalle] = useState<'tabla' | 'fichas'>('tabla')

  const alertas = dashboard.filter((m) => m.alerta !== null)
  const jornadaDetalle = historial[detalleIndex]

  return (
    <div>
      <h3>{t('kpiEquipo', lang)}</h3>
      <dl>
        <dt>{t('jornadas', lang)}</dt>
        <dd>{historial.length}</dd>
      </dl>

      <h3>
        {t('controlParticipacion', lang)} — <span aria-label="duracion-partido">{duracionLabel}</span>
      </h3>
      <p>{t('leyendaExplicacion', lang)}</p>

      <section>
        <h4>{t('panelAlertas', lang)}</h4>
        {alertas.length === 0 && <p>—</p>}
        <ul>
          {alertas.map((m) => (
            <li key={m.miembro_equipo_id}>
              {m.persona.nombre} — {m.alerta === 'intervenir' ? t('alertaIntervenir', lang) : t('alertaVigilar', lang)}
            </li>
          ))}
        </ul>
      </section>

      <table>
        <thead>
          <tr>
            <th>{t('jugador', lang)}</th>
            <th>{t('porcTotal', lang)}</th>
            <th>{t('porcConv', lang)}</th>
            <th>{t('porcDisp', lang)}</th>
          </tr>
        </thead>
        <tbody>
          {dashboard.map((m) => (
            <tr key={m.miembro_equipo_id}>
              <td>{m.persona.nombre}</td>
              <td>
                <PctCell pct={m.porcentaje_total} />
              </td>
              <td>
                <PctCell pct={m.porcentaje_conv} />
              </td>
              <td>
                <PctCell pct={m.porcentaje_disp} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <section>
        <h4>{t('detallePorJornada', lang)}</h4>
        {historial.length === 0 ? (
          <EmptyState text={t('sinJornadas', lang)} icon="📅" />
        ) : (
          <>
            <button onClick={() => setDetalleIndex((i) => Math.min(i + 1, historial.length - 1))} aria-label="jornada-anterior">
              ‹
            </button>
            <span>{jornadaDetalle?.numero}</span>
            <button onClick={() => setDetalleIndex((i) => Math.max(i - 1, 0))} aria-label="jornada-siguiente">
              ›
            </button>

            {jornadaDetalle && (
              <div>
                <span>{jornadaDetalle.rival}</span>
                <span>
                  {resultadoJornada(jornadaDetalle.goles_favor, jornadaDetalle.goles_contra)} {jornadaDetalle.goles_favor}-
                  {jornadaDetalle.goles_contra}
                </span>
                <button onClick={() => setVistaDetalle('tabla')} disabled={vistaDetalle === 'tabla'}>
                  {t('tablaToggle', lang)}
                </button>
                <button onClick={() => setVistaDetalle('fichas')} disabled={vistaDetalle === 'fichas'}>
                  {t('fichasToggle', lang)}
                </button>
                <ul>
                  {jornadaDetalle.participaciones.map((p) => (
                    <li key={p.miembro_equipo_id}>
                      {p.convocado ? '✓' : '·'} {p.jugado ? 'J' : ''} {p.titular ? 'T' : ''} {p.baja ?? ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
