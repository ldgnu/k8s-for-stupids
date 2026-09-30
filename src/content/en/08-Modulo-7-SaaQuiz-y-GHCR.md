# Module 7 — Lab 2: saa-quiz, your own image + GHCR + Secrets

## 1. Why this is intermediate level

You already have its compose in `docs/compose-original/saa-quiz/docker-compose.yml`. Let's review what it will demand from you:

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

Differences from freshrss:
- There is no public image. K8s does not `build`, it only does `pull`. You have to push it to GHCR.
- `read_only:true` + `cap_drop` = you have to translate them into a `securityContext`.
- Empty Secrets today. In Docker it works because it generates random ones in `/app/data` and never loses them. In K8s if you recreate the PVC you lose logins and JWT. You must pin them.
- Localhost only. In K8s it will be ClusterIP + port-forward first.

Also read the `Dockerfile` and `.env.example`:
```bash
cat /home/ubuntu/saa-quiz/Dockerfile
cat /home/ubuntu/saa-quiz/.env.example
ls -lh /home/ubuntu/saa-quiz/*.db /var/lib/docker/volumes/saa-quiz_saa_data/_data/
```

## 2. Push the image to GHCR (once, by hand, later Actions does it)

In `/home/ubuntu/saa-quiz`:

```bash
docker build -t ghcr.io/ldgnu/saa-quiz-app:latest .
docker run --rm -p 8001:8000 ghcr.io/ldgnu/saa-quiz-app:latest &
curl -f http://127.0.0.1:8001/api/health
kill %1

echo $GITHUB_TOKEN | docker login ghcr.io -u ldgnu --password-stdin
# El token es un PAT classic con scope write:packages. Créalo en GitHub Settings -> Developer -> PAT.
docker push ghcr.io/ldgnu/saa-quiz-app:latest
```

If `push` says `denied`, the GHCR repo is private and you did not log in, or the name is not exactly `ghcr.io/TU_USER/...`. If your local image is named `saa-quiz-app:latest` without the prefix, tag it: `docker tag saa-quiz-app:latest ghcr.io/ldgnu/saa-quiz-app:latest`.

From now on the Deployment uses `ghcr.io/ldgnu/saa-quiz-app:latest`, never `build:`.

Backup the DB first:
```bash
cp /var/lib/docker/volumes/saa-quiz_saa_data/_data/saa_quiz.db /tmp/saa_quiz-$(date +%F).db
ls -lh /tmp/saa*.db
```

## 3. Manifests

`infra/k8s/apps/saa-quiz/namespace.yaml`, `pvc.yaml` (1Gi, `/app/data`):

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata: {name: saa-data, namespace: saa-quiz}
spec:
  accessModes: [ReadWriteOnce]
  resources: {requests: {storage: 1Gi}}
```

Secret (do not commit the real one):
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

Generate real secrets:
```bash
openssl rand -hex 32
```

Full `deployment.yaml` explained:

- `image: ghcr.io/ldgnu/saa-quiz-app:latest`, `imagePullPolicy: Always` so it always pulls the latest one Actions pushes.
- `containerPort: 8000`.
- `env`: fixed `DATABASE_URL`, `DATA_DIR`, the rest from `secretKeyRef` + `value` for non-secrets.
- `readOnlyRootFilesystem: true`, `allowPrivilegeEscalation: false`, `capabilities: {drop: [ALL]}` = the translation of your `read_only` + `cap_drop`.
- `emptyDir` for `/tmp` because with a read-only root you need a writable tmp (your `tmpfs:`).
- `volumeMounts: saa-data -> /app/data`.
- `liveness/readiness` on `/api/health` port 8000, `initialDelay 20/10`.
- `resources: requests 200m/256Mi, limits 1000m/512Mi` = your `cpus 1.0 memory 512M`.

`service.yaml` ClusterIP `8000->8000`.

Apply:
```bash
kubectl apply -f infra/k8s/apps/saa-quiz/
kubectl -n saa-quiz get pods,pvc,svc
kubectl -n saa-quiz logs -f deploy/saa-quiz
kubectl -n saa-quiz port-forward svc/saa-quiz 8000:8000
curl -f http://127.0.0.1:8000/api/health
```

Sqlite migration: same as freshrss, scale to 0, copy `saa_quiz.db` to the PV path, `chown 1000`, scale to 1. Verify login with the Secret's `ADMIN_PASSWORD`, not with the old random one.

## 4. Typical errors

- `ImagePullBackOff`: private GHCR without `imagePullSecrets`, or wrong tag. `kubectl describe pod` says `401 Unauthorized`. Create `kubectl create secret docker-registry ghcr --docker-server=ghcr.io --docker-username=ldgnu --docker-password=$TOKEN -n saa-quiz` and reference it in `imagePullSecrets`.
- `Token invalid` after migrating: you changed `JWT_SECRET_KEY` and the old DB had a different one. Either keep the old one (by copying the whole `/app/data` including `.jwt*` if it exists) or invalidate sessions and ask for re-login.
- `Read-only file system: /tmp`: you forgot the `emptyDir` for `/tmp`.
- `Permission denied /app/data`: wrong `fsGroup`. Your image runs as `nobody` or `1000` depending on the Dockerfile `USER`. Check the `Dockerfile USER` and adjust `runAsUser`.

Validation: `curl /api/health` returns 200, admin login works, you delete the Pod and stay logged in.
