#!/bin/bash
set -e

echo "==> Pulling latest code"
git pull origin main

echo "==> Installing server dependencies"
npm ci

echo "==> Installing frontend dependencies"
cd src/frontend && npm ci && cd ../..

echo "==> Building frontend"
npm run build

echo "==> Reloading app with PM2"
pm2 reload ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production

echo "==> Done. App running at http://localhost:3001"
