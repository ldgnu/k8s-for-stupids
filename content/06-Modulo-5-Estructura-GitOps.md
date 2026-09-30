# Módulo 5 — Estructura GitOps: cómo ordenamos este repo para no perdernos

## 1. Qué es GitOps en una frase

Git es la verdad. Lo que está en `main` es lo que debe correr. Si K8s y Git difieren, Git gana con `kubectl apply -f`.

No hacemos `kubectl edit` en producción para "probar rápido" porque se pierde. Probamos en rama, commiteamos, aplicamos desde archivo.

## 2. Estructura que usamos

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

Reglas:
- Un folder por app en `apps/NOMBRE`. Nunca mezcles dos apps en un YAML.
- Nombres de archivos en minúscula, con `namespace.yaml` siempre primero en `apply`.
- `kubectl apply -f infra/k8s/apps/freshrss/` debe funcionar sin orden manual. Por eso cada archivo lleva su `namespace:`.
- `base/` solo para cosas compartidas. Al inicio casi vacío, después StorageClass, ClusterIssuer de cert-manager.

## 3. Namespaces

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: freshrss
```

Por qué uno por app al inicio: `kubectl delete ns freshrss` limpia todo si la embarras, sin tocar `saa-quiz`. Cuando tengas 10 apps pasarás a `outblast` único + NetworkPolicies, pero ahora separar te salva.

## 4. Secrets: lo que nunca va a Git

Mal:
```yaml
stringData:
  ADMIN_PASSWORD: MiPass123
```
Y commitearlo. Queda en historia para siempre aunque lo borres después.

Bien:
- En repo: `secret.example.yaml` con `CHANGEME`.
- En cluster: creado a mano una vez:
```bash
kubectl create secret generic freshrss-admin -n freshrss \
  --from-literal=ADMIN_PASSWORD='...' \
  --dry-run=client -o yaml > /tmp/secret-real.yaml
kubectl apply -f /tmp/secret-real.yaml
rm /tmp/secret-real.yaml
```

`.gitignore` ya bloquea `*secret*.yaml`, pero deja pasar `secret.example.yaml` a propósito para documentar qué variables espera el Deployment sin exponer valores.

## 5. Etiquetas y nombres

Siempre:
```yaml
metadata:
  labels: {app: freshrss}
spec:
  selector: {matchLabels: {app: freshrss}}
  template:
    metadata: {labels: {app: freshrss}}
```

Si `selector` y `labels` no coinciden, el Service no encuentra Pods y `kubectl get endpoints` sale vacío. Es el error número 1 de novatos.

Nombres DNS: minúsculas, guiones, máximo 63. `FreshRSS` no vale, `freshrss` sí.

## 6. Cómo se aplica en orden

```bash
kubectl apply -f infra/k8s/base/
kubectl apply -f infra/k8s/apps/freshrss/
kubectl -n freshrss get pods,svc,pvc
```

`apply` es idempotente: lo corres 10 veces y queda igual. Guarda siempre el output en tu runbook si dice `created` vs `configured` vs `unchanged`.

Rollback a Docker si K8s falla:
```bash
kubectl delete -f infra/k8s/apps/freshrss/  # o delete ns
docker start freshrss
# nginx-proxy-manager sigue apuntando al Docker viejo hasta que cambies upstream
```

## 7. Validación

- Explicas por qué `main` debe ser aplicable con un solo `apply -f`.
- Sabes crear un Secret sin commitearlo.
- Sabes por qué un Service con `endpoints: <none>` es problema de labels.
