import { createContext, useContext } from 'react'

export interface Miembro {
  id: string
  grupo: 'con_ficha' | 'sin_ficha' | 'entrenador'
  rol_entrenador?: string | null
  fecha_incorporacion: string
  fecha_baja?: string | null
  orden: number
  persona: {
    nombre: string
    alias?: string | null
    foto_url?: string | null
  }
}

export interface EquipoDetalle {
  id: string
  nombre: string
  categoria: string
  color?: string | null
  icono?: string | null
  minutos_por_periodo: number
  num_periodos: number
  dias_entrenamiento: number[]
  miembros: Miembro[]
  temporada: { estado: 'abierta' | 'cerrada' }
}

export const EquipoContext = createContext<EquipoDetalle | null>(null)

export function useEquipo(): EquipoDetalle {
  const equipo = useContext(EquipoContext)
  if (!equipo) {
    throw new Error('useEquipo debe usarse dentro de un ScopeGuard')
  }
  return equipo
}
