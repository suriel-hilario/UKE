import { useEffect, useState } from 'react'
import { useAdminApi } from '../api'
import { t } from '../i18n'
import { useLang } from '../LangContext'
import { UserFormModal, UserFormValues } from './UserFormModal'
import styles from './UsersPage.module.css'

interface Usuario {
  id: string
  nombre_visible: string
  email: string
  rol: string
  categoria_asignada: string | null
  equipo_ids: string[]
}

export function UsersPage() {
  const api = useAdminApi()
  const lang = useLang()
  const [users, setUsers] = useState<Usuario[]>([])
  const [modalUser, setModalUser] = useState<Usuario | 'new' | null>(null)

  async function refresh() {
    setUsers(await api.get('/admin/users'))
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSave(values: UserFormValues) {
    if (modalUser === 'new') {
      await api.post('/admin/users', values)
    } else if (modalUser) {
      await api.patch(`/admin/users/${modalUser.id}`, values)
    }
    setModalUser(null)
    await refresh()
  }

  async function handleResetPassword(user: Usuario) {
    await api.post(`/admin/users/${user.id}/reset-password`)
  }

  async function handleDisable(user: Usuario) {
    if (!window.confirm(`${t('deshabilitar', lang)}: ${user.email}?`)) return
    await api.del(`/admin/users/${user.id}`)
    await refresh()
  }

  return (
    <div>
      <h2>{t('usuarios', lang)}</h2>
      <button onClick={() => setModalUser('new')}>{t('crear', lang)}</button>
      <table>
        <thead>
          <tr>
            <th>{t('nombre', lang)}</th>
            <th>{t('email', lang)}</th>
            <th>{t('rol', lang)}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.nombre_visible}</td>
              <td>{user.email}</td>
              <td>{user.rol}</td>
              <td>
                <button onClick={() => setModalUser(user)}>{t('editar', lang)}</button>
                <button onClick={() => handleResetPassword(user)}>{t('resetPassword', lang)}</button>
                <button className={styles.dangerButton} onClick={() => handleDisable(user)}>
                  {t('deshabilitar', lang)}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modalUser && (
        <UserFormModal
          initial={
            modalUser === 'new' ? undefined : { ...modalUser, categoria_asignada: modalUser.categoria_asignada ?? undefined }
          }
          onSave={handleSave}
          onClose={() => setModalUser(null)}
        />
      )}
    </div>
  )
}
