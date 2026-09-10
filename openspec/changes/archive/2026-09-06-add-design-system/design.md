## Context

All prior changes implemented structure and behavior only; `project.md` § Diseño visual explicitly defers the design system to this change ("posterior a toda la funcionalidad... No se inventan estilos ni librerías de componentes"). `apps/web` today has no styling system: no Tailwind, no CSS-in-JS, just Vite's default `App.css` boilerplate (dark `#242424` background, unrelated to the product). Components (`AppShell`, `EquipoCard`, attendance tables, minutaje pills, panel cards, admin forms, overlays) render with browser defaults or minimal inline structure.

The HTML mockups in `UKE-Docs/*.html` (not `UKE-Docs/UKE-Docs/*.html` — that nested path doesn't exist) are static, non-integrated references built independently per module, so their visual language is inconsistent across files:
- `UKE_F7_Asistentziak.html`, `UKE_Eskola_Asistentziak.html`, `UKE_F7_Entrenatzaileak.html`: dark green chrome throughout (`body{background:#071a0c}`), dark login gradient, green/red state colors (`#27ae60`/`#e74c3c`).
- `UKE SEGUIMIENTO Minutos Final.html`, `UKE_SEGUIMIENTO_F7-1.html`: light chrome (`--bg:#f4f6f8`, `--text:#1a1d24`), red/green accents.
- `UKE Asistencias F11 FINAL.html`: light chrome (`--bg:#f4f6f4`) with a dark green login screen, and a much larger state palette (10 estados, each a distinct hue).

There is no single authoritative "mockup style" to copy verbatim — a technical decision on app chrome (light vs dark) is required, per the proposal's own framing.

## Goals / Non-Goals

**Goals:**
- Define one coherent token set (color, type, spacing, radius, shadow, z-index) as plain CSS custom properties in a new global stylesheet, consumed by all existing screens.
- Style the 14 component categories listed in the proposal using only those tokens plus plain CSS/CSS Modules — no new runtime dependency.
- Meet the mobile-first constraints from `project.md` § Frontend: usable at 375px, ≥44px touch targets, no horizontal scroll, no forced zoom.
- Keep every visual requirement traceable to either a mockup file, `99-decisiones.md` § G-C3 (thresholds), or a documented decision in this file when no source exists.

**Non-Goals:**
- No behavior, routing, API, or i18n changes.
- No adoption of Tailwind, a component library, or a CSS-in-JS runtime (project.md forbids inventing UI libraries; Tailwind was assumed available by the initial brief but is not actually installed in `apps/web/package.json` — confirmed by inspection).
- No pixel-perfect reproduction of any single mockup file — they disagree with each other, so this change harmonizes rather than copies.

## Decisions

### D1. Styling mechanism: plain CSS custom properties + CSS Modules, not Tailwind
`apps/web/package.json` has no Tailwind dependency and no Tailwind config exists anywhere in the repo. The proposal's premise that "Tailwind utility classes are already available" is incorrect. Introducing Tailwind now would itself be a new UI-adjacent dependency, which `project.md` § Diseño visual prohibits ("no se inventan... librerías"). Decision: define tokens as CSS custom properties in `apps/web/src/styles/tokens.css`, imported once in `main.tsx`, and style components with plain `.css` files (one per component, colocated, following the existing `App.css` precedent) using `var(--token-name)`. This is the lowest-dependency option and matches what's already in the repo.

**Alternatives considered:** Tailwind (rejected — not installed, would be a new dependency); CSS-in-JS (rejected — runtime cost on mobile, new dependency); inline styles only (rejected — no reuse, can't express hover/focus/media-query states).

### D2. App chrome: light theme, not dark
Mockups split 4-vs-3 in favor of light chrome for the actual app screens (minutaje, F7-seguimiento, F11 all use light `--bg`); only the Eskola/F7/Entrenadores-asistencia mockups and the login screens use dark green. Decision: light chrome (`--color-bg: #f7f8f7`-range) for all authenticated app screens, matching the majority of mockups and better suited to outdoor/daylight mobile use at a football pitch. The dark green (`#071a0c`/`#0c2613`) becomes the **brand accent** used sparingly (topbar on desktop, primary buttons, active states) rather than the dominant surface — this preserves UKE's green identity without forcing a dark reading surface app-wide. This is a design decision without a single unambiguous mockup source; documented here per the proposal's own rule.

### D3. Semantic thresholds map to one color triad, reused across modules
`99-decisiones.md` § G-C3 already defines per-module numeric thresholds (Eskola/F7 ≥80/≥60, F11 ≥85/≥60, minutaje ≥70/≥50) but always the same 3-way outcome (verde/ámbar/rojo) plus a "sin datos" gray. Decision: one set of semantic tokens (`--color-success`, `--color-warning`, `--color-danger`, `--color-neutral`) consumed by every module's existing threshold logic (already implemented in code) — the design system supplies color only, not threshold values, keeping G-C3 as the single source of truth for numbers.

### D4. F11's 10 attendance states get a dedicated, non-semantic palette
Unlike the 3-way success/warning/danger triad, F11's 10 codes (`1,EM,RC,VA,LS,EN,TR,EX,OT,NJ`) are categorical, not a gradient of "goodness" — e.g. `EM`/`RC` still count as presence but are visually distinct from plain `1`. Decision: a separate `--color-estado-f11-*` token per code, derived from the F11 mockup's existing 10-color set (already harmonious, avoids inventing new color relationships), kept independent of the success/warning/danger triad so the two systems don't collide when a threshold-colored `%` pill sits next to a state-colored cell.

### D5. Team colors: `equipo.color` is free-text hex, not an enum — correction after inspecting code
The proposal assumed `equipo.color` was a 3-value enum (verde/rojo/azul). Inspecting `apps/api/prisma/schema.prisma` (`color String?`) and the admin form (`EquiposPage.tsx`, a free-text input) shows it's actually an arbitrary hex string the admin types in, already consumed directly as an inline `backgroundColor` by `EquipoCard`. Decision: keep using `equipo.color` as-is (no token mapping — the value isn't constrained to 3 options, so a 3-token palette can't represent it); `--color-team-verde/rojo/azul` remain defined in `tokens.css` as reference swatches only (useful if a future change adds a color picker to the admin form), not a required mapping for `EquipoCard` rendering. `EquipoCard`'s styling work is limited to layout, hover, and touch-feedback polish around the existing color dot — not recoloring it.

### D6. Component styling unit: CSS Modules colocated per component
Each of the 14 component categories gets its own `.module.css` (or plain `.css` if the project's existing pattern — check `AppShell.tsx` has no CSS import today, so this introduces the first per-component stylesheet convention) next to its `.tsx` file, importing only `tokens.css` values. This avoids one giant global stylesheet becoming unmaintainable and matches how `apps/web/src` is already organized by feature folder (`admin/`, `asistencia/`, `catalogo/`, `minutaje/`, `panel/`).

### D7. Touch targets and mobile-first breakpoints
Base styles target 375px with no media query; a single `min-width: 768px` breakpoint promotes sidebar/topbar layouts and multi-column grids where mockups show them (admin, panel). All interactive elements (cells, pills, buttons, nav items) get `min-height: 44px` / `min-width: 44px` per Apple/Android HIG, cited in the proposal — this is a platform-standard baseline, not mockup-derived, since none of the static mockups were built mobile-first.

## Risks / Trade-offs

- **[Risk]** Retrofitting styles onto 14 already-implemented, untested-for-CSS-regressions component categories could visually break a component in a way existing behavioral tests don't catch (tests assert DOM/behavior, not layout). → **Mitigation**: tasks.md will include a manual visual pass per component against this design doc (not against the mismatched mockups) before archive, plus keeping every visual change class/style-only so existing Vitest/Testing-Library assertions on text and interaction keep passing.
- **[Risk]** Choosing light chrome (D2) diverges from 3 of 7 mockup files (Eskola/F7/Entrenadores use dark). A stakeholder expecting that dark look could be surprised. → **Mitigation**: documented explicitly as a decision with rationale (D2) rather than silently deviating; club green is preserved as accent/brand color so the identity isn't lost.
- **[Risk]** No component library means every interactive state (hover/active/focus/disabled) must be hand-authored per component, risking inconsistency. → **Mitigation**: tokens.css centralizes the values (colors, radii, shadows, transition duration) so even hand-authored CSS stays visually consistent; D6's per-component CSS Modules keep changes scoped and reviewable.
- **[Trade-off]** CSS Modules add a small build-config touch (Vite supports `.module.css` out of the box, so no new dependency, but it's a new convention for this codebase) in exchange for style encapsulation without a UI framework.

## Open Questions

- **Toast notifications**: the proposal listed a toast/notification component to style, but no such component exists anywhere in `apps/web/src` — not even unstyled. Building one now would introduce new UI surface (and likely a state/dispatch mechanism), which the proposal's own rule excludes ("Do NOT invent new features or behavior... add [undiscovered/out-of-scope components] to Open Questions"). Decision (confirmed with user): dropped from this change's scope entirely. A future functional change that actually introduces user-facing notifications should specify the component and behavior; this design system's tokens (`--color-success`/`--color-danger`/z-index `toast`) remain available for it to consume when it exists.

## Migration Plan

- No data migration; this is a frontend-only styling change, rolled out as a normal deploy of `apps/web`.
- Before archiving this change, each of the 14 component categories SHALL be verified manually in a mobile viewport (375px) and a desktop viewport (≥1280px) against this design.md — not against the original mismatched HTML mockups — to catch layout regressions the behavioral test suite can't detect (see Risks above). This becomes a normative requirement of the `design-system` capability (see `specs/design-system/spec.md`) and a checklist item in `tasks.md`.
- Rollback: revert the styling commits; no schema/API changes to unwind.
