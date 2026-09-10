import { t, Lang } from './i18n'
import styles from './ReadOnlyBanner.module.css'

export function ReadOnlyBanner({ lang = 'eu' }: { lang?: Lang }) {
  return (
    <div role="status" className={styles.banner}>
      <span aria-hidden>🔒</span>
      <strong>{t('temporadaCerradaBanner', lang)}</strong>
    </div>
  )
}
