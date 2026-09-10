import { useEffect, useState } from 'react'
import { useCatalogoApi } from '../catalogo/api'
import { t, Lang } from './i18n'

interface SesionPendiente {
  fecha: string
  tipo: string
}

interface JornadaPendiente {
  numero: number
  fecha: string | null
  rival: string | null
}

interface EquipoEstadoDetalle {
  sesiones_pendientes: SesionPendiente[]
  jornadas_pendientes: JornadaPendiente[]
}

export function PanelDetailDrawer({
  equipoId,
  lang,
  onClose,
}: {
  equipoId: string
  lang: Lang
  onClose: () => void
}) {
  const api = useCatalogoApi()
  const [detalle, setDetalle] = useState<EquipoEstadoDetalle | null>(null)

  useEffect(() => {
    api.get(`/panel/estado/${equipoId}`).then(setDetalle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipoId])

  if (!detalle) return null

  const sinPendientes = detalle.sesiones_pendientes.length === 0 && detalle.jornadas_pendientes.length === 0

  return (
    <dialog open onClose={onClose}>
      {sinPendientes ? (
        <p>{t('todoAlDia', lang)}</p>
      ) : (
        <>
          {detalle.sesiones_pendientes.length > 0 && (
            <section>
              <h4>{t('sesionesPendientes', lang)}</h4>
              <ul>
                {detalle.sesiones_pendientes.map((sesion, i) => (
                  <li key={i}>
                    {new Date(sesion.fecha).toLocaleDateString()} — {sesion.tipo}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {detalle.jornadas_pendientes.length > 0 && (
            <section>
              <h4>{t('jornadasPendientes', lang)}</h4>
              <ul>
                {detalle.jornadas_pendientes.map((jornada) => (
                  <li key={jornada.numero}>
                    #{jornada.numero} {jornada.fecha ? new Date(jornada.fecha).toLocaleDateString() : ''}{' '}
                    {jornada.rival ?? ''}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
      <button onClick={onClose}>{t('cerrar', lang)}</button>
    </dialog>
  )
}
