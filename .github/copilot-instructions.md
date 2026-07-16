# UKE Workspace Harness Baseline

This workspace contains product prototypes and living specifications for the UKE sports management application.

## Sources of truth (in order of precedence)
1. `UKE-Docs/inventario/99-decisiones.md` — closed product decisions. On any conflict, this file wins.
2. `UKE-Docs/inventario/01..04-*.md` — validated functional inventories of the mockups.
3. `UKE-Docs/inventario/98-modelo-datos.md` — validated data model.
4. `openspec/project.md` — technical stack, architecture, and development conventions (non-negotiable).
5. `UKE-Docs/inventario/00-especificaciones-cliente.md` — original client requirements.

## Anti-hallucination rules (mandatory)
- Only specify or implement what is traceable to the sources above. Every requirement must cite its origin (`inventario/NN.md § section` or `99-decisiones.md § G-XX`).
- If information is missing, add it to an `## Open Questions` section — never invent it.
- Never propose alternatives to the stack or decisions already fixed in these files.
- Never specify the mock login/credentials flow from the HTML mockups; authentication is Auth0 only (99-decisiones § G-B2).

## Expected Working Mode

- Prefer updating or extending the markdown specs before proposing implementation details when requirements are still moving.
- Keep edits aligned across `00-indice-resumen.md` through `06-arquitectura-tecnica.md` when a change affects roles, data model, workflows, UI, or architecture.
- Call out contradictions between documents instead of silently choosing one.
- Use `project.md` as the source of truth for technical stack, architecture, and development conventions.

## Domain Constraints

- Roles currently modeled in the specs are: Administrador, Direccion Deportiva, Coordinador, Entrenador.
- F7 and F11 use separate operational blocks for pretemporada and temporada.
- Player percentages depend on the player's fecha de incorporacion.
- Historical data is readonly.
- Automatic reminders are currently specified as in-app first, with optional email.

## Editing Preferences

- Preserve Spanish wording in the product specifications unless the user asks for bilingual authoring.
- Keep terminology consistent with the existing docs: asistencia, minutaje, pretemporada, temporada, historico, bloque operativo.
- Prefer small, traceable documentation edits over broad rewrites.

## When Asked To Build

- If the user moves from requirements to implementation, use the specs to derive the affected files and keep implementation aligned with the documented role model and data model.