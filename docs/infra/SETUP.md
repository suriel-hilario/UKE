# Production setup — DigitalOcean

Single-Droplet production deployment for UKE. IP-based access (no domain yet — see
[Adding a domain later](#adding-a-domain-later) at the end for the Let's Encrypt switch-over).

## 1. Create the Droplet

In the DigitalOcean console:

- **Image**: Ubuntu 24.04 LTS
- **Plan**: Basic, $12/mo (2 vCPU, 2GB RAM, 50GB SSD)
- **Region**: AMS3
- **Authentication**: SSH key (add yours, or generate one and download it)

Note the Droplet's public IP once it's created — you'll need it throughout this guide as
`<droplet-ip>`.

## 2. Enable Droplet Backups

In the Droplet's **Backups** tab, enable automatic backups (+$2.40/mo). This is a
whole-disk safety net independent of `postgres_backup.sh` (step 10) — see
[design.md § D6](../../openspec/changes/add-infra-digitalocean/design.md) for why both exist.

## 3. Install dependencies

SSH in and install Docker, Docker Compose, and git:

```sh
ssh root@<droplet-ip>

apt update && apt upgrade -y
apt install -y ca-certificates curl gnupg git

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

If a build ever runs out of memory on this 2GB Droplet (unlikely for this app's size, but
possible under load), add a swap file rather than upgrading the plan:

```sh
fallocate -l 2G /swapfile && chmod 600 /swapfile
mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

## 4. Clone the repository

```sh
mkdir -p /opt/uke && cd /opt/uke
git clone <your-repo-url> .
```

## 5. Configure environment variables

```sh
cp .env.prod.example .env.prod
nano .env.prod   # fill in every value — see comments in the file
chmod 600 .env.prod
```

Notes on specific values:
- `POSTGRES_PASSWORD`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`: generate strong random values
  (e.g. `openssl rand -hex 24`).
- `S3_PUBLIC_URL`, `CORS_ORIGIN`, `APP_BASE_URL`: use `http://<droplet-ip>` (or
  `http://<droplet-ip>:9000` for `S3_PUBLIC_URL`).
- `VITE_API_URL`: leave as `/api` — do not point it at the Droplet IP directly, the API's
  own port is never exposed publicly (see [Architecture](#architecture-notes) below).
- `SMTP_*`: see [Setting up Resend](#setting-up-resend) below, or substitute the club's own
  SMTP credentials — no code change needed either way.

## 6. Configure the firewall

```sh
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw default deny incoming
ufw default allow outgoing
ufw enable
```

Verify: `ufw status` should show only OpenSSH/80/443 as `ALLOW`, everything else denied.
Postgres (5432), MinIO (9000/9001), and the API (3001) are intentionally not on this list —
they're only reachable from other containers on the Droplet's internal Docker network.

## 7. Create the MinIO buckets

The MinIO service starts empty. Create the two buckets the app needs, once, after the
first `up -d` (step 8) has MinIO running:

```sh
docker run --rm --network uke_uke-network --entrypoint sh minio/mc -c "
  mc alias set prod http://minio:9000 \$S3_ACCESS_KEY \$S3_SECRET_KEY &&
  mc mb -p prod/uke-fotos &&
  mc mb -p prod/uke-backups
"
```

(Export `S3_ACCESS_KEY`/`S3_SECRET_KEY` from `.env.prod` into your shell first, or
substitute the literal values.)

## 8. First deploy

```sh
cd /opt/uke
./deploy.sh
```

This builds all images, applies Prisma migrations, and starts every service. Once it
completes, `docker compose -f docker-compose.prod.yml ps` should show `caddy`, `api`,
`postgres`, and `minio` all running.

## 9. Seed initial data

```sh
docker compose -f docker-compose.prod.yml --env-file .env.prod exec api npx prisma db seed
```

## 10. Set up daily database backups

```sh
cp postgres_backup.sh /opt/uke/postgres_backup.sh
chmod +x /opt/uke/postgres_backup.sh
mkdir -p /backups

crontab -e
# add this line:
0 2 * * * ENV_FILE=/opt/uke/.env.prod COMPOSE_FILE=/opt/uke/docker-compose.prod.yml /opt/uke/postgres_backup.sh >> /var/log/uke-backup.log 2>&1
```

This dumps the database daily at 2am, keeps the 7 most recent dumps in `/backups/`, and
also uploads each dump to the `uke-backups` MinIO bucket (created in step 7). See
[design.md § D6](../../openspec/changes/add-infra-digitalocean/design.md) for why backups
go to both places, and why the script uses `docker compose exec`/`docker run --network`
instead of host-installed `pg_dump`/`mc` (neither Postgres nor MinIO expose a port to the
host).

## 11. Update Auth0's allowed URLs

In the Auth0 dashboard, under your application's settings, add `http://<droplet-ip>` to:

- **Allowed Callback URLs**
- **Allowed Logout URLs**
- **Allowed Web Origins**

Without this, login will fail with a "callback URL mismatch" error.

## 12. Access the app

Open `https://<droplet-ip>` in a browser. You'll see a certificate warning — this is
expected (see [Architecture notes](#architecture-notes)); accept it to continue. Log in
via Auth0 to confirm everything works end to end.

## Redeploying

For every subsequent deploy, just run `./deploy.sh` again from `/opt/uke`.

## Setting up Resend

`.env.prod.example` documents [Resend](https://resend.com) as the recommended SMTP
provider (free tier: 3,000 emails/month, sufficient for a small club):

1. Create a Resend account and verify a sending domain (or use their shared testing domain
   while you don't have one yet).
2. Create an API key.
3. Set `SMTP_HOST=smtp.resend.com`, `SMTP_PORT=587`, `SMTP_USER=resend`,
   `SMTP_PASS=<your-api-key>` in `.env.prod`.

The club's own SMTP server works as a drop-in alternative — just fill in its
host/port/user/pass instead, no code change needed.

## Architecture notes

- Caddy is the only public-facing service (ports 80/443). It serves the built frontend as
  static files and reverse-proxies `/api/*` to the `api` service on the internal Docker
  network — `api`'s port 3001 is never published to the host or the internet.
- HTTPS is self-signed (`tls internal`) because there's no domain yet — Let's Encrypt needs
  a resolvable domain to validate against. Browsers will show a trust warning; this is
  expected and temporary.

## Adding a domain later

Once you have a domain pointed at the Droplet's IP, switch the `Caddyfile` from IP-only
self-signed HTTPS to a real Let's Encrypt certificate:

1. Replace the `:80` and `:443` blocks in `Caddyfile` with a single block using your
   domain name (see the commented example at the top of the `Caddyfile` — this is a
   one-line swap, since Caddy provisions and renews Let's Encrypt certificates
   automatically for named sites, no `tls internal`/`on_demand` needed).
2. Update `CORS_ORIGIN`, `APP_BASE_URL`, and `VITE_API_URL` handling stays the same
   (`/api` is still relative) — just update `S3_PUBLIC_URL` if it should also move to the
   domain.
3. Update Auth0's Allowed Callback/Logout/Web Origins to the new `https://` domain (in
   addition to, or instead of, the IP — see step 11 above).
4. Re-run `./deploy.sh`.
