## Why

Every previous change specified structure and behavior only; CSS has stayed minimal/structural. The app now has all its screens implemented but no coherent visual identity — no shared color tokens, no consistent typography/spacing scale, and no defined touch/interaction polish for the mobile-first PWA that `project.md` § Frontend requires. This change closes that gap purely on the presentation layer, without touching behavior.

## What Changes

- Define a global design token set (`tokens.css`): color palette (brand, semantic success/warning/danger/neutral, team colors verde/rojo/azul, semaforo verde/rojo/sin-datos, surface, text, border, focus ring, overlay), typography scale (system-ui stack, xs–2xl, weights), 4px-based spacing scale, border-radius scale, shadow scale, and z-index scale.
- Apply these tokens to style the already-implemented, currently-unstyled components: AppShell (topbar/sidebar/bottom nav/safe areas), EquipoCard, attendance tables (Eskola/F7 P/A cells, F11 10-state cells, session headers), percentage pills (color-by-threshold, consistent across Eskola/F7 80/60, F11 85/60, minutaje 70/50), minutaje participation pills (CONV/JUG/TIT/LES/SAN/ENF/VAC/NJ), ReadOnlyBanner, modal/overlay, FichaOverlay, PanelPage cards (semaforo), AdminLayout, loading states, and form controls. Toast notifications are excluded — see Open Questions in `design.md`; no such component exists in the codebase yet, and adding one would be new UI surface, not styling of existing behavior.
- Define interaction polish: touch feedback on tappable elements, visible focus states, transitions capped at 200ms, and a consistent empty-state pattern.
- No new API calls, routes, i18n strings, or functional requirements — this is presentational only. Existing EU/ES literals are reused as-is.

## Capabilities

### New Capabilities
- `design-system`: Global design tokens (color, typography, spacing, radius, shadow, z-index) and the presentational contract for styling AppShell, cards, tables, pills, banners, overlays, panel cards, admin layout, toasts, loading states, and forms — mobile-first (375px baseline), touch targets ≥44px, no new UI dependencies.

### Modified Capabilities
_None — no behavioral/functional requirement changes to any existing capability. Visual application to components owned by other capabilities (e.g., attendance tables in `asistencia-jugadores`/`asistencias-f11`, pills in `minutaje`, banners in `historico`) is covered by requirements in `design-system` referencing those components, not by editing their existing behavioral specs._

## Impact

- **Affected code**: global stylesheet/tokens file (new), component-level className/style updates across `apps/web/src/{admin,asistencia,auth,catalogo,minutaje,panel}` and shared shell/layout components — styling only, no logic changes.
- **No affected APIs**: zero backend changes.
- **No new dependencies**: reuses existing Tailwind utilities + CSS custom properties, per `project.md` § Frontend ("sin dependencias de UI").
- **Risk**: purely visual regression risk (nothing should behave differently); mitigated by not touching any component logic, only styles/classNames.
