# Módulo 7 — Lab 2: saa-quiz, imagen propia + GHCR + Secrets

## 1. Por qué es nivel medio

Ya tienes su compose en `docs/compose-original/saa-quiz/docker-compose.yml`. Repasemos lo que te va a exigir:

```yaml
build: .
ports: ["127.0.0.1:8000:8000"]
environment:
  DATABASE_URL: sqlite:////app/data/saa_quiz.db
  DATA_DIR: /app/data
  JWT_SECRET_KEY: ${JWT_SECRET_KEY:-}
  ADMIN_PASSWORD: ${ADMIN_PASSWORD:-}
volumes: [saa_data:/app/data]
read_only: true
tmpfs: [/tmp]
cap_drop: [ALL]
healthcheck: http://127.0.0.1:8000/api/health
limits: {cpus: 1.0, memory: 512M}
```

Diferencias con freshrss:
- No hay imagen pública. K8s no hace `build`, solo `pull`. Tienes que subirla a GHCR.
- `read_only:true` + `cap_drop` = tienes que traducir a `securityContext`.
- Secrets vacíos hoy. En Docker funciona porque genera aleatorios en `/app/data` y nunca los pierde. En K8s si recreas el PVC pierdes login y JWT. Hay que fijarlos.
- Solo localhost. En K8s será ClusterIP + port-forward primero.

Lee también `Dockerfile` y `.env.example`:
```bash
cat /home/ubuntu/saa-quiz/Dockerfile
cat /home/ubuntu/saa-quiz/.env.example
ls -lh /home/ubuntu/saa-quiz/*.db /var/lib/docker/volumes/saa-quiz_saa_data/_data/
```

## 2. Subir imagen a GHCR (una vez, a mano, después lo hace Actions)

En `/home/ubuntu/saa-quiz`:

```bash
docker build -t ghcr.io/ldgnu/saa-quiz-app:latest .
docker run --rm -p 8001:8000 ghcr.io/ldgnu/saa-quiz-app:latest &
curl -f http://127.0.0.1:8001/api/health
kill %1

echo $GITHUB_TOKEN | docker login ghcr.io -u ldgnu --password-stdin
# El token es un PAT classic con scope write:packages. Créalo en GitHub Settings -> Developer -> PAT.
docker push ghcr.io/ldgnu/saa-quiz-app:latest
```

Si `push` dice `denied`, el repo GHCR es privado y no hiciste login, o el nombre no es `ghcr.io/TU_USER/...` exacto. Si tu imagen local se llama `saa-quiz-app:latest` sin prefijo, etiqueta: `docker tag saa-quiz-app:latest ghcr.io/ldgnu/saa-quiz-app:latest`.

Desde ahora el Deployment usa `ghcr.io/ldgnu/saa-quiz-app:latest`, nunca `build:`.

Backup DB antes:
```bash
cp /var/lib/docker/volumes/saa-quiz_saa_data/_data/saa_quiz.db /tmp/saa_quiz-$(date +%F).db
ls -lh /tmp/saa*.db
```

## 3. Manifiestos

`infra/k8s/apps/saa-quiz/namespace.yaml`, `pvc.yaml` (1Gi, `/app/data`):

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata: {name: saa-data, namespace: saa-quiz}
spec:
  accessModes: [ReadWriteOnce]
  resources: {requests: {storage: 1Gi}}
```

Secret (no commitear el real):
```bash
kubectl create ns saa-quiz --dry-run=client -o yaml | kubectl apply -f -
kubectl create secret generic saa-quiz-env -n saa-quiz \
  --from-literal=JWT_SECRET_KEY='GENERA_UNO_LARGO_CON_openssl_rand_-hex_32' \
  --from-literal=ADMIN_PASSWORD='GENERA_OTRO' \
  --from-literal=ADMIN_USERNAME='admin' \
  --dry-run=client -o yaml > /tmp/saa-secret.yaml
kubectl apply -f /tmp/saa-secret.yaml
rm /tmp/saa-secret.yaml
# En repo guarda solo secret.example.yaml con CHANGEME.
```

Genera secretos de verdad:
```bash
openssl rand -hex 32
```

`deployment.yaml` completo explicado:

- `image: ghcr.io/ldgnu/saa-quiz-app:latest`, `imagePullPolicy: Always` para que siempre traiga lo último que sube Actions.
- `containerPort: 8000`.
- `env`: `DATABASE_URL`, `DATA_DIR` fijos, resto desde `secretKeyRef` + `value` para no secretos.
- `readOnlyRootFilesystem: true`, `allowPrivilegeEscalation: false`, `capabilities: {drop: [ALL]}` = traducción de tu `read_only` + `cap_drop`.
- `emptyDir` para `/tmp` porque con root read-only necesitas tmp escribible (tu `tmpfs:`).
- `volumeMounts: saa-data -> /app/data`.
- `liveness/readiness` a `/api/health` puerto 8000, `initialDelay 20/10`.
- `resources: requests 200m/256Mi, limits 1000m/512Mi` = tu `cpus 1.0 memory 512M`.

`service.yaml` ClusterIP `8000->8000`.

Aplica:
```bash
kubectl apply -f infra/k8s/apps/saa-quiz/
kubectl -n saa-quiz get pods,pvc,svc
kubectl -n saa-quiz logs -f deploy/saa-quiz
kubectl -n saa-quiz port-forward svc/saa-quiz 8000:8000
curl -f http://127.0.0.1:8000/api/health
```

Migración de sqlite: igual que freshrss, escala a 0, copia `saa_quiz.db` al path del PV, `chown 1000`, escala a 1. Verifica login con `ADMIN_PASSWORD` del Secret, no con el viejo aleatorio.

## 4. Errores típicos

- `ImagePullBackOff`: GHCR privado sin `imagePullSecrets`, o tag mal. `kubectl describe pod` dice `401 Unauthorized`. Crea `kubectl create secret docker-registry ghcr --docker-server=ghcr.io --docker-username=ldgnu --docker-password=$TOKEN -n saa-quiz` y referencia en `imagePullSecrets`.
- `Token invalid` después de migrar: cambiaste `JWT_SECRET_KEY` y el DB viejo tenía otro. O mantienes el viejo (copiando `/app/data` entero con `.jwt*` si existe) o invalidas sesiones y pides re-login.
- `Read-only file system: /tmp`: olvidaste `emptyDir` para `/tmp`.
- `Permission denied /app/data`: `fsGroup` mal. Tu imagen corre como `nobody` o `1000` según Dockerfile `USER`. Mira `Dockerfile USER` y ajusta `runAsUser`.

Validación: `curl /api/health` 200, login con admin, borras Pod y sigues logueado.
