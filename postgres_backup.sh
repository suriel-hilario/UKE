#!/bin/sh
set -e

# Runs on the Droplet host via cron. Neither `postgres` nor `minio` publish a
# port to the host (only Caddy's 80/443 are public) — so this script reaches
# both services through the shared Docker network (`docker exec` for Postgres,
# a one-off `minio/mc` container for MinIO) rather than assuming host-network
# access to either.

: "${ENV_FILE:=/opt/uke/.env.prod}"
: "${COMPOSE_FILE:=/opt/uke/docker-compose.prod.yml}"
: "${COMPOSE_PROJECT:=uke}"
: "${BACKUP_DIR:=/backups}"
: "${RETENTION:=7}"
: "${MINIO_BUCKET:=uke-backups}"
: "${MINIO_NETWORK:=${COMPOSE_PROJECT}_uke-network}"

# shellcheck disable=SC1090
[ -f "$ENV_FILE" ] && . "$ENV_FILE"

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DUMP_FILE="$BACKUP_DIR/uke-${TIMESTAMP}.sql.gz"

echo "Backing up database '${POSTGRES_DB}' to ${DUMP_FILE}..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$DUMP_FILE"

echo "Uploading ${DUMP_FILE} to MinIO bucket '${MINIO_BUCKET}'..."
docker run --rm --network "$MINIO_NETWORK" \
  -v "$BACKUP_DIR:/backups:ro" \
  --entrypoint sh \
  minio/mc -c "
    mc alias set backupsrc http://minio:9000 '${S3_ACCESS_KEY}' '${S3_SECRET_KEY}' >/dev/null &&
    mc mb -p backupsrc/${MINIO_BUCKET} >/dev/null 2>&1 || true &&
    mc cp /backups/$(basename "$DUMP_FILE") backupsrc/${MINIO_BUCKET}/$(basename "$DUMP_FILE")
  "

echo "Applying local retention (keep last ${RETENTION})..."
ls -1t "$BACKUP_DIR"/uke-*.sql.gz 2>/dev/null | tail -n "+$((RETENTION + 1))" | xargs -r rm -f

echo "Backup complete: $(basename "$DUMP_FILE")"
