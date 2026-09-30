# Módulo 6 — Lab 1: FreshRSS, tu primera migración real

## 1. Por qué FreshRSS primero

- Imagen oficial `freshrss/freshrss:latest`, documentada, sin `build: .`.
- Puerto 80 estándar, health en `/i/`.
- Un solo volumen de datos, sin base externa. Si rompes, re-creas y re-importas OPML.
- Riesgo bajo vs `vaultwarden` o `postgres`. Si pierdes freshrss un día, no pierdes passwords.

No migramos con Ingress todavía. Solo `port-forward`. Dominios después.

## 2. Recolectar verdad (en superserver, solo lectura)

```bash
docker inspect freshrss --format '{{json .Mounts}}' | python3 -m json.tool
# Esperas algo como Destination /var/www/FreshRSS/data, Source /var/lib/docker/volumes/... o /home/...

docker inspect freshrss --format '{{json .Config.Env}}' | python3 -m json.tool
# Busca TZ, PUID, PGID, ADMIN_EMAIL. Anótalos.

docker inspect freshrss --format '{{json .HostConfig.PortBindings}}' | python3 -m json.tool
docker logs freshrss --tail 50
ls -lh $(docker inspect freshrss --format '{{(index .Mounts 0).Source}}')
```

Guarda eso en `docs/02-arquitectura-actual-docker.md` bajo `## freshrss`. Sin esto no sigas.

Backup antes de tocar:
```bash
docker stop freshrss || true
tar -czf /tmp/freshrss-data-$(date +%F).tgz -C $(docker inspect freshrss --format '{{(index .Mounts 0).Source}}') .
ls -lh /tmp/freshrss-data*.tgz
docker start freshrss
```

Si el Mount es bind `/home/...`, ajusta la ruta. Nunca hagas tar sin `docker stop` o copias sqlite a medias.

## 3. Archivos a crear (en tu PC, rama `lab/freshrss`)

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
2Gi sobra (tu data hoy son MB). `ReadWriteOnce` alcanza con 1 nodo. No uses `ReadWriteMany` sin NFS, quedará Pending.

`infra/k8s/apps/freshrss/deployment.yaml` explicado:
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

Por qué cada campo:
- `replicas: 1`: sqlite no soporta 2 escribiendo a la vez.
- `securityContext`: si el volumen viene de root, el container 1000 no puede escribir. `fsGroup` le da permiso.
- `probes` a `/i/`: si pones `/` te da redirect y falla. Usa `/i/`.
- `resources`: con 12 GB no puedes pedir 2 GB por app.

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

## 4. Aplicar y probar

```bash
kubectl apply -f infra/k8s/apps/freshrss/
kubectl -n freshrss get pods,pvc,svc
kubectl -n freshrss get events --sort-by=.lastTimestamp | tail -20
kubectl -n freshrss logs -f deploy/freshrss
# Espera Ready 1/1, si no, describe:
kubectl -n freshrss describe pod -l app=freshrss | tail -40
```

Test sin exponer:
```bash
kubectl -n freshrss port-forward svc/freshrss 8080:80
# otra terminal:
curl -f http://localhost:8080/i/ -v
```

Migración de datos (solo cuando el Pod virgen anda):
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

## 5. Errores típicos de este lab

- `Permission denied /var/www/FreshRSS/data`: `runAsUser/fsGroup` mal. Prueba 33:33 (www-data) en vez de 1000.
- `Service endpoints <none>`: labels no coinciden.
- `PVC Pending`: pediste `ReadWriteMany` o `storageClass` que no existe. `kubectl describe pvc` lo dice.
- `Liveness failed`: path `/` en vez de `/i/`, o `initialDelay` muy corto. Sube a 60s la primera vez.
- Ves login pero sin feeds: migraste código pero no data. Repite migración con `replicas=0`.

## 6. Cierre

Crea `infra/k8s/apps/freshrss/README.md` con: de dónde vino el dato, cómo hacer backup, cómo volver a Docker (`docker start freshrss` + npm upstream viejo).

Commit:
```bash
git add infra/k8s/apps/freshrss docs/
git commit -m "k8s: freshrss deployment + service + pvc funcionales"
git push -u origin lab/freshrss
```

No apagues `docker freshrss` todavía. Déjalos conviviendo 3 días. Cuando K8s esté estable, cambias npm a apuntar al NodePort/Ingress nuevo y paras Docker. Eso es Módulo 8 final, no ahora.

Validación: `curl -f` 200, borras el Pod y vuelve solo sin perder feeds.
