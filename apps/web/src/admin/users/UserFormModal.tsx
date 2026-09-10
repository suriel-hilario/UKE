import { useEffect, useRef, useState } from 'react'
import { useAdminApi } from '../api'
import { t } from '../i18n'

export interface UserFormValues {
  email: string
  nombre_visible: string
  rol: string
  categoria_asignada?: string
  equipo_ids?: string[]
}

interface Equipo {
  id: string
  nombre: string
}

interface Props {
  initial?: Partial<UserFormValues> & { id?: string }
  onSave: (values: UserFormValues) => Promise<void>
  onClose: () => void
}

const ROLES = ['admin', 'director', 'coordinador', 'entrenador']

export function UserFormModal({ initial, onSave, onClose }: Props) {
  const api = useAdminApi()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [values, setValues] = useState<UserFormValues>({
    email: initial?.email ?? '',
    nombre_visible: initial?.nombre_visible ?? '',
    rol: initial?.rol ?? 'entrenador',
    categoria_asignada: initial?.categoria_asignada,
    equipo_ids: initial?.equipo_ids ?? [],
  })

  useEffect(() => {
    dialogRef.current?.showModal()
    api.get('/admin/equipos').then(setEquipos)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await onSave(values)
  }

  return (
    <dialog ref={dialogRef} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <label>
          {t('email')}
          <input
            type="email"
            required
            value={values.email}
            onChange={(e) => setValues({ ...values, email: e.target.value })}
          />
        </label>
        <label>
          {t('nombre')}
          <input
            required
            value={values.nombre_visible}
            onChange={(e) => setValues({ ...values, nombre_visible: e.target.value })}
          />
        </label>
        <label>
          {t('rol')}
          <select value={values.rol} onChange={(e) => setValues({ ...values, rol: e.target.value })}>
            {ROLES.map((rol) => (
              <option key={rol} value={rol}>
                {rol}
              </option>
            ))}
          </select>
        </label>
        {values.rol === 'entrenador' && (
          <fieldset>
            <legend>{t('equipos')}</legend>
            {equipos.map((equipo) => (
              <label key={equipo.id}>
                <input
                  type="checkbox"
                  checked={values.equipo_ids?.includes(equipo.id) ?? false}
                  onChange={(e) => {
                    const current = values.equipo_ids ?? []
                    setValues({
                      ...values,
                      equipo_ids: e.target.checked
                        ? [...current, equipo.id]
                        : current.filter((id) => id !== equipo.id),
                    })
                  }}
                />
                {equipo.nombre}
              </label>
            ))}
          </fieldset>
        )}
        <button type="submit">{t('guardar')}</button>
        <button type="button" onClick={() => dialogRef.current?.close()}>
          {t('cancelar')}
        </button>
      </form>
    </dialog>
  )
}
