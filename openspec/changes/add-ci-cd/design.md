## Context

`add-infra-digitalocean` produced a working single-Droplet production setup, but every step of getting it running is manual: create the Droplet by hand in the DO console, SSH in and run a dozen shell commands from `docs/infra/SETUP.md`, and re-run `deploy.sh` over SSH for every release. The Droplet itself is a snowflake — if it's lost, recreating it means redoing `SETUP.md` from memory, and there's no record of *how* it was configured beyond that document. This change makes provisioning reproducible (Terraform + cloud-init) and deployment automatic (GitHub Actions), without touching any of the production artifacts that change already built and verified (`docker-compose.prod.yml`, `Dockerfile.api.prod`, `Dockerfile.web.prod`, `Caddyfile`, `deploy.sh`, `postgres_backup.sh`).

## Goals / Non-Goals

**Goals:**
- Make the Droplet reproducible: `terraform apply` can recreate it from scratch, with cloud-init doing the OS-level setup `SETUP.md` currently walks through by hand.
- Make deploys automatic and gated: every push/PR gets tested (`ci.yml`); every push to `master` that passes CI ships automatically (`deploy.yml`), reusing `deploy.sh` rather than reimplementing its steps.
- Keep infrastructure changes (rare, higher-blast-radius) behind a manual approval gate (`infra.yml`, `workflow_dispatch` + GitHub "production" Environment), separate from application deploys (frequent, low-risk once CI passes).
- Reuse every production artifact from `add-infra-digitalocean` unchanged — this change automates *running* those files, not their content.

**Non-Goals:**
- No monitoring/alerting, no blue-green or zero-downtime deploys, no staging environment, no DNS/domain management — all explicitly out of scope per the proposal, matching `add-infra-digitalocean`'s own non-goals.
- No change to the application code, the production Dockerfiles, `docker-compose.prod.yml`, `Caddyfile`, or the two shell scripts.
- No automated rollback beyond "revert the commit and let `deploy.yml` redeploy" — same limitation `add-infra-digitalocean`'s design already accepted.

## Decisions

