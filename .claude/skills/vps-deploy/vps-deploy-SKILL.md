---
name: vps-deploy
description: >
  Deploy the ai-curriculum (pathfinder.ai) application to the production VPS server.
  Use this skill whenever the user says "deploy", "push to server", "update the VPS",
  "ship it", "send to production", "deploy to production", "push to prod",
  "update production", or after committing changes when the user wants them live.
  Also use when the user asks about server status, PM2 logs, or restarting the app
  on the VPS. This skill handles both frontend-rebuild deploys and server-only restarts.
---

# VPS Deployment Skill

Deploy the pathfinder.ai app to the DigitalOcean VPS at `64.225.43.233`.

## SSH Connection

```
ssh ai-curriculum-vps
```

This uses the SSH config alias. The project lives at `/root/ai-curriculum` on the VPS.

**If the alias doesn't exist yet**, add this to `~/.ssh/config`:
```
Host ai-curriculum-vps
  HostName 64.225.43.233
  User root
  IdentityFile ~/.ssh/vps_deploy
```

**If SSH key auth isn't set up:**
```bash
ssh-keygen -t ed25519 -f ~/.ssh/vps_deploy -N ""
ssh-copy-id -i ~/.ssh/vps_deploy.pub root@64.225.43.233
```
Note: the `vps_deploy` key is already set up for the project-tracker VPS — if that works, the same key and alias IP will work here.

## Deciding What to Deploy

Before deploying, look at what changed (recent commits or staged files).

### Full deploy (frontend rebuild + server restart) if ANY of these changed:
- `src/frontend/` — any file in the React app
- `src/frontend/package.json` — frontend dependencies
- `src/frontend/vite.config.js` — build config

### Server-only restart (no rebuild) if changes are limited to:
- `src/server/` — Express routes or recommendation logic
- `src/data/curriculum.json` — course data (read at server startup)
- `ecosystem.config.js` — PM2 config
- `package.json` — root dependencies

### No deploy needed:
- `README.md`, `CLAUDE.md`, docs-only changes
- `.gitignore` changes
- Skill files

## Deployment Steps

### Step 1: Commit and push any outstanding changes

```bash
git status
```

**If there are uncommitted changes:**
1. Stage everything: `git add .`
2. Generate a concise commit message from the diff
3. Commit: `git commit -m "your message"`
4. Push: `git push`

**If there are committed but unpushed changes:**
1. `git push`

**If already clean and pushed:** continue to Step 2.

Do NOT ask the user whether to commit — they said "deploy," which means ship everything.

### Step 2: Deploy to VPS

#### Server-only restart (no frontend changes):

```bash
ssh ai-curriculum-vps << 'DEPLOY'
cd /root/ai-curriculum
git pull
npm ci --omit=dev
pm2 restart ai-curriculum
pm2 logs ai-curriculum --lines 15 --nostream
DEPLOY
```

#### Full deploy with frontend rebuild:

```bash
ssh ai-curriculum-vps << 'DEPLOY'
cd /root/ai-curriculum
git pull
npm ci
cd src/frontend && npm ci && cd ../..
npm run build
pm2 reload ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production
pm2 logs ai-curriculum --lines 15 --nostream
DEPLOY
```

### Step 3: First-time setup (only needed once)

If `/root/ai-curriculum` doesn't exist on the VPS yet:

```bash
ssh ai-curriculum-vps << 'SETUP'
git clone https://github.com/jeffwarr4/ai-curriculum.git /root/ai-curriculum
cd /root/ai-curriculum
npm ci
cd src/frontend && npm ci && cd ../..
npm run build
pm2 start ecosystem.config.js --env production
pm2 save
SETUP
```

### Step 4: Verify

After deployment, check `pm2 logs` output for errors. If the app started cleanly, report success. Common things to check:
- `Server running on http://localhost:3001` — app is up
- No `Error:` or `Cannot find module` lines
- If you see `EADDRINUSE`, there's a port conflict: `pm2 delete ai-curriculum && pm2 start ecosystem.config.js --env production`

## Other Server Operations

**Check status:**
```bash
ssh ai-curriculum-vps "cd /root/ai-curriculum && pm2 status"
```

**View recent logs:**
```bash
ssh ai-curriculum-vps "cd /root/ai-curriculum && pm2 logs ai-curriculum --lines 30 --nostream"
```

**Restart without pulling new code:**
```bash
ssh ai-curriculum-vps "pm2 restart ai-curriculum"
```

**Check disk space:**
```bash
ssh ai-curriculum-vps "df -h / && du -sh /root/ai-curriculum"
```

**Check Nginx is routing learn.good-yute.com correctly:**
```bash
ssh ai-curriculum-vps "nginx -t && systemctl status nginx"
```

## Important Notes

- Never modify `.env` or secrets on the VPS via SSH — the user manages these manually.
- `feedback.json` is written locally on the VPS and is gitignored — `git pull` will not overwrite it.
- If `npm ci` fails on the 1GB VPS with `ENOMEM` or `Killed`, the server may need swap space. Flag this if it occurs.
- PM2 is configured to auto-start on reboot via `pm2 startup` — `pm2 restart` is sufficient for deploys.
- The `learn.good-yute.com` domain must point to `64.225.43.233` via DNS (A record). Verify with `dig learn.good-yute.com` if the site isn't reachable after deploy.
