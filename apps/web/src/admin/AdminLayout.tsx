import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { t } from './i18n'
import styles from './AdminLayout.module.css'

export function AdminLayout() {
  const { user } = useAuth()
  const esAdmin = user?.rol === 'admin'

  return (
    <div className={styles.layout}>
      <nav className={styles.nav}>
        {esAdmin && (
          <>
            <NavLink to="/admin/usuarios" className={({ isActive }) => (isActive ? styles.active : undefined)}>
              {t('usuarios')}
            </NavLink>
            <NavLink to="/admin/temporadas" className={({ isActive }) => (isActive ? styles.active : undefined)}>
              {t('temporadas')}
            </NavLink>
            <NavLink to="/admin/equipos" className={({ isActive }) => (isActive ? styles.active : undefined)}>
              {t('equipos')}
            </NavLink>
          </>
        )}
        <NavLink to="/admin/historico" className={({ isActive }) => (isActive ? styles.active : undefined)}>
          {t('historico')}
        </NavLink>
      </nav>
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  )
}
