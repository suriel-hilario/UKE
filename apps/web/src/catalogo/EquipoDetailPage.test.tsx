import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { EquipoDetailPage } from './EquipoDetailPage'
import { EquipoContext, EquipoDetalle } from './EquipoContext'

function equipo(categoria: string, estado: 'abierta' | 'cerrada' = 'abierta'): EquipoDetalle {
  return {
    id: 'e1',
    nombre: 'Equipo',
    categoria,
    minutos_por_periodo: 25,
    num_periodos: 3,
    dias_entrenamiento: [1, 3],
    miembros: [],
    temporada: { estado },
  }
}

function renderConEquipo(categoria: string, estado: 'abierta' | 'cerrada' = 'abierta') {
  return render(
    <MemoryRouter>
      <EquipoContext.Provider value={equipo(categoria, estado)}>
        <EquipoDetailPage />
      </EquipoContext.Provider>
    </MemoryRouter>,
  )
}

describe('EquipoDetailPage — pestaña Entrenadores', () => {
  it('shows the Entrenadores tab for F7 teams', () => {
    renderConEquipo('f7')
    expect(screen.getByRole('button', { name: /Entrenatzaileak|Entrenadores/ })).toBeTruthy()
  })

  it('does not show the Entrenadores tab for Eskola teams', () => {
    renderConEquipo('eskola')
    expect(screen.queryByRole('button', { name: /Entrenatzaileak|Entrenadores/ })).toBeNull()
  })

  it('does not show the Entrenadores tab for F11 teams', () => {
    renderConEquipo('f11')
    expect(screen.queryByRole('button', { name: /Entrenatzaileak|Entrenadores/ })).toBeNull()
  })
})

describe('EquipoDetailPage — banner de solo lectura', () => {
  it('shows the read-only banner for a team in a closed temporada', () => {
    renderConEquipo('f7', 'cerrada')
    expect(screen.getByRole('status')).toBeTruthy()
  })

  it('does not show the read-only banner for a team in an open temporada', () => {
    renderConEquipo('f7', 'abierta')
    expect(screen.queryByRole('status')).toBeNull()
  })
})
