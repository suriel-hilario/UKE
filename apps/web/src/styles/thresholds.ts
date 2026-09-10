export function pctPillClass(pct: number | null, alto: number, medio: number): string {
  if (pct == null) return 'pill pill-neutral'
  if (pct >= alto) return 'pill pill-success'
  if (pct >= medio) return 'pill pill-warning'
  return 'pill pill-danger'
}
