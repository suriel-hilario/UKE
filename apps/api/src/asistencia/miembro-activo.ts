export function miembroActivoEnFecha(
  miembro: { fecha_incorporacion: Date; fecha_baja: Date | null },
  fecha: Date,
): boolean {
  if (miembro.fecha_incorporacion > fecha) return false
  if (miembro.fecha_baja && miembro.fecha_baja < fecha) return false
  return true
}
