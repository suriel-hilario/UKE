import { Categoria } from '../generated/prisma/enums'

export const ESTADOS_VALIDOS: Record<Categoria, string[]> = {
  [Categoria.eskola]: ['P', 'A'],
  [Categoria.f7]: ['P', 'A'],
  [Categoria.f11]: ['1', 'EM', 'RC', 'VA', 'LS', 'EN', 'TR', 'EX', 'OT', 'NJ'],
}

export const ESTADOS_QUE_COMPUTAN: Record<Categoria, string[]> = {
  [Categoria.eskola]: ['P'],
  [Categoria.f7]: ['P'],
  [Categoria.f11]: ['1', 'EM', 'RC'],
}
