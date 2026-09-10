import styles from './Spinner.module.css'

export function Spinner({ label }: { label?: string }) {
  return (
    <div className={styles.wrap} role="status">
      <span className={styles.spinner} aria-hidden />
      {label && <span>{label}</span>}
    </div>
  )
}
