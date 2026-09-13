import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useCatalogoApi } from './api'
import { useAuth } from '../auth/useAuth'
import { t, Lang } from './i18n'
import { EquipoCard, EquipoResumen } from './EquipoCard'
import { t as tPanel } from '../panel/i18n'
import styles from './AppShell.module.css'
import { EmptyState } from '../styles/EmptyState'
import ukeLogo from '../assets/escudo-uke.png'

interface Me {
  id: string
  email?: string
  rol?: string
  nombre_visible?: string
  idioma?: Lang
}

interface Temporada {
  id: string
  nombre: string
  estado: 'abierta' | 'cerrada'
}

export function AppShell() {
  const api = useCatalogoApi()
  const { logout, user } = useAuth()
  const [searchParams] = useSearchParams()
  const temporadaIdParam = searchParams.get('temporada_id')
  const tienePanel = user?.rol === 'director' || user?.rol === 'coordinador'
  const [lang, setLang] = useState<Lang>('eu')
  const [me, setMe] = useState<Me | null>(null)
  const [temporadas, setTemporadas] = useState<Temporada[]>([])
  const [temporadaId, setTemporadaId] = useState<string>(temporadaIdParam ?? '')
  const [equipos, setEquipos] = useState<EquipoResumen[]>([])
  const [categoria, setCategoria] = useState<string>('')

  useEffect(() => {
    api.get('/auth/me').then((data: Me) => {
      setMe(data)
      if (data.idioma) setLang(data.idioma)
    })
    api.get('/catalogo/temporadas').then((data: Temporada[]) => {
      setTemporadas(data)
      if (temporadaIdParam) return
      const abiertas = data.filter((temporada) => temporada.estado === 'abierta')
      if (abiertas.length === 1) setTemporadaId(abiertas[0].id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!temporadaId) return
    api.get(`/catalogo/temporadas/${temporadaId}/equipos`).then((data: EquipoResumen[]) => {
      setEquipos(data)
      setCategoria((current) => (data.some((e) => e.categoria === current) ? current : (data[0]?.categoria ?? '')))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temporadaId])

  async function handleLangChange(next: Lang) {
    setLang(next)
    await api.patch('/auth/me/idioma', { idioma: next })
  }

  const categorias = Array.from(new Set(equipos.map((e) => e.categoria)))
  const visibleEquipos = equipos.filter((e) => e.categoria === categoria)

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <span className={styles.brand}>
          <img className={styles.brandLogo} src={ukeLogo} alt="UKE" />
          UKE
        </span>
        <select
          className={styles.langSelect}
          value={lang}
          onChange={(e) => handleLangChange(e.target.value as Lang)}
        >
          <option value="eu">EU</option>
          <option value="es">ES</option>
        </select>
        {me && (
          <span className={styles.userBadge}>
            {me.nombre_visible ?? me.email} ({me.rol})
          </span>
        )}
        {tienePanel && (
          <Link className={styles.panelLink} to="/panel">
            {tPanel('panel', lang)}
          </Link>
        )}
        <button className={styles.logoutButton} onClick={() => logout()}>
          {t('salir', lang)}
        </button>
      </header>

      {temporadas.length > 0 && !temporadaId && (
        <select
          className={styles.temporadaSelect}
          value={temporadaId}
          onChange={(e) => setTemporadaId(e.target.value)}
        >
          <option value="" disabled>
            {t('seleccionaTemporada', lang)}
          </option>
          {temporadas.map((temporada) => (
            <option key={temporada.id} value={temporada.id}>
              {temporada.nombre}
              {temporada.estado === 'cerrada' ? ` (${t('cerrada', lang)})` : ''}
            </option>
          ))}
        </select>
      )}

      <div className={styles.body}>
        <nav className={styles.nav}>
          {categorias.map((cat) => (
            <button
              key={cat}
              className={styles.navButton}
              onClick={() => setCategoria(cat)}
              disabled={cat === categoria}
            >
              {cat}
            </button>
          ))}
        </nav>

        <main className={styles.main}>
          {temporadaId && visibleEquipos.length === 0 && <EmptyState text={t('sinEquipos', lang)} icon="🛡️" />}
          {visibleEquipos.map((equipo) => (
            <EquipoCard key={equipo.id} equipo={equipo} lang={lang} />
          ))}
        </main>
      </div>
    </div>
  )
}
