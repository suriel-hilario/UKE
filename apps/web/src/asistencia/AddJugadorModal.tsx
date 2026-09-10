import { useState } from 'react'
import { t } from './i18n'

export function AddJugadorModal({
  onAdd,
  onClose,
}: {
  onAdd: (nombre: string) => Promise<void>
  onClose: () => void
}) {
  const [nombre, setNombre] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return
    await onAdd(nombre.trim())
  }

  return (
    <dialog open>
      <form onSubmit={handleSubmit}>
        <label>
          {t('nombre')}
          <input autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </label>
        <button type="submit">{t('anadir')}</button>
        <button type="button" onClick={onClose}>
          {t('cancelar')}
        </button>
      </form>
    </dialog>
  )
}
