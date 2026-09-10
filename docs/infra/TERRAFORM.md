# Production infrastructure — Terraform + GitHub Actions

Automated alternative to the manual [SETUP.md](./SETUP.md) flow: the Droplet is created
by Terraform (`infra/terraform/`), and deploys run automatically via GitHub Actions on
every push to `master`. Same target as `SETUP.md` — a single Ubuntu 24.04 Droplet,
IP-based access, no domain yet.

Use this guide for a from-scratch environment. If a Droplet already exists from
following `SETUP.md` by hand, that Droplet keeps working with manual `deploy.sh` runs —
switching to this pipeline is optional and requires importing the existing Droplet into
Terraform state, which this guide does not cover.

## 1. Create the Terraform state bucket (one-time, manual)

In the DigitalOcean console, under **Spaces**, create a bucket named
`uke-terraform-state` in the **AMS3** region. This holds Terraform's state file — it is
never committed to the repository.

Generate a **Spaces access key** (Spaces → "Manage Keys"). Note the access key and
secret key; you'll add them as GitHub Secrets in step 3.

## 2. Create a DigitalOcean API token

In the DigitalOcean console, under **API → Tokens**, generate a token with read/write
access. This is used by both Terraform (to create the Droplet) and is separate from the
Spaces access key above.

## 3. Add GitHub Secrets

In the repository's **Settings → Secrets and variables → Actions**, add:

| Secret | Value |
| --- | --- |
| `DO_TOKEN` | DigitalOcean API token (step 2) |
| `DO_SPACES_ACCESS_KEY` | Spaces access key (step 1) |
| `DO_SPACES_SECRET_KEY` | Spaces secret key (step 1) |
| `SSH_PRIVATE_KEY` | Private key matching the public key below |
| `SSH_PUBLIC_KEY` | Public key Terraform adds to the Droplet |
| `DO_DROPLET_IP` | Leave empty for now — `infra.yml` fills this in after the first apply |
| `DO_ENV_PROD` | Base64-encoded `.env.prod` contents (step 5) |
| `GH_PAT_SECRETS_WRITE` | A fine-grained personal access token, scoped to this repository only, with **Secrets: write** permission — used solely to let `infra.yml` update `DO_DROPLET_IP` automatically (the default `GITHUB_TOKEN` cannot write repository secrets) |

Also create a GitHub **Environment** named `production` (**Settings → Environments**)
and add at least one required reviewer. This is what makes `infra.yml` pause for manual
approval before running `terraform apply`.

## 4. Run the infra workflow (creates the Droplet)

From the **Actions** tab, run **Infrastructure** (`workflow_dispatch`). Approve the
pending deployment when prompted (the `production` Environment gate). On success, the
workflow's last step writes the new Droplet's IP to the `DO_DROPLET_IP` secret
automatically.

## 5. Create `.env.prod` and store it as a secret

Using [`.env.prod.example`](../../.env.prod.example) as a reference, prepare the real
production `.env.prod` contents locally (do not commit it). Base64-encode it and store
the result as the `DO_ENV_PROD` secret:

```sh
base64 -i .env.prod | pbcopy   # macOS; use base64 -w0 on Linux
```

Paste the copied value into `DO_ENV_PROD` (step 3). Every future deploy overwrites
`/opt/uke/.env.prod` on the Droplet with this secret's contents — to change a production
env var, update this secret and push to `master` (or re-run `deploy.yml`), rather than
editing the file on the Droplet by hand.

## 6. Run the deploy workflow (first deploy)

Push to `master` (or re-run the **CI** workflow if the latest run already succeeded) —
**Deploy** runs automatically once **CI** passes. It writes `.env.prod` from the secret,
runs `deploy.sh` over SSH, and health-checks `https://<droplet-ip>/api/health`.

## 7. Seed data

SSH in and seed the database, same as the manual flow:

```sh
ssh root@<droplet-ip>
cd /opt/uke
docker compose -f docker-compose.prod.yml --env-file .env.prod exec api npx prisma db seed
```

## 8. Update Auth0 Allowed URLs

In the Auth0 dashboard, add `https://<droplet-ip>` to the application's Allowed
Callback URLs, Allowed Logout URLs, and Allowed Web Origins — same as the manual flow
in `SETUP.md`.

## Steady state

After the above, every push to `master` that passes **CI** deploys automatically — no
further manual steps. Infrastructure changes (resizing the Droplet, changing the
firewall, etc.) go through `infra.yml`, run manually and approved via the `production`
Environment.
