#!/bin/sh
set -e

echo "Pulling latest code..."
git pull origin master

echo "Building images..."
docker compose -f docker-compose.prod.yml --env-file .env.prod build

echo "Applying database migrations..."
docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm api npx prisma migrate deploy

echo "Starting services..."
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

echo "Deploy complete"