### D1. Terraform resources: `digitalocean_droplet` + `digitalocean_firewall` + `digitalocean_ssh_key`
`main.tf` uses the official `digitalocean/digitalocean` provider. The Droplet resource references `ubuntu-24-04-x64` (image slug), `s-2vcpu-2gb-amd` (size, matching `add-infra-digitalocean`'s Basic $12/mo plan), region `ams3`, and `user_data = file("cloud-init.yaml")`. A `digitalocean_ssh_key` resource uploads the public key once so the Droplet resource can reference it by ID rather than embedding raw key material inline. A `digitalocean_firewall` resource allows inbound 22/80/443 from anywhere and all outbound — this duplicates the in-Droplet UFW rules cloud-init also configures, deliberately: DO's network-level firewall and the Droplet's own UFW are independent layers, so a misconfiguration in one is still caught by the other.

### D2. cloud-init handles OS setup only; it never clones the repo or starts the app
`cloud-init.yaml` (the Droplet's `user_data`) installs `docker-ce`, the Docker Compose plugin, and `git`; creates `/opt/uke`; adds a 2GB swap file; and configures UFW — all one-time, infrequently-changing OS setup. It deliberately stops there. Cloning the repo, building images, and starting containers is `deploy.yml`'s job, run over SSH on every push to `master`. Mixing the two would mean every application deploy requires a `terraform apply` (and the "production" Environment's manual approval), defeating the goal of frequent, low-friction deploys.

**Alternative considered:** have cloud-init also do the first `git clone` + `docker compose up`. Rejected — it would make the Droplet's very first boot behave differently from every subsequent deploy (two code paths doing the same thing), and would couple infrequent infra changes to the deploy cadence.

### D3. Terraform state in DigitalOcean Spaces via the S3-compatible backend, with DO-specific backend flags
`backend.tf` uses Terraform's built-in `s3` backend type pointed at a DO Spaces bucket (`uke-terraform-state`, region `ams3`) rather than a DO-specific state backend (DigitalOcean doesn't have one — Spaces is deliberately S3-API-compatible for exactly this use case, keeping this vendor-agnostic per `project.md` § Infraestructura). Because Spaces isn't real AWS S3, the backend config needs `skip_credentials_validation`, `skip_metadata_api_check`, `skip_region_validation` all set to `true`, and `use_path_style = true`, with `endpoints.s3` pointed at the Spaces regional endpoint (`https://ams3.digitaloceanspaces.com`) — without these, Terraform's S3 backend tries AWS-specific validation calls that fail against a non-AWS endpoint.

The bucket itself is created manually, once, before any of this automation can run (documented in `TERRAFORM.md`) — Terraform can't create the bucket it needs to store its own state in.

### D4. `infra.yml` is manual and approval-gated; `deploy.yml` is automatic
A `terraform apply` can replace or destroy the Droplet (e.g., a change that forces resource replacement), so `infra.yml` triggers only on `workflow_dispatch` and runs inside a GitHub "production" Environment configured with required reviewers — a human must approve before `terraform apply` runs. `deploy.yml`, by contrast, only re-runs already-verified Docker commands against an *existing* Droplet and is safe to run fully automatically once `ci.yml` passes — that asymmetry (rare+risky = manual gate, frequent+safe = automatic) is the whole point of splitting them into two workflows.

### D5. `deploy.yml` invokes `deploy.sh` over SSH rather than re-implementing its steps inline
The proposal is explicit that this change reuses `deploy.sh` as-is. `deploy.yml`'s SSH step (`appleboy/ssh-action`) runs `cd /opt/uke && ./deploy.sh` rather than restating the four `docker compose` commands as separate workflow steps. This keeps exactly one source of truth for "what a deploy does" — if `deploy.sh` ever changes, the workflow doesn't need a matching edit. The only step `deploy.yml` adds on top of `deploy.sh` is the post-deploy health check (`curl --insecure https://<droplet-ip>/api/health`), since that's a CI/CD concern (did the deploy actually work?), not a deploy-mechanics concern.

**Alternative considered:** inline the four `docker compose` commands directly in the workflow (matching the brief's literal step-by-step description). Rejected — `deploy.sh` and the workflow would inevitably drift apart over time; calling the script is both simpler and safer.

### D6. `test-api`'s CI job applies migrations before running tests
Not explicitly stated in the proposal, but necessary: the API's e2e tests (`test/*.e2e-spec.ts`) hit real Prisma-backed tables via a real Postgres connection (verified directly during `add-infra-digitalocean`'s implementation). Against a fresh CI Postgres service container, `test-api` SHALL run `npx prisma migrate deploy` before `pnpm --filter @workspace/api test:e2e`, using a `DATABASE_URL` pointed at the service container (`postgresql://postgres:postgres@localhost:5432/uke_ci` or equivalent). Without this, every e2e test would fail on "table does not exist."

### D7. `build-web`'s CI job validates the build succeeds; it does not validate specific env var values
The proposal frames `build-web` as catching "missing env vars at build time." In practice, Vite does not fail a build because a `VITE_*` variable is undefined — it just bundles `undefined` in its place; a missing/wrong Auth0 domain would only surface at runtime in a browser, not as a CI failure. `build-web` still sets dummy `VITE_AUTH0_DOMAIN`/`VITE_AUTH0_CLIENT_ID`/`VITE_AUTH0_AUDIENCE`/`VITE_API_URL` values for realism and to match how the production Docker build consumes them, but its actual guarantee is narrower than the proposal implies: it catches TypeScript/bundling failures in the web app, not misconfigured environment variables. Documented here so this job's real coverage isn't overstated.

### D8. GitHub Secrets become the source of truth for `.env.prod`; the Droplet's copy is regenerated on every deploy
`add-infra-digitalocean`'s `SETUP.md` treated `.env.prod` as a file created once, by hand, on the Droplet. Under this change, the single `DO_ENV_PROD` secret (base64-encoded `.env.prod` contents, per the proposal) is the source of truth in GitHub; `deploy.yml`'s SSH step decodes it and overwrites `/opt/uke/.env.prod` on *every* deploy, before running `deploy.sh`. This is a deliberate shift: it means updating a production env var is now "update the GitHub Secret, push to master" instead of "SSH in and edit a file by hand that nothing else knows about." Overwriting on every deploy is simplest (no drift-detection logic) and harmless (identical content every time unless the secret changed).

### D9. Auto-updating `DO_DROPLET_IP` after `terraform apply` needs a PAT, not the default `GITHUB_TOKEN`
The proposal's `infra.yml` auto-updates the `DO_DROPLET_IP` secret from Terraform's `droplet_ip` output. The default `GITHUB_TOKEN` GitHub Actions provides does **not** have permission to write repository secrets via the API — that requires a fine-grained personal access token with "Secrets" write permission (or a classic PAT with `repo` scope), stored as its own secret (e.g. `GH_PAT_SECRETS_WRITE`) and used only by this one step. This is a real prerequisite the proposal doesn't mention; `TERRAFORM.md` documents creating this PAT alongside the other secrets.

### D10. `.github/workflows/ci.yml` is fully replaced, not extended
An existing `ci.yml` (and a `github-actions-ci` capability spec) already lives in the repo from an earlier, unrelated change. It's stale in two ways: it triggers on `main`/`develop`/`feature/**` — this repo's actual branch is `master`, so that workflow has never once run — and it builds Docker images inside CI using the old dev `Dockerfile.web`/`Dockerfile.api` (not the `.prod` variants this change's predecessor introduced). Confirmed with the user: `ci.yml` is fully replaced rather than extended alongside the old jobs. The in-CI Docker image build job is dropped entirely — image builds now happen on the Droplet during deploy (`deploy.sh`), not in CI, consistent with `add-infra-digitalocean`'s "images built directly on the Droplet from source" decision. `production-infrastructure` (from `add-infra-digitalocean`) is deliberately **not** touched by this change — that change's OpenSpec artifacts were found missing from disk (never archived, never committed to git) while working on this change; the actual production files it produced remain intact and are reused unmodified, so there's no real requirement text to modify there.

### D11. The frontend's Vitest suite runs in CI too, not just `vite build`
The brief's `build-web` job only ran `vite build`. That would silently drop test coverage the old `github-actions-ci` spec already required (both apps tested) and that this session verified extensively (66 passing Vitest tests). Confirmed with the user: `build-web` also runs `pnpm --filter @workspace/web test` (Vitest), in addition to the production build check — both are cheap, fast checks that belong in the same job rather than justifying a fourth job.

## Risks / Trade-offs

- **[Risk]** `master` becomes a deploy trigger — anything merged ships automatically once CI passes, with no manual "are we sure" step. → **Mitigation**: explicitly the intended behavior per the proposal; CI (`ci.yml`) is the gate, and branch protection requiring CI to pass before merge is the natural complement (not built by this change, but worth setting up in the repo).
- **[Risk]** `terraform apply` can destroy/replace the running Droplet if a change forces replacement (e.g. editing an immutable field), causing real downtime. → **Mitigation**: the manual-approval gate on `infra.yml` (D4) exists specifically for this; `terraform plan`'s output should always be reviewed before approving.
- **[Risk]** Overwriting `.env.prod` from a GitHub Secret on every deploy (D8) means a stale or wrong `DO_ENV_PROD` secret silently overwrites a Droplet's working config. → **Mitigation**: `deploy.yml`'s post-deploy health check (`/api/health`) at least catches total failures immediately after; anything subtler (e.g. a wrong-but-valid SMTP password) isn't caught by this change and would need the monitoring this change explicitly doesn't add.
- **[Risk]** The `GH_PAT_SECRETS_WRITE` PAT (D9) is a broad-scoped credential (secrets-write on the repo) living in the repo's own secrets — if `infra.yml` or its dependencies were compromised, that PAT could rewrite other secrets too. → **Mitigation**: scope the PAT as narrowly as the GitHub UI allows (fine-grained PAT limited to this one repo, "Secrets" permission only); accepted as a reasonable trade-off for the convenience of not manually updating `DO_DROPLET_IP` after every (rare) infra change.

## Migration Plan

This change has no data to migrate. The transition from `add-infra-digitalocean`'s manual flow to this one is additive: the existing manually-created Droplet keeps working with manual `deploy.sh` runs until the new pipelines are exercised for the first time. `TERRAFORM.md` documents the one-time bootstrap (create the DO Spaces bucket, create secrets) required before `infra.yml`/`deploy.yml` can run at all. Rollback, if the automation misbehaves, is simply going back to running `deploy.sh` by hand over SSH — nothing about the Droplet or the app changes in a way that requires the pipelines to exist.

## Open Questions

None outstanding — the proposal's two original open questions are resolved (specs proceed against this change's own copy of requirements; `SETUP.md` stays standalone). This design surfaces one new prerequisite not in the original brief (D9's PAT) and one correction to a claim in the brief (D7) — both are decisions here, not open questions, since they have clear resolutions.
