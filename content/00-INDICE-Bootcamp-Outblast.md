# OUTBLAST Bootcamp — De Docker suelto a Kubernetes con GitHub Actions
## De 26 containers que no entiendes del todo a SRE que sí entiende todo.

**Duración estimada:** 14 días, 1 hora por día.
**Método:** leer, ejecutar, validar, commitear. Si la validación falla, no avanzas.
**Repo:** `outblast-migrate-k8s`. Todo lo que hagas queda acá.

### Mapa del curso

- `01-Modulo-0-Git-GitHub.md` — Tu cuaderno de ingeniero. Sin esto no hay bootcamp. Ramas, commits, PRs, cómo no subir secretos.
- `02-Modulo-1-Inventario-Docker.md` — Qué tienes hoy en Outblast y por qué está ahí. Capa por capa: borde, apps, monitoreo. Cómo leer `docker inspect` de verdad.
- `03-Modulo-2-Historia-y-Conceptos-Kubernetes.md` — Quién inventó Kubernetes y por qué. Borg, Omega, CNCF. Qué es Cluster, Node, Pod, Deployment, Service, Ingress, PVC, ConfigMap, Secret, Probe. Tabla de traducción Docker -> K8s.
- `04-Modulo-3-Instalacion-k3s-kubectl.md` — Instalación conviviendo con Docker. Por qué k3s sin Traefik, kubeconfig, kubectl, k9s, helm. Cómo desinstalar si la embarras. Puertos y firewall de Oracle.
- `05-Modulo-4-kubectl-supervivencia.md` — Los 20 comandos que vas a usar el 95% del tiempo. Crear, ver, loguear, describir, port-forward, exec, borrar. Lab del nginx que se auto-cura.
- `06-Modulo-5-Estructura-GitOps.md` — Cómo ordenamos este repo para que `main` siempre sea aplicable. Namespaces, base vs apps, secret.example, por qué Git nunca guarda passwords.
- `07-Modulo-6-FreshRSS.md` — Tu primera migración real. Imagen oficial, 1 volumen, puerto 80. PVC, Deployment, Service, port-forward, migración de datos, rollback a Docker.
- `08-Modulo-7-SaaQuiz-y-GHCR.md` — Segunda migración, nivel medio. Imagen propia con `build: .`, sqlite, readOnly, secrets vacíos que te van a romper en K8s si no los fijas. Cómo subir a GHCR.
- `09-Modulo-8-GitHub-Actions.md` — CI/CD para no hacerlo a mano. `ci-yaml` que valida, `build-push` que construye y sube. Self-hosted runner después, no ahora.

### Reglas del bootcamp

1. Un módulo = una hoja. Léela entera antes de tocar terminal.
2. Todo cambio en `infra/` o `docs/` va con commit `docs:`, `k8s:`, `ci:`.
3. Nunca dos migraciones el mismo día. Nunca apagar Docker sin 3 días estable en K8s.
4. Si algo no entiendes, lo anotas en `docs/04-decisiones.md` como pregunta, no lo salteas.

### Estado actual

- [x] M0 empezado (ya hiciste push a main)
- [x] M1 a medias (tienes `01-inventario-superserver.md` con `docker ps`)
- [ ] M2 leer
- [ ] M3 instalar
- [ ] M4 practicar
- [ ] M6 migrar freshrss

Empieza por `01-Modulo-0-Git-GitHub.md`.
