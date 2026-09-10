import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlantillaTab } from './PlantillaTab'
import { EquipoContext, EquipoDetalle } from './EquipoContext'

const EQUIPO: EquipoDetalle = {
  id: 'e1',
  nombre: 'Equipo Test',
  categoria: 'f7',
  minutos_por_periodo: 25,
  num_periodos: 3,
  dias_entrenamiento: [2, 4],
  temporada: { estado: 'abierta' },
  miembros: [
    {
      id: 'm2',
      grupo: 'con_ficha',
      fecha_incorporacion: '2026-01-01',
      orden: 2,
      persona: { nombre: 'Segundo Jugador' },
    },
    {
      id: 'm1',
      grupo: 'con_ficha',
      fecha_incorporacion: '2026-01-01',
      orden: 1,
      persona: { nombre: 'Primer Jugador' },
    },
    {
      id: 'e1m',
      grupo: 'entrenador',
      fecha_incorporacion: '2026-01-01',
      orden: 0,
      persona: { nombre: 'Entrenador Uno' },
    },
  ],
}

describe('PlantillaTab', () => {
  it('groups members by grupo and orders each group by orden', () => {
    render(
      <EquipoContext.Provider value={EQUIPO}>
        <PlantillaTab />
      </EquipoContext.Provider>,
    )

    expect(screen.getByText('Fitxadunak')).toBeTruthy()
    expect(screen.getByText('Entrenatzaileak')).toBeTruthy()
    expect(screen.queryByText('Fitxarik gabekoak')).toBeNull()

    const names = screen.getAllByRole('listitem').map((li) => li.textContent)
    const conFichaNames = names.filter((n) => n?.includes('Jugador'))
    expect(conFichaNames[0]).toContain('Primer Jugador')
    expect(conFichaNames[1]).toContain('Segundo Jugador')
  })
})
