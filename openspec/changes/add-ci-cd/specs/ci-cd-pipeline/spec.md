## ADDED Requirements

### Requirement: Deploy workflow triggers on push to master, gated on CI
`.github/workflows/deploy.yml` SHALL trigger on push to `master` only, and SHALL depend on the CI workflow (`.github/workflows/ci.yml`) passing before it proceeds — a push to `master` whose CI run fails SHALL NOT trigger a deploy (proposal § Deploy workflow).

#### Scenario: Deploy does not run on other branches
- **WHEN** a commit is pushed to a branch other than `master`
- **THEN** `deploy.yml` does not trigger

#### Scenario: Deploy does not run if CI fails
- **WHEN** a commit is pushed to `master` and its CI run fails
- **THEN** `deploy.yml` does not proceed to deploy

#### Scenario: Deploy runs automatically after CI passes on master
- **WHEN** a commit is pushed to `master` and CI passes
- **THEN** `deploy.yml` runs automatically, without any manual trigger

### Requirement: Deploy workflow writes .env.prod from a GitHub secret on every run
`deploy.yml` SHALL decode the `DO_ENV_PROD` GitHub secret (base64-encoded `.env.prod` contents) and write it to `/opt/uke/.env.prod` on the Droplet at the start of every deploy, overwriting any existing copy, before running the deploy sequence — making the GitHub secret the source of truth for production environment variables rather than a file manually maintained on the Droplet (`design.md` § D8).

#### Scenario: .env.prod always matches the GitHub secret
- **WHEN** `deploy.yml` runs
- **THEN** `/opt/uke/.env.prod` on the Droplet is overwritten with the current decoded contents of the `DO_ENV_PROD` secret before any `docker compose` command runs

### Requirement: Deploy workflow invokes deploy.sh over SSH
`deploy.yml` SHALL connect to the Droplet via SSH (using the `DO_DROPLET_IP` and `SSH_PRIVATE_KEY` secrets, via `appleboy/ssh-action`) and run `cd /opt/uke && ./deploy.sh`, rather than re-implementing `deploy.sh`'s steps inline in the workflow — `deploy.sh` remains the single source of truth for what a deploy does (proposal § Deploy workflow; `design.md` § D5).

#### Scenario: Deploy uses the existing script unmodified
- **WHEN** `deploy.yml` runs its deploy step
- **THEN** it executes `./deploy.sh` on the Droplet — the same script a human would run manually — rather than duplicating its `git pull`/`docker compose build`/`prisma migrate deploy`/`up -d` sequence as separate workflow steps

### Requirement: Post-deploy health check
After `deploy.sh` completes, `deploy.yml` SHALL make an HTTP request to `https://<droplet-ip>/api/health` (using `--insecure`, since the certificate is self-signed until a domain is added) and SHALL fail the workflow if the health check does not succeed (proposal § Deploy workflow).

#### Scenario: Successful health check passes the workflow
- **WHEN** `deploy.sh` completes and `/api/health` responds successfully
- **THEN** `deploy.yml` reports success

#### Scenario: Failed health check fails the workflow
- **WHEN** `deploy.sh` completes but `/api/health` does not respond successfully (e.g. the API container failed to start)
- **THEN** `deploy.yml` reports failure, surfacing the problem immediately after deploy rather than leaving it to be discovered later
