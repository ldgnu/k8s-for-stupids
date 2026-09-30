# Module 8 — GitHub Actions: CI that validates and builds for you

## 1. What it is and why now and not before

GitHub Actions = running commands on a GitHub VM every time you do a `push` or `pull_request`. Without installing Jenkins.

- **CI (Integration):** validates that your YAML files are not broken and that your Dockerfile builds.
- **CD (Deployment):** applies to K8s only. We don't do it until Labs 1-2 run by hand. Automating something broken only breaks faster.

Manual first, automatic later. This module leaves CI ready and CD off.

## 2. Where workflows live

```
.github/workflows/
  ci-yaml.yaml      # en cada push: kubeconform + dry-run
  build-push.yaml   # solo si cambia saa-quiz: build + push a GHCR
```

Each file is a YAML with `on:`, `jobs:`, `steps:`. Use `actions/checkout@v4` to download your repo onto the VM.

## 3. ci-yaml.yaml explained line by line

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

What it does:
- `dry-run=client`: parses without a cluster. Catches indentation, wrong `apiVersion`, `selector` without `matchLabels`.
- `kubeconform`: validates against official schemas. Catches `port: 99999` or wrong `accessModes`.
- It runs on every branch, so a broken PR never gets into `main`. On GitHub enable `Settings -> Branches -> Require status checks`.

If it fails, read the log at `Actions -> job -> Annotation`. 90% of the time it is indentation (2 spaces, never tabs) or a nonexistent `namespace` in the YAML.

Lab:
1. Break `service.yaml` on purpose (change `port: 80` to `port: xyz`), push on a branch, watch it fail.
2. Fix it, push, watch it pass.
3. Merge only on green.

## 4. build-push.yaml explained (for saa-quiz)

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

Why this way:
- `paths:` avoids building on every docs change. Only when code changes.
- `GITHUB_TOKEN` already has `packages:write` permission, you don't need a PAT. It only works if the GHCR package is public or the cluster has `imagePullSecrets`.
- `buildx + cache gha`: the second build is 10x faster.
- You need to copy your `/home/ubuntu/saa-quiz/` into `saa-quiz-src/` in this repo (no `.db`, no `.env` with secrets, yes to `Dockerfile`, `app/`, `requirements.txt`). The `.dockerignore` already excludes `.venv`, `data/`, `*.db`.

Expected structure:
```
saa-quiz-src/
  Dockerfile
  requirements.txt
  app/
```

Test locally before Actions:
```bash
docker build -t ghcr.io/ldgnu/saa-quiz-app:test ./saa-quiz-src
docker run --rm -p 8001:8000 ghcr.io/ldgnu/saa-quiz-app:test &
curl -f http://127.0.0.1:8001/api/health
kill %1
```

## 5. CD off (for when you are ready)

Don't create `cd-apply.yaml` with `kubectl apply` from GitHub to your superserver yet. It needs a self-hosted runner or kubeconfig in Secrets, and if you do it wrong you expose admin.

When freshrss + saa-quiz have been stable for 7 days, we'll talk about:
- Self-hosted runner on Outblast (`actions-runner` with the `outblast` label).
- `cd` workflow with `environment: prod` + manual approval.
- `helm upgrade --install` instead of `kubectl apply`.

Until then, deployment = you over SSH with `kubectl apply -f`. That is manual GitOps, enough for this bootcamp.

## 6. Final bootcamp validation

- `ci-yaml` green on `main`.
- `build-push` produces `ghcr.io/ldgnu/saa-quiz-app:latest` visible in GitHub Packages.
- `kubectl -n freshrss get pods` Ready 1/1 for 3 days with real data.
- `kubectl -n saa-quiz get pods` Ready + login with the pinned Secret.
- You know how to roll back: `kubectl delete -f` + `docker start` + old npm upstream.
- You update the `README.md` table: `| freshrss | docker stop | k8s live | 2026-XX |`.

Final project: shut down ONE Docker container (freshrss) and leave K8s as the only live one for 7 days with a daily backup in `scripts/backup-volumen.sh`. If it survives, repeat with the next one. Never two at once.
