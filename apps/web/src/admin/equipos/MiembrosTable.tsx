import { useState } from 'react'
import { useAdminApi } from '../api'
import { t } from '../i18n'

export interface Miembro {
  id: string
  persona: { nombre: string }
  grupo: string
  fecha_incorporacion: string
  fecha_baja: string | null
  orden: number
}

export function MiembrosTable({
  equipoId,
  miembros,
  onChange,
}: {
  equipoId: string
  miembros: Miembro[]
  onChange: () => void
}) {
  const api = useAdminApi()
  const [dragId, setDragId] = useState<string | null>(null)

  async function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return

    const ordered = [...miembros]
    const fromIndex = ordered.findIndex((m) => m.id === dragId)
    const toIndex = ordered.findIndex((m) => m.id === targetId)
    const [moved] = ordered.splice(fromIndex, 1)
    ordered.splice(toIndex, 0, moved)

    await Promise.all(
      ordered.map((miembro, index) =>
        api.patch(`/admin/equipos/${equipoId}/miembros/${miembro.id}`, { orden: index }),
      ),
    )
    setDragId(null)
    onChange()
  }

  async function handleBaja(miembroId: string) {
    const fecha = window.prompt(t('fechaBaja'))
    if (!fecha) return
    await api.patch(`/admin/equipos/${equipoId}/miembros/${miembroId}`, { fecha_baja: fecha })
    onChange()
  }

  return (
    <table>
      <thead>
        <tr>
          <th>{t('nombre')}</th>
          <th>{t('grupo')}</th>
          <th>{t('fechaIncorporacion')}</th>
          <th>{t('fechaBaja')}</th>
          <th>{t('orden')}</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {miembros.map((miembro) => (
          <tr
            key={miembro.id}
            draggable
            onDragStart={() => setDragId(miembro.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(miembro.id)}
          >
            <td>{miembro.persona.nombre}</td>
            <td>{miembro.grupo}</td>
            <td>{miembro.fecha_incorporacion}</td>
            <td>{miembro.fecha_baja ?? '—'}</td>
            <td>{miembro.orden}</td>
            <td>{!miembro.fecha_baja && <button onClick={() => handleBaja(miembro.id)}>{t('fechaBaja')}</button>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
