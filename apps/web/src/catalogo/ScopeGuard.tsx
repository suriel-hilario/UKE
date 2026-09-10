import { PropsWithChildren, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useCatalogoApi, ApiError } from './api'
import { EquipoContext, EquipoDetalle } from './EquipoContext'
import { SinAcceso } from './SinAcceso'
import { t } from './i18n'
import { Spinner } from '../styles/Spinner'

export function ScopeGuard({ children }: PropsWithChildren) {
  const { id } = useParams<{ id: string }>()
  const api = useCatalogoApi()
  const [equipo, setEquipo] = useState<EquipoDetalle | null>(null)
  const [forbidden, setForbidden] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setForbidden(false)
    api
      .get(`/catalogo/equipos/${id}`)
      .then((data: EquipoDetalle) => setEquipo(data))
      .catch((error: ApiError) => {
        if (error.status === 403) {
          setForbidden(true)
        } else {
          throw error
        }
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading) return <Spinner label={t('cargando')} />
  if (forbidden) return <SinAcceso />
  if (!equipo) return null

  return <EquipoContext.Provider value={equipo}>{children}</EquipoContext.Provider>
}
