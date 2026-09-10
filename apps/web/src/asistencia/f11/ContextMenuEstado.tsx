import { ESTADOS_F11, EstadoF11, estadoLabel, t, Lang } from './i18n'

export function ContextMenuEstado({
  x,
  y,
  actual,
  lang,
  onSelect,
  onClose,
}: {
  x: number
  y: number
  actual: string | null
  lang: Lang
  onSelect: (estado: EstadoF11) => void
  onClose: () => void
}) {
  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 100 }}
      />
      <div
        role="menu"
        style={{
          position: 'fixed',
          top: y,
          left: x,
          zIndex: 101,
          background: 'white',
          border: '1px solid #ccc',
          padding: 8,
        }}
      >
        <strong>{t('markarSaioa', lang)}</strong>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {ESTADOS_F11.map((estado) => (
            <li key={estado}>
              <button onClick={() => onSelect(estado)}>
                {actual === estado ? '✓ ' : ''}
                {estado} — {estadoLabel(estado, lang)}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
