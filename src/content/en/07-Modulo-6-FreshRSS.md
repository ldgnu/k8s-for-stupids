# Module 6 — Lab 1: FreshRSS, your first real migration

## 1. Why FreshRSS first

- Official image `freshrss/freshrss:latest`, documented, no `build: .`.
- Standard port 80, health on `/i/`.
- A single data volume, no external database. If you break it, you re-create and re-import OPML.
- Low risk vs `vaultwarden` or `postgres`. If you lose freshrss for a day, you don't lose passwords.

We don't migrate with Ingress yet. Only `port-forward`. Domains later.

## 2. Collect the truth (on superserver, read-only)

```bash
docker inspect freshrss --format '{{json .Mounts}}' | python3 -m json.tool
# Esperas algo como Destination /var/www/FreshRSS/data, Source /var/lib/docker/volumes/... o /home/...

docker inspect freshrss --format '{{json .Config.Env}}' | python3 -m json.tool
# Busca TZ, PUID, PGID, ADMIN_EMAIL. Anótalos.

docker inspect freshrss --format '{{json .HostConfig.PortBindings}}' | python3 -m json.tool
docker logs freshrss --tail 50
ls -lh $(docker inspect freshrss --format '{{(index .Mounts 0).Source}}')
```

Save that in `docs/02-arquitectura-actual-docker.md` under `## freshrss`. Don't go on without this.

Backup before touching anything:
```bash
docker stop freshrss || true
tar -czf /tmp/freshrss-data-$(date +%F).tgz -C $(docker inspect freshrss --format '{{(index .Mounts 0).Source}}') .
ls -lh /tmp/freshrss-data*.tgz
docker start freshrss
```

If the Mount is a `/home/...` bind, adjust the path. Never run tar without `docker stop` or you'll copy sqlite halfway.

## 3. Files to create (on your PC, branch `lab/freshrss`)

`infra/k8s/apps/freshrss/namespace.yaml`:
```yaml
apiVersion: v1
kind: Namespace
metadata: {name: freshrss}
```

`infra/k8s/apps/freshrss/pvc.yaml`:
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata: {name: freshrss-data, namespace: freshrss}
spec:
  accessModes: [ReadWriteOnce]
  resources: {requests: {storage: 2Gi}}
```
2Gi is plenty (your data today is MBs). `ReadWriteOnce` is enough with 1 node. Don't use `ReadWriteMany` without NFS, it will stay Pending.

`infra/k8s/apps/freshrss/deployment.yaml` explained:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata: {name: freshrss, namespace: freshrss, labels: {app: freshrss}}
spec:
  replicas: 1
  selector: {matchLabels: {app: freshrss}}
  template:
    metadata: {labels: {app: freshrss}}
    spec:
      securityContext: {runAsUser: 1000, runAsGroup: 1000, fsGroup: 1000}
      # FreshRSS oficial corre como www-data (33) o 1000 según tag. Si ves Permission denied, ajusta a 33.
      containers:
      - name: freshrss
        image: freshrss/freshrss:latest
        imagePullPolicy: IfNotPresent
        ports: [{containerPort: 80, name: http}]
        env:
        - {name: TZ, value: America/Argentina/Buenos_Aires}
        # Pega acá las que viste en docker inspect, menos passwords.
        volumeMounts:
        - {name: data, mountPath: /var/www/FreshRSS/data}
        livenessProbe:
          httpGet: {path: /i/, port: 80}
          initialDelaySeconds: 30
          periodSeconds: 30
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet: {path: /i/, port: 80}
          initialDelaySeconds: 10
          periodSeconds: 10
        resources:
          requests: {cpu: 100m, memory: 128Mi}
          limits: {cpu: 500m, memory: 512Mi}
      volumes:
      - name: data
        persistentVolumeClaim: {claimName: freshrss-data}
```

Why each field:
- `replicas: 1`: sqlite doesn't support 2 writers at once.
- `securityContext`: if the volume comes from root, the 1000 container can't write. `fsGroup` gives it permission.
- `probes` on `/i/`: if you use `/` you get a redirect and it fails. Use `/i/`.
- `resources`: with 12 GB you can't request 2 GB per app.

`infra/k8s/apps/freshrss/service.yaml`:
```yaml
apiVersion: v1
kind: Service
metadata: {name: freshrss, namespace: freshrss, labels: {app: freshrss}}
spec:
  selector: {app: freshrss}
  type: ClusterIP
  ports: [{port: 80, targetPort: 80, name: http}]
```

## 4. Apply and test

```bash
kubectl apply -f infra/k8s/apps/freshrss/
kubectl -n freshrss get pods,pvc,svc
kubectl -n freshrss get events --sort-by=.lastTimestamp | tail -20
kubectl -n freshrss logs -f deploy/freshrss
# Espera Ready 1/1, si no, describe:
kubectl -n freshrss describe pod -l app=freshrss | tail -40
```

Test without exposing:
```bash
kubectl -n freshrss port-forward svc/freshrss 8080:80
# otra terminal:
curl -f http://localhost:8080/i/ -v
```

Data migration (only once the virgin Pod works):
```bash
# Opción A: si vienes de volumen Docker:
kubectl -n freshrss scale deploy freshrss --replicas=0
kubectl -n freshrss get pvc
# Busca el path del PV: kubectl get pv, describe, Source Path en /var/lib/rancher/k3s/storage/
sudo tar -xzf /tmp/freshrss-data-FECHA.tgz -C /var/lib/rancher/k3s/storage/PATH_DEL_PV/
sudo chown -R 1000:1000 /var/lib/rancher/k3s/storage/PATH_DEL_PV/
kubectl -n freshrss scale deploy freshrss --replicas=1
kubectl -n freshrss logs -f deploy/freshrss
# Opción B: re-importar OPML desde la UI, más lento pero más seguro si dudas de permisos.
```

## 5. Typical mistakes in this lab

- `Permission denied /var/www/FreshRSS/data`: wrong `runAsUser/fsGroup`. Try 33:33 (www-data) instead of 1000.
- `Service endpoints <none>`: labels don't match.
- `PVC Pending`: you asked for `ReadWriteMany` or a `storageClass` that doesn't exist. `kubectl describe pvc` tells you.
- `Liveness failed`: `/` path instead of `/i/`, or `initialDelay` too short. Raise it to 60s the first time.
- You see login but no feeds: you migrated code but not data. Repeat the migration with `replicas=0`.

## 6. Wrap-up

Create `infra/k8s/apps/freshrss/README.md` with: where the data came from, how to back up, how to go back to Docker (`docker start freshrss` + old npm upstream).

Commit:
```bash
git add infra/k8s/apps/freshrss docs/
git commit -m "k8s: freshrss deployment + service + pvc funcionales"
git push -u origin lab/freshrss
```

Don't shut down `docker freshrss` yet. Leave them living side by side for 3 days. When K8s is stable, you switch npm to point at the new NodePort/Ingress and stop Docker. That's the final Module 8, not now.

Validation: `curl -f` 200, you delete the Pod and it comes back on its own without losing feeds.
