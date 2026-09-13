import { useEquipo } from './EquipoContext'
import { Miembro } from './EquipoContext'
import { t } from './i18n'
import styles from './PlantillaTab.module.css'

const GRUPOS: { key: Miembro['grupo']; labelKey: 'conFicha' | 'sinFicha' | 'entrenadores' }[] = [
  { key: 'con_ficha', labelKey: 'conFicha' },
  { key: 'sin_ficha', labelKey: 'sinFicha' },
  { key: 'entrenador', labelKey: 'entrenadores' },
]

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function PlantillaTab() {
  const equipo = useEquipo()

  return (
    <div>
      {GRUPOS.map(({ key, labelKey }) => {
        const miembros = equipo.miembros
          .filter((m) => m.grupo === key)
          .sort((a, b) => a.orden - b.orden)

        if (miembros.length === 0) return null

        return (
          <section key={key}>
            <h3>{t(labelKey)}</h3>
            <ul className={styles.list}>
              {miembros.map((miembro) => (
                <li key={miembro.id} className={styles.item}>
                  <span className={styles.avatar}>
                    {miembro.persona.foto_url ? (
                      <img src={miembro.persona.foto_url} alt="" width={32} height={32} />
                    ) : (
                      <span aria-hidden>{iniciales(miembro.persona.nombre)}</span>
                    )}
                  </span>
                  <strong>{miembro.persona.nombre}</strong>
                  {miembro.persona.alias && <span> ({miembro.persona.alias})</span>}
                  {miembro.rol_entrenador && <span> — {miembro.rol_entrenador}</span>}
                  <span> {t('fechaIncorporacion')}: {miembro.fecha_incorporacion}</span>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
