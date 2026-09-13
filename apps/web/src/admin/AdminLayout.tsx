import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { useAdminApi } from './api'
import { t, Lang } from './i18n'
import { LangContext } from './LangContext'
import styles from './AdminLayout.module.css'
import ukeLogo from '../assets/escudo-uke.png'

interface Me {
  idioma?: Lang
}

export function AdminLayout() {
  const { user } = useAuth()
  const api = useAdminApi()
  const esAdmin = user?.rol === 'admin'
  const [lang, setLang] = useState<Lang>('eu')

  useEffect(() => {
    api.get('/auth/me').then((data: Me) => {
      if (data.idioma) setLang(data.idioma)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleLangChange(next: Lang) {
    setLang(next)
    await api.patch('/auth/me/idioma', { idioma: next })
  }

  return (
    <LangContext.Provider value={lang}>
      <div className={styles.layout}>
        <nav className={styles.nav}>
          <img className={styles.navLogo} src={ukeLogo} alt="UKE" />
          <select
            className={styles.langSelect}
            value={lang}
            onChange={(e) => handleLangChange(e.target.value as Lang)}
          >
            <option value="eu">EU</option>
            <option value="es">ES</option>
          </select>
          {esAdmin && (
            <>
              <NavLink to="/admin/usuarios" className={({ isActive }) => (isActive ? styles.active : undefined)}>
                {t('usuarios', lang)}
              </NavLink>
              <NavLink to="/admin/temporadas" className={({ isActive }) => (isActive ? styles.active : undefined)}>
                {t('temporadas', lang)}
              </NavLink>
              <NavLink to="/admin/equipos" className={({ isActive }) => (isActive ? styles.active : undefined)}>
                {t('equipos', lang)}
              </NavLink>
            </>
          )}
          <NavLink to="/admin/historico" className={({ isActive }) => (isActive ? styles.active : undefined)}>
            {t('historico', lang)}
          </NavLink>
        </nav>
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </LangContext.Provider>
  )
}
