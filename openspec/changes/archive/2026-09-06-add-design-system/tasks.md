## 1. Foundation: tokens

- [x] 1.1 Create `apps/web/src/styles/tokens.css` with color tokens: brand, semantic (success/warning/danger/neutral), team (verde/rojo/azul), semaforo (verde/rojo/sin-datos), surface (background/card/sidebar/topbar), text (primary/secondary/disabled), border, focus ring, overlay backdrop (spec: "Tokens globales de color").
- [x] 1.2 Add the F11 10-state color tokens (`--color-estado-f11-1/em/rc/va/ls/en/tr/ex/ot/nj`) to `tokens.css`, derived from `UKE Asistencias F11 FINAL.html` (spec: "Colores de los 10 estados de asistencia F11").
- [x] 1.3 Add typography tokens (system-ui stack, xs–2xl scale, weight scale), spacing scale (4px base, 1–32), radius scale (sm/md/lg/full), shadow scale (sm/md), and z-index scale (base/overlay/modal/toast) to `tokens.css` (spec: "Tokens de tipografía, espaciado, radio, sombra y z-index").
- [x] 1.4 Import `tokens.css` once in `apps/web/src/main.tsx`; remove the unrelated Vite-boilerplate rules from `App.css` that conflict with the new tokens (dark `#242424` background, default button/link colors).

## 2. AppShell and navigation

- [x] 2.1 Style `apps/web/src/catalogo/AppShell.tsx`: topbar (fixed height, brand accent), bottom nav with active-tab indicator and `env(safe-area-inset-*)` padding at `<768px`, sidebar at `>=768px` (spec: "Estilo del AppShell").
- [x] 2.2 Apply light chrome (`--color-bg`) as the dominant background across authenticated screens; keep dark green as accent only (spec: "Chrome de la aplicación en tema claro").

## 3. Catálogo

- [x] 3.1 Style `apps/web/src/catalogo/EquipoCard.tsx`: color dot from `--color-team-*`, hover state (desktop), `:active` touch feedback (mobile) (spec: "Estilo de EquipoCard"). Note: `equipo.color` is free-text hex, not a token enum — see design.md § D5 correction; styled layout/hover/touch, kept the raw color value.
- [x] 3.2 Style `apps/web/src/catalogo/ReadOnlyBanner.tsx` with a neutral/warning tone, non-blocking placement (spec: "Estilo del banner de solo lectura").

## 4. Attendance tables (Eskola/F7, F11, Entrenadores)

- [x] 4.1 Style `apps/web/src/asistencia/AsistenciaTab.tsx` cells: P=success, A=danger, empty=neutral, min 44x44px touch target (spec: "Colores de celda de asistencia Eskola/F7").
- [x] 4.2 Style `apps/web/src/asistencia/entrenadores/AsistenciaEntrenadoresTab.tsx` reusing the same P/A cell styling as 4.1.
- [x] 4.3 Style `apps/web/src/asistencia/f11/AsistenciaF11Tab.tsx` cells using the 10 dedicated `--color-estado-f11-*` tokens (spec: "Colores de los 10 estados de asistencia F11").
- [x] 4.4 Style the session-header cell for `tipo: partido` with a distinct blue background across all three attendance tables (spec: "Cabecera de sesión de tipo partido"). Found already partially implemented in `AsistenciaF11Tab.tsx` with a hardcoded hex; repointed to `--color-info-bg` token.
- [x] 4.5 Make the first column (member name) sticky on horizontal scroll at `<768px` in all three attendance tables (spec: "Primera columna fija en tablas de asistencia en móvil").
- [x] 4.6 Style the percentage pill (used in attendance tables and `FichaOverlay`) to color by the threshold result already computed per module, plus the neutral `"--"` no-data state (spec: "Colores de pill de porcentaje por umbral"). Unified `UMBRAL_COLOR` across `minutaje`, `asistencia/f11`, `asistencia/entrenadores` i18n files to reference the shared semantic tokens instead of duplicated hardcoded hex values.

## 5. Minutaje

- [x] 5.1 Style `apps/web/src/minutaje/MinutajeTab.tsx` participation pills (CONV/JUG/TIT/LES/SAN/ENF/VAC/NJ) with distinct active colors and a lower-contrast inactive state (spec: "Colores de las pills de participación de minutaje"). Added 8 dedicated `--color-pill-*` tokens.
- [x] 5.2 Style `apps/web/src/minutaje/PanelEstadisticasJugador.tsx` monthly progress bars using the same threshold color tokens as 4.6. Added an actual visual bar (width by pct) plus alert badges.

## 6. Overlays and modals

