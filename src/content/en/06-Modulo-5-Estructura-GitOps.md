# Module 5 — GitOps Structure: how we organize this repo so you don't get lost

## 1. What GitOps is in one sentence

Git is the truth. What is in `main` is what should be running. If K8s and Git differ, Git wins with `kubectl apply -f`.

We don't run `kubectl edit` in production for a "quick test" because it gets lost. We test on a branch, commit, apply from file.

## 2. Structure we use

```
outblast-migrate-k8s/
  README.md                    # tabla de estado: App | Docker | K8s | Dueño
  docs/
    bootcamp/                  # este curso
    01-inventario-superserver.md
    02-arquitectura-actual-docker.md
    compose-original/          # copias tal cual del servidor, sin editar
      saa-quiz/docker-compose.yml
      freshrss/                # cuando lo encuentres
  infra/k8s/
    base/
      namespaces.yaml          # freshrss, saa-quiz
    apps/
      freshrss/
        namespace.yaml
        pvc.yaml
        deployment.yaml
        service.yaml
        secret.example.yaml
        README.md              # cómo migrar datos y rollback
      saa-quiz/
        ... lo mismo
  .github/workflows/
    ci-yaml.yaml
    build-push.yaml
  scripts/
    backup-volumen.sh
    restore-volumen.sh
```

Rules:
- One folder per app in `apps/NAME`. Never mix two apps in one YAML.
- File names in lowercase, with `namespace.yaml` always first in `apply`.
- `kubectl apply -f infra/k8s/apps/freshrss/` must work without manual ordering. That's why each file carries its own `namespace:`.
- `base/` only for shared things. Almost empty at first, later StorageClass, cert-manager ClusterIssuer.

## 3. Namespaces

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: freshrss
```

Why one per app at first: `kubectl delete ns freshrss` wipes everything if you mess up, without touching `saa-quiz`. When you have 10 apps you'll move to a single `outblast` + NetworkPolicies, but right now separating saves you.

## 4. Secrets: what never goes to Git

Bad:
```yaml
stringData:
  ADMIN_PASSWORD: MiPass123
```
And committing it. It stays in history forever even if you delete it later.

Good:
- In the repo: `secret.example.yaml` with `CHANGEME`.
- In the cluster: created by hand once:
```bash
kubectl create secret generic freshrss-admin -n freshrss \
  --from-literal=ADMIN_PASSWORD='...' \
  --dry-run=client -o yaml > /tmp/secret-real.yaml
kubectl apply -f /tmp/secret-real.yaml
rm /tmp/secret-real.yaml
```

`.gitignore` already blocks `*secret*.yaml`, but deliberately lets `secret.example.yaml` through to document which variables the Deployment expects without exposing values.

## 5. Labels and names

Always:
```yaml
metadata:
  labels: {app: freshrss}
spec:
  selector: {matchLabels: {app: freshrss}}
  template:
    metadata: {labels: {app: freshrss}}
```

If `selector` and `labels` don't match, the Service can't find the Pods and `kubectl get endpoints` comes out empty. It's the number 1 rookie mistake.

DNS names: lowercase, hyphens, max 63 chars. `FreshRSS` is invalid, `freshrss` is valid.

## 6. How to apply in order

```bash
kubectl apply -f infra/k8s/base/
kubectl apply -f infra/k8s/apps/freshrss/
kubectl -n freshrss get pods,svc,pvc
```

`apply` is idempotent: you run it 10 times and it stays the same. Always save the output in your runbook whether it says `created` vs `configured` vs `unchanged`.

Rollback to Docker if K8s fails:
```bash
kubectl delete -f infra/k8s/apps/freshrss/  # o delete ns
docker start freshrss
# nginx-proxy-manager sigue apuntando al Docker viejo hasta que cambies upstream
```

## 7. Validation

- Explain why `main` must be deployable with a single `apply -f`.
- You know how to create a Secret without committing it.
- You know why a Service with `endpoints: <none>` is a labels problem.
