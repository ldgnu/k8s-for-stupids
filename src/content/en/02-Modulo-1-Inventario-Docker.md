# Module 1 — Docker inventory: what you have today in Outblast and why

## 1. Goal

Before installing Kubernetes, know exactly what runs, where it stores data, and how it's exposed. Without this you migrate blind and lose passwords or databases.

Your server: Oracle Cloud, Ubuntu 26.04, 2 CPUs, 12 GB RAM, 145 GB disk. A single host. All Docker on that host. If that host dies, everything dies. That's the reason for this bootcamp.

## 2. The 3 layers you have (read your `01-inventario-superserver.md` while you read)

### Edge layer — how the internet gets in

- `nginx-proxy-manager (jc21/nginx-proxy-manager)` ports `80,443,81`. It's an Nginx with a web panel on `:81`. You create `rss.tudominio.com -> freshrss:80` and it does reverse proxy + Let's Encrypt. Without it you'd have to expose 26 ports and 26 certificates.
- `cloudflare/cloudflared`. Outbound tunnel to Cloudflare. Your IP doesn't receive direct connections, Cloudflare brings them in from inside. That's why `saa-quiz` publishes `127.0.0.1:8000:8000` and not `0.0.0.0:8000`. Localhost + tunnel only.
- `web (nginx:alpine)` and `solisjavier-site-solisjavier-site`. Static sites. The easiest to migrate when the time comes, but not now.

Why it matters for K8s: when you install k3s, its default Ingress (Traefik) also wants 80/443 and clashes with nginx-proxy-manager. That's why we'll install it with `--disable traefik`. You'll keep your current edge until the end.

### Apps layer — what you use

- `freshrss/freshrss:latest` internal port 80. RSS reader. Stores in `/var/www/FreshRSS/data`. If you lose that volume, you lose feeds and users. It's our Lab 1 because it's an official, documented image with no build.
- `vaultwarden/server:latest` internal port 80. Bitwarden clone in Rust + SQLite. Critical. It has its own `vaultwarden-internal` network. Don't touch it until you know backups.
- `linkwarden + linkwarden-db (postgres:16-alpine)`. Two containers that talk to each other. Linkwarden stores links, postgres stores everything in `/var/lib/postgresql/data`. First app with a separate database. It teaches you that in K8s they'll be two Deployments + one internal Service.
- `zadam/trilium` port 8080. Notes. Internal SQLite.
- `n8nio/n8n` port 5678. Automations. Stores workflows in a volume. If you update it badly with watchtower, you break workflows.
- `deluan/navidrome` 4533 + `lscr.io/linuxserver/lidarr` 8686. Music. They mount your host music folder. In K8s that's a `hostPath`, which is awkward and tied to the node. They migrate last.
- `ghcr.io/gethomepage/homepage` 3000. Dashboard. It only reads configs.
- `saa-quiz-app` 127.0.0.1:8000. Own Python app with `build: .`, sqlite at `/app/data/saa_quiz.db`, `read_only:true`, `cap_drop: ALL`. You already have its compose in `docs/compose-original/saa-quiz/docker-compose.yml`. It's Lab 2 because it forces you to use a registry (GHCR) and Secrets.
- `excalidraw`, `openspeedtest`, `louislam/uptime-kuma` 3001, `ghcr.io/tashfeenahmed/freellmapi` 3001. Utilities with no important state.

### Ops layer — how you care for it today

- `portainer/portainer-ce` 9000/9443. Docker web panel. Most of your containers were probably created from here as Stacks, not with compose on disk. That's why `find ... compose.yml` only found one.
- `ghcr.io/nicholas-fedor/watchtower` 8080. Watches Docker Hub and updates on its own. Convenient but dangerous: it can change `postgres:16` or `n8n:latest` without warning and break DB compatibility.
- `henrygd/beszel + beszel-agent`, `prom/node-exporter`, `prom/alertmanager + alert-telegram`. Metrics and Telegram alerts. `monitoring_internal` network so only they talk to each other.
- In `docker images` you see `grafana/grafana`, `prom/prometheus`, `cAdvisor`, `python:3.11-slim` but not in `docker ps`. They were running and today they're stopped or failed. Note them as debt: you need to see why they died before migrating them.

## 3. Why `docker volume ls` lies to you

You saw only 2 volumes for 26 containers. It's not that they have no data, it's that they use **bind mounts**: `- /home/ubuntu/data:/data` instead of `- nombre:/data`. Binds don't show up in `volume ls`, only in `docker inspect`.

For each app you're going to migrate you need all three:
```bash
docker inspect freshrss --format '{{json .Mounts}}' | python3 -m json.tool
docker inspect freshrss --format '{{json .Config.Env}}' | python3 -m json.tool
docker inspect freshrss --format '{{json .HostConfig.PortBindings}}' | python3 -m json.tool
docker logs freshrss --tail 50
```

- `Mounts.Source` = where it is on the host today (`/var/lib/docker/volumes/...` or `/home/...`).
- `Mounts.Destination` = where the app sees it inside (`/app/data`, `/var/www/...`).
- `Env` = passwords and URLs. If you see an empty `ADMIN_PASSWORD=`, note it: in K8s you'll have to pin it.
- `PortBindings` = `127.0.0.1:8000->8000` vs `0.0.0.0:80->80`. It tells you whether it's public or tunnel-only.

Also look for Portainer Stacks:
```bash
ls -la /home/ubuntu/ /opt/ /srv/ /data/ 2>/dev/null
find /home /opt /root -maxdepth 4 -name "*compose*.y*ml" 2>/dev/null
ls /var/lib/docker/volumes/
```

## 4. Lab for this module

1. Complete `docs/01-inventario-superserver.md` with redacted IP (`132.145.xxx.xxx`), date with year, and close the ``` blocks.
2. Copy each compose you find to `docs/compose-original/NOMBRE/docker-compose.yml` as-is, without editing.
3. For `freshrss` paste Mounts, Env, PortBindings and the last 30 log lines into `docs/02-arquitectura-actual-docker.md` under the `## freshrss` heading.
4. Commit:
```bash
git add docs/
git commit -m "docs: inventario freshrss completo"
git push
```

## 5. Validation

- You can say for `freshrss`, `vaultwarden` and `saa-quiz`: where do they store data? What internal port? How are they exposed?
- You can explain why `saa-quiz` uses `127.0.0.1` and `vaultwarden` uses an internal network.
- `docs/compose-original/` has at least `saa-quiz/docker-compose.yml` and whatever you find for freshrss.

Without this, Module 6 will ask you for data you don't have.
