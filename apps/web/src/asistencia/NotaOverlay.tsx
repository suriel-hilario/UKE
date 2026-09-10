import { useState } from 'react'
import { t } from './i18n'

export function NotaOverlay({
  jugadorNombre,
  fecha,
  notaInicial,
  onSave,
  onDelete,
  onClose,
}: {
  jugadorNombre: string
  fecha: string
  notaInicial: string
  onSave: (nota: string) => Promise<void>
  onDelete: () => Promise<void>
  onClose: () => void
}) {
  const [nota, setNota] = useState(notaInicial)

  return (
    <dialog open onClose={onClose}>
      <h3>{t('nota')}</h3>
      <p>
        {jugadorNombre} · {fecha}
      </p>
      <textarea rows={4} value={nota} onChange={(e) => setNota(e.target.value)} />
      <button onClick={() => onSave(nota)}>{t('guardar')}</button>
      <button onClick={onDelete}>{t('eliminarNota')}</button>
      <button onClick={onClose}>{t('cerrar')}</button>
    </dialog>
  )
}
