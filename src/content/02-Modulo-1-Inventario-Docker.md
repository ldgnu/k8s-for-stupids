# Módulo 1 — Inventario Docker: qué tienes hoy en Outblast y por qué

## 1. Objetivo

Antes de instalar Kubernetes, saber exactamente qué corre, dónde guarda datos y cómo se expone. Sin esto migras a ciegas y pierdes passwords o bases.

Tu servidor: Oracle Cloud, Ubuntu 26.04, 2 CPU, 12 GB RAM, 145 GB disco. Un solo host. Todo Docker en ese host. Si ese host muere, muere todo. Esa es la razón del bootcamp.

## 2. Las 3 capas que tienes (lee tu `01-inventario-superserver.md` mientras lees)

### Capa borde — cómo entra internet

- `nginx-proxy-manager (jc21/nginx-proxy-manager)` puertos `80,443,81`. Es un Nginx con panel web en `:81`. Tú creas `rss.tudominio.com -> freshrss:80` y él hace reverse proxy + Let's Encrypt. Sin él tendrías que exponer 26 puertos y 26 certificados.
- `cloudflare/cloudflared`. Túnel saliente a Cloudflare. Tu IP no recibe conexiones directas, Cloudflare las trae por dentro. Por eso `saa-quiz` publica `127.0.0.1:8000:8000` y no `0.0.0.0:8000`. Solo localhost + túnel.
- `web (nginx:alpine)` y `solisjavier-site-solisjavier-site`. Webs estáticas. Las más fáciles de migrar cuando toque, pero no ahora.

Por qué importa para K8s: cuando instales k3s, su Ingress por defecto (Traefik) también quiere 80/443 y choca con nginx-proxy-manager. Por eso lo instalaremos con `--disable traefik`. Mantendremos tu borde actual hasta el final.

### Capa apps — lo que usas

- `freshrss/freshrss:latest` puerto 80 interno. Lector RSS. Guarda en `/var/www/FreshRSS/data`. Si pierdes ese volumen, pierdes feeds y usuarios. Es nuestro Lab 1 porque es imagen oficial, documentada, sin build.
- `vaultwarden/server:latest` puerto 80 interno. Clon de Bitwarden en Rust + SQLite. Crítico. Tiene `vaultwarden-internal` network propia. No lo tocamos hasta que sepas backups.
- `linkwarden + linkwarden-db (postgres:16-alpine)`. Dos containers que se hablan. Linkwarden guarda links, postgres guarda todo en `/var/lib/postgresql/data`. Primera app con base separada. Te enseña que en K8s serán dos Deployments + un Service interno.
- `zadam/trilium` puerto 8080. Notas. SQLite interno.
- `n8nio/n8n` puerto 5678. Automatizaciones. Guarda workflows en volumen. Si lo actualizas mal con watchtower, rompes workflows.
- `deluan/navidrome` 4533 + `lscr.io/linuxserver/lidarr` 8686. Música. Montan tu carpeta de música del host. En K8s eso es un `hostPath`, que es incómodo y atado al nodo. Se migran últimos.
- `ghcr.io/gethomepage/homepage` 3000. Dashboard. Solo lee configs.
- `saa-quiz-app` 127.0.0.1:8000. App Python propia con `build: .`, sqlite en `/app/data/saa_quiz.db`, `read_only:true`, `cap_drop: ALL`. Ya tienes su compose en `docs/compose-original/saa-quiz/docker-compose.yml`. Es Lab 2 porque te obliga a usar registry (GHCR) y Secrets.
- `excalidraw`, `openspeedtest`, `louislam/uptime-kuma` 3001, `ghcr.io/tashfeenahmed/freellmapi` 3001. Utilidades sin estado importante.

### Capa ops — cómo lo cuidas hoy

- `portainer/portainer-ce` 9000/9443. Panel web de Docker. La mayoría de tus containers probablemente se crearon desde acá como Stacks, no con compose en disco. Por eso `find ... compose.yml` solo encontró uno.
- `ghcr.io/nicholas-fedor/watchtower` 8080. Vigila Docker Hub y actualiza solo. Cómodo pero peligroso: te puede cambiar `postgres:16` o `n8n:latest` sin aviso y romper compatibilidad de DB.
- `henrygd/beszel + beszel-agent`, `prom/node-exporter`, `prom/alertmanager + alert-telegram`. Métricas y alertas a Telegram. Red `monitoring_internal` para que solo ellos hablen.
- En `docker images` ves `grafana/grafana`, `prom/prometheus`, `cAdvisor`, `python:3.11-slim` pero no en `docker ps`. Estuvieron corriendo y hoy están parados o fallaron. Anótalos como deuda: hay que ver por qué murieron antes de migrarlos.

## 3. Por qué `docker volume ls` te miente

Viste solo 2 volúmenes para 26 containers. No es que no tengan datos, es que usan **bind mounts**: `- /home/ubuntu/data:/data` en vez de `- nombre:/data`. Los binds no salen en `volume ls`, solo en `docker inspect`.

Para cada app que vayas a migrar necesitas los tres:
```bash
docker inspect freshrss --format '{{json .Mounts}}' | python3 -m json.tool
docker inspect freshrss --format '{{json .Config.Env}}' | python3 -m json.tool
docker inspect freshrss --format '{{json .HostConfig.PortBindings}}' | python3 -m json.tool
docker logs freshrss --tail 50
```

- `Mounts.Source` = dónde está en el host hoy (`/var/lib/docker/volumes/...` o `/home/...`).
- `Mounts.Destination` = dónde lo ve la app adentro (`/app/data`, `/var/www/...`).
- `Env` = passwords y URLs. Si ves `ADMIN_PASSWORD=` vacío, anótalo: en K8s habrá que fijarlo.
- `PortBindings` = `127.0.0.1:8000->8000` vs `0.0.0.0:80->80`. Te dice si es público o solo túnel.

También busca Stacks de Portainer:
```bash
ls -la /home/ubuntu/ /opt/ /srv/ /data/ 2>/dev/null
find /home /opt /root -maxdepth 4 -name "*compose*.y*ml" 2>/dev/null
ls /var/lib/docker/volumes/
```

## 4. Lab de este módulo

1. Completa `docs/01-inventario-superserver.md` con IP redactada (`132.145.xxx.xxx`), fecha con año, y cierra los bloques ```.
2. Copia cada compose que encuentres a `docs/compose-original/NOMBRE/docker-compose.yml` tal cual, sin editar.
3. Para `freshrss` pega Mounts, Env, PortBindings y últimas 30 líneas de log en `docs/02-arquitectura-actual-docker.md` bajo título `## freshrss`.
4. Commit:
```bash
git add docs/
git commit -m "docs: inventario freshrss completo"
git push
```

## 5. Validación

- Sabes decir para `freshrss`, `vaultwarden` y `saa-quiz`: ¿dónde guardan datos? ¿qué puerto interno? ¿cómo se exponen?
- Sabes explicar por qué `saa-quiz` usa `127.0.0.1` y `vaultwarden` usa red interna.
- `docs/compose-original/` tiene al menos `saa-quiz/docker-compose.yml` y lo que encuentres de freshrss.

Sin esto, el Módulo 6 te va a pedir datos que no tienes.
