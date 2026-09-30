# Módulo 8 — GitHub Actions: CI que valida y construye por ti

## 1. Qué es y por qué ahora y no antes

GitHub Actions = correr comandos en una VM de GitHub cada vez que haces `push` o `pull_request`. Sin instalar Jenkins.

- **CI (Integración):** valida que tus YAML no estén rotos y que tu Dockerfile construya.
- **CD (Despliegue):** aplica a K8s solo. No lo hacemos hasta que Labs 1-2 anden a mano. Automatizar algo roto solo rompe más rápido.

Primero manual, después automático. Este módulo deja CI listo y CD apagado.

## 2. Dónde viven los workflows

```
.github/workflows/
  ci-yaml.yaml      # en cada push: kubeconform + dry-run
  build-push.yaml   # solo si cambia saa-quiz: build + push a GHCR
```

Cada archivo es un YAML con `on:`, `jobs:`, `steps:`. Usa `actions/checkout@v4` para bajar tu repo en la VM.

## 3. ci-yaml.yaml explicado línea por línea

```yaml
name: ci-yaml
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Instala kubectl
        uses: azure/setup-kubectl@v4
        with: {version: latest}

      - name: Dry-run freshrss
        run: |
          kubectl apply --dry-run=client -f infra/k8s/apps/freshrss/ -o yaml > /dev/null
          echo "freshrss OK"

      - name: Dry-run saa-quiz
        run: |
          kubectl apply --dry-run=client -f infra/k8s/apps/saa-quiz/ -o yaml > /dev/null
          echo "saa-quiz OK"

      - name: Kubeconform (schema real)
        uses: yannh/kubeconform-action@v2
        with:
          files: infra/k8s/apps/
```

Qué hace:
- `dry-run=client`: parsea sin cluster. Atrapa indentación, `apiVersion` mal, `selector` sin `matchLabels`.
- `kubeconform`: valida contra schemas oficiales. Atrapa `port: 99999` o `accessModes` mal.
- Corre en cada rama, así un PR roto no entra a `main`. En GitHub activa `Settings -> Branches -> Require status checks`.

Si falla, lee el log en `Actions -> job -> Annotation`. 90% es indentación (2 espacios, nunca tabs) o `namespace` inexistente en el YAML.

Lab:
1. Rompe a propósito `service.yaml` (cambia `port: 80` por `port: xyz`), push en rama, mira fallar.
2. Arregla, push, mira pasar.
3. Merge solo en verde.

## 4. build-push.yaml explicado (para saa-quiz)

```yaml
name: build-push-saa-quiz
on:
  push:
    branches: [main]
    paths:
      - saa-quiz-src/**
      - .github/workflows/build-push.yaml
jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/build-push-action@v5
        with:
          context: ./saa-quiz-src
          push: true
          tags: ghcr.io/ldgnu/saa-quiz-app:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

Por qué así:
- `paths:` evita construir en cada cambio de docs. Solo cuando cambia código.
- `GITHUB_TOKEN` ya tiene permiso `packages:write`, no necesitas PAT. Solo funciona si el package GHCR es público o el cluster tiene `imagePullSecrets`.
- `buildx + cache gha`: segundo build es 10x más rápido.
- Necesitas copiar tu `/home/ubuntu/saa-quiz/` a `saa-quiz-src/` en este repo (sin `.db`, sin `.env` con secretos, sí `Dockerfile`, `app/`, `requirements.txt`). El `.dockerignore` ya excluye `.venv`, `data/`, `*.db`.

Estructura esperada:
```
saa-quiz-src/
  Dockerfile
  requirements.txt
  app/
```

Prueba local antes de Actions:
```bash
docker build -t ghcr.io/ldgnu/saa-quiz-app:test ./saa-quiz-src
docker run --rm -p 8001:8000 ghcr.io/ldgnu/saa-quiz-app:test &
curl -f http://127.0.0.1:8001/api/health
kill %1
```

## 5. CD apagado (para cuando estés listo)

No crees aún `cd-apply.yaml` con `kubectl apply` desde GitHub a tu superserver. Necesita self-hosted runner o kubeconfig en Secrets, y si lo haces mal expones admin.

Cuando freshrss + saa-quiz lleven 7 días estables, hablamos de:
- Runner self-hosted en Outblast (`actions-runner` con label `outblast`).
- Workflow `cd` con `environment: prod` + aprobación manual.
- `helm upgrade --install` en vez de `kubectl apply`.

Hasta entonces, despliegue = tú por SSH con `kubectl apply -f`. Eso es GitOps manual, suficiente para este bootcamp.

## 6. Validación final del bootcamp

- `ci-yaml` en verde en `main`.
- `build-push` genera `ghcr.io/ldgnu/saa-quiz-app:latest` visible en GitHub Packages.
- `kubectl -n freshrss get pods` Ready 1/1 por 3 días con datos reales.
- `kubectl -n saa-quiz get pods` Ready + login con Secret fijado.
- Sabes hacer rollback: `kubectl delete -f` + `docker start` + npm upstream viejo.
- Actualizas `README.md` tabla: `| freshrss | docker stop | k8s live | 2026-XX |`.

Proyecto final: apaga UN container Docker (freshrss) y deja K8s como único vivo por 7 días con backup diario en `scripts/backup-volumen.sh`. Si sobrevive, repite con el siguiente. Nunca dos a la vez.
