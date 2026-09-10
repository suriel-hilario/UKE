## Why

`add-infra-digitalocean` set up production infrastructure with a manual playbook: SSH in, run `terraform`-free Droplet creation by hand via the DO console, and re-run `deploy.sh` over SSH for every release. That's fine for a first deploy but doesn't scale to "push to master and it ships," and the Droplet itself isn't reproducible — losing it means redoing every manual step in `SETUP.md` from memory. This change replaces the manual provisioning and manual deploy steps with Terraform (infrastructure as code) and GitHub Actions (CI/CD), while deliberately reusing every production artifact `add-infra-digitalocean` already built and verified (`docker-compose.prod.yml`, both production Dockerfiles, the `Caddyfile`, `deploy.sh`, `postgres_backup.sh`) — this change automates *running* those files, it doesn't replace them.

## What Changes

- Add `infra/terraform/`: `main.tf` (DigitalOcean provider, Droplet, firewall, SSH key resources), `variables.tf`, `outputs.tf` (`droplet_ip`, `droplet_id`), `cloud-init.yaml` (Droplet `user_data`: installs Docker/Docker Compose plugin/git, creates `/opt/uke`, adds a 2GB swap file, configures UFW — but does **not** clone the repo or start the app, that stays the deploy pipeline's job), `terraform.tfvars.example`, `backend.tf` (Terraform state stored in a DigitalOcean Spaces bucket, S3-compatible backend).
- **Replace** the existing `.github/workflows/ci.yml` (stale — triggers on `main`/`develop`/`feature/**`, which never fires since this repo's actual branch is `master`; builds Docker images in CI using the old dev `Dockerfile.web`/`Dockerfile.api`). New version runs on every push/PR to any branch: typecheck (api + web), API unit + e2e tests (with a Postgres service container), and a web production build (`vite build`) to catch build-time env var issues early. **No Docker image building in CI** — image builds happen on the Droplet during deploy, not here.
- Add `.github/workflows/deploy.yml`: runs on push to `master` only, gated on CI passing — SSHes into the Droplet and runs the exact same `git pull` → `docker compose build` → `prisma migrate deploy` → `up -d` sequence `deploy.sh` already encodes, plus a post-deploy health check against `/api/health`.
- Add `.github/workflows/infra.yml`: `workflow_dispatch`-only (never automatic), gated behind a GitHub "production" environment requiring manual approval — runs `terraform init/plan/apply` to create or update the Droplet. After a successful `terraform apply`, the workflow automatically updates the `DO_DROPLET_IP` GitHub secret via the GitHub API using the `droplet_ip` Terraform output — eliminating the manual step of setting that secret after provisioning.
- Add `docs/infra/TERRAFORM.md`: the one-time manual bootstrap (create the DO Spaces state bucket, create a DO API token, add GitHub Secrets) and the day-to-day flow once CI/CD is live.
- **Does not touch** `docker-compose.prod.yml`, `Dockerfile.api.prod`, `Dockerfile.web.prod`, `Caddyfile`, `deploy.sh`, or `postgres_backup.sh` — all reused exactly as `add-infra-digitalocean` built and verified them.

## Capabilities

### New Capabilities
- `infra-as-code`: Terraform-managed Droplet/firewall/SSH-key provisioning via a DO Spaces remote state backend, driven by a manually-triggered, approval-gated GitHub Actions workflow (`infra.yml`). After `terraform apply`, the workflow auto-updates the `DO_DROPLET_IP` GitHub secret from the Terraform output. Covers `infra/terraform/*` and that one workflow.
- `ci-cd-pipeline`: automated deployment to the existing Droplet on push to `master` (`deploy.yml`, invoking `deploy.sh` over SSH plus a post-deploy health check), replacing the manual SSH-driven redeploy loop. (CI itself — `ci.yml` — is a **modified** capability below, not new; it already existed under a different, stale design.)

### Modified Capabilities
- `github-actions-ci`: full rewrite of `.github/workflows/ci.yml` and its requirements. The existing spec/workflow triggers on `main`/`develop`/`feature/**` (this repo's real branch is `master` — the existing workflow has never actually run) and builds Docker images in CI using the old dev Dockerfiles. New requirements: trigger on push/PR to any branch; three jobs (`lint-and-typecheck`, `test-api` with a Postgres service container for e2e tests, `build-web`); no Docker image building in CI at all — that happens on the Droplet during deploy (`deploy.sh`/`deploy.yml`), not here.

`production-infrastructure` (from `add-infra-digitalocean`) is **not** listed as modified: that change's OpenSpec artifacts were lost from disk before being archived (confirmed with the user; the actual production files — `docker-compose.prod.yml`, both `Dockerfile*.prod`, `Caddyfile`, `deploy.sh`, `postgres_backup.sh`, `SETUP.md` — are intact and unaffected). On inspection, none of that capability's actual requirement text would need to change anyway (it describes the production files' own behavior, which this change reuses unmodified) — the real behavior change (automated provisioning, automated deploy) is fully captured in the two capabilities above.

## Impact

- **New files only** — no existing application code changes. New directories: `infra/terraform/`, `.github/workflows/`, and `docs/infra/TERRAFORM.md` alongside the existing `docs/infra/SETUP.md`.
- **External dependencies**: a DigitalOcean API token, a DigitalOcean Spaces bucket for Terraform state (`uke-terraform-state`, created manually once, before this automation can run), and GitHub Secrets (`DO_TOKEN`, `DO_SPACES_ACCESS_KEY`, `DO_SPACES_SECRET_KEY`, `SSH_PRIVATE_KEY`, `SSH_PUBLIC_KEY`, `DO_DROPLET_IP` — auto-updated by `infra.yml` after apply — plus the app's production env vars encoded as `DO_ENV_PROD`).
- **`SETUP.md` stays standalone** as a manual fallback reference. `TERRAFORM.md` is the primary operational guide going forward. No edits to `SETUP.md`.
- **Risk**: `master` is now a deploy trigger — anything merged ships automatically once CI passes. Intended behavior per the brief.

## Open Questions

None — both open questions resolved:
- Specs drafted against this change's own copy of requirements; re-verification after `add-infra-digitalocean` is archived is acceptable.
- `SETUP.md` left standalone as manual fallback. `TERRAFORM.md` is the primary guide.