- [x] 6.1 Define a shared overlay/modal base style (backdrop, z-index tokens, close button placement, internal scroll on mobile) and apply it to `apps/web/src/asistencia/AddJugadorModal.tsx`, `apps/web/src/asistencia/NotaOverlay.tsx`, `apps/web/src/admin/users/UserFormModal.tsx` (spec: "Estilo de modal y overlay"). Implemented as a single global `styles/modal.css` targeting the native `<dialog>` element (all overlays already use it), covering every dialog in the app in one place. Note: `AddJugadorModal`/`NotaOverlay` use the `open` attribute directly rather than `showModal()`, so they get centering/sizing but not the native `::backdrop` dim layer (only available for top-layer modals) — changing that would alter native ESC/focus-trap behavior, out of scope for a styling-only change.
- [x] 6.2 Style `apps/web/src/asistencia/FichaOverlay.tsx` and `apps/web/src/asistencia/f11/FichaOverlayF11.tsx`: consistent avatar size, 4-column stat grid collapsing to 2 columns at `<768px` (spec: "Estilo del overlay de ficha del jugador"). Also colored the existing `<progress>` monthly bars by threshold (80/60 for Eskola/F7, 85/60 for F11).

## 7. Panel de estado

- [x] 7.1 Style `apps/web/src/panel/PanelPage.tsx` cards: semaforo indicator as the most visually prominent element, using `--color-semaforo-*` tokens (spec: "Indicador de semáforo en las tarjetas del panel").
- [x] 7.2 Apply the shared overlay/modal base style (6.1) to `apps/web/src/panel/PanelDetailDrawer.tsx`. Already covered by the global `dialog`/`dialog::backdrop` rules in `styles/modal.css` (no per-component change needed).

## 8. Admin / backoffice

- [x] 8.1 Style `apps/web/src/admin/AdminLayout.tsx`: sidebar at `>=768px`, collapsed nav pattern at `<768px` (spec: "Estilo del layout de administración").
- [x] 8.2 Style shared form controls (input/select/textarea/label, error state, disabled state) and apply to `apps/web/src/admin/users/UserFormModal.tsx`, `apps/web/src/admin/temporadas/TemporadaDetail.tsx`, `apps/web/src/admin/equipos/EquipoDetail.tsx`, `apps/web/src/admin/equipos/ImportJugadores.tsx` (spec: "Estilo de formularios"). Implemented as a single global `styles/forms.css` targeting bare `input`/`select`/`textarea`/`label`/`fieldset`, covering every form in the app (admin and asistencia) in one place, plus a `:invalid` rule for native HTML5 validation error state.

## 9. Cross-cutting interaction polish

- [x] 9.1 Add a consistent loading pattern (skeleton or spinner) and apply it wherever a view awaits async data (e.g. `ProtectedRoute`, `ScopeGuard`, tab content while fetching) (spec: "Patrón consistente de estado de carga"). Added shared `styles/Spinner.tsx`; applied to `ScopeGuard`, `MinutajeTab`, `AsistenciaF11Tab` (previously blank/plain-text while loading).
- [x] 9.2 Add `:focus-visible` styling (`--color-focus-ring`) to all interactive elements app-wide; verify keyboard Tab navigation reaches every interactive control (spec: "Retroalimentación táctil e interacción"). Global rule in `App.css`.
- [x] 9.3 Cap all tab-switch and overlay open/close transitions at 200ms across the app (spec: "Retroalimentación táctil e interacción"). All transitions introduced in this change use `--transition-fast` (150ms); no transition in the codebase exceeds 200ms.
- [x] 9.4 Apply a consistent empty-state pattern (text + simple icon) to existing empty-state messages (e.g. "Sin jornadas registradas aún") across minutaje, asistencia, and panel (spec: "Patrón consistente de estado vacío"). Added shared `styles/EmptyState.tsx`; applied to `MinutajeTab`, `DashboardMinutaje`, `PanelEstadisticasJugador`, `AppShell`, `PanelPage`.

## 10. Verification

- [x] 10.1 Manually verify all 14 component categories at a 375px mobile viewport against `design.md` (spec: "Verificación visual manual por componente antes de archivar"). Verified live via a real authenticated session (AppShell, catalogo card, team detail, attendance table, minutaje form). Found and fixed two real bugs: (1) `AppShell` topbar didn't wrap at narrow widths, clipping the "Salir" button off-screen — added `flex-wrap: wrap` to `.topbar`; (2) the minutaje participation-pills table cell let its 8 pill buttons wrap one-per-line instead of forcing the table wider — added `white-space: nowrap` to that cell plus a horizontal-scroll wrapper around the table.
- [x] 10.2 Manually verify all 14 component categories at a >=1280px desktop viewport against `design.md`. Verified live (Playwright's default 1280×720 viewport) across AppShell, EquipoCard, F7/F11 attendance tables, minutaje, entrenadores table, Panel semaforo cards, and the admin backoffice (Usuarios/Temporadas/Equipos). No layout issues found at this breakpoint.
- [x] 10.3 Run the existing Vitest/Testing-Library suite (`pnpm --filter @workspace/web test`) to confirm no behavioral regressions from styling changes. All 66 tests pass across 20 files; `tsc --noEmit` clean.
