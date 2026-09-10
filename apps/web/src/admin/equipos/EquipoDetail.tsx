import { useEffect, useState } from 'react'
import { useAdminApi } from '../api'
import { t } from '../i18n'
import { MiembrosTable, Miembro } from './MiembrosTable'
import { ImportJugadores } from './ImportJugadores'

export function EquipoDetail({ equipoId, onClose }: { equipoId: string; onClose: () => void }) {
  const api = useAdminApi()
  const [miembros, setMiembros] = useState<Miembro[]>([])

  async function refresh() {
    setMiembros(await api.get(`/admin/equipos/${equipoId}/miembros`))
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipoId])

  return (
    <div>
      <button onClick={onClose}>{t('cancelar')}</button>
      <MiembrosTable equipoId={equipoId} miembros={miembros} onChange={refresh} />
      <ImportJugadores equipoId={equipoId} onImported={refresh} />
    </div>
  )
}
