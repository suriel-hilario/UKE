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
  const [menuOpen, setMenuOpen] = useState(false)

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

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <LangContext.Provider value={lang}>
      <div className={styles.layout}>
        <header className={styles.topbar}>
          <button className={styles.hamburger} aria-label="ireki-menua" onClick={() => setMenuOpen(true)}>
            ☰
          </button>
          <img className={styles.topbarLogo} src={ukeLogo} alt="UKE" />
        </header>

        {menuOpen && <div className={styles.overlay} onClick={closeMenu} />}

        <nav className={`${styles.nav} ${menuOpen ? styles.navOpen : ''}`}>
          <div className={styles.navHeader}>
            <img className={styles.navLogo} src={ukeLogo} alt="UKE" />
            <button className={styles.closeButton} aria-label="itxi-menua" onClick={closeMenu}>
              ✕
            </button>
          </div>
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
              <NavLink
                to="/admin/usuarios"
                className={({ isActive }) => (isActive ? styles.active : undefined)}
                onClick={closeMenu}
              >
                {t('usuarios', lang)}
              </NavLink>
              <NavLink
                to="/admin/temporadas"
                className={({ isActive }) => (isActive ? styles.active : undefined)}
                onClick={closeMenu}
              >
                {t('temporadas', lang)}
              </NavLink>
              <NavLink
                to="/admin/equipos"
                className={({ isActive }) => (isActive ? styles.active : undefined)}
                onClick={closeMenu}
              >
                {t('equipos', lang)}
              </NavLink>
            </>
          )}
          <NavLink
            to="/admin/historico"
            className={({ isActive }) => (isActive ? styles.active : undefined)}
            onClick={closeMenu}
          >
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
