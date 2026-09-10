import styles from './EmptyState.module.css'

export function EmptyState({ text, icon = '📭' }: { text: string; icon?: string }) {
  return (
    <div className={styles.wrap}>
      <span className={styles.icon} aria-hidden>
        {icon}
      </span>
      <span>{text}</span>
    </div>
  )
}
