# Módulo 2 — Historia y conceptos de Kubernetes, sin humo

## 1. Quién lo inventó y por qué no es marketing

2003: Google corre Search, Gmail, YouTube en miles de máquinas. No usan VMs, usan contenedores propios con un jefe central llamado **Borg**. Borg decide: este trabajo va a esta máquina, si muere lo muevo, si necesita más CPU le doy más.

2013: Borg evoluciona a **Omega**. Misma idea, más flexible.

Problema: Borg/Omega son cerrados. Afuera, en 2013 aparece Docker y todos empiezan a contenerizar, pero nadie sabe orquestarlos bien. Tienes 5 containers en 1 máquina y `docker-compose` alcanza. Tienes 500 en 50 máquinas y `compose` no alcanza: ¿dónde lo corro? ¿qué pasa si un nodo muere a las 3am? ¿cómo actualizo sin cortar?

2014: **Brendan Burns, Joe Beda y Craig McLuckie** de Google liberan un Borg simplificado como open source: **Kubernetes**, del griego timonel (por eso el timón del logo). Lo donan a la **CNCF**. En 2015 sale v1.0. Hoy es estándar: AWS EKS, GCP GKE, Azure AKS, y tu k3s son el mismo API.

Idea central: tú declaras el estado deseado ("quiero 1 freshrss con esta imagen y este disco"), Kubernetes se encarga de mantenerlo. No le dices cómo, le dices qué quieres.

## 2. Arquitectura en una página

Un cluster tiene:

- **kube-apiserver:** puerta de entrada. Todo `kubectl` habla con él.
- **etcd:** base de datos clave-valor. Guarda el estado deseado. Si se corrompe, pierdes el cluster.
- **scheduler:** decide en qué Node corre cada Pod según CPU/RAM disponible.
- **controller-manager:** bucle que corrige diferencias. Si quieres 1 réplica y hay 0, crea 1.
- **kubelet:** agente en cada Node que habla con containerd para correr containers.
- **containerd:** el que realmente corre el container (Docker usa containerd por debajo también).
- **kube-proxy / CNI:** red interna para que Pods y Services se hablen.

En k3s todo esto viene en un solo binario. No lo ves, pero está. `kubectl get pods -A` te muestra los pods de sistema en `kube-system`.

## 3. Objetos que vas a usar, con ejemplo de tu servidor

### Node
Tu superserver. `kubectl get nodes -o wide` debe decir `Ready`. Hoy tienes 1. Más adelante podrías tener 3 y Kubernetes repartiría.

### Namespace
Carpeta lógica. `freshrss`, `saa-quiz`, `monitoring`. Para no mezclar y para poder borrar de un plumazo: `kubectl delete ns freshrss` borra todo lo de freshrss.

Docker no tiene esto. Tus `networks` (`proxy`, `saa-quiz_default`) son un intento parecido pero manual.

### Pod
Unidad mínima. 1 Pod = 1 IP efímera + 1 o más containers que comparten localhost y volúmenes. Si el Pod muere, la IP muere. Nunca expones Pods directo, siempre via Service.

Error típico: hacer `kubectl get pods` y ver `CrashLoopBackOff`. Significa que el container arranca y muere en loop. Se mira con `kubectl logs` + `kubectl describe pod`.

### Deployment
El encargado. Dice: quiero N réplicas de este Pod con esta imagen, estos env, estos probes, estos limits. Si un Pod muere, crea otro. Si cambias imagen, hace rolling update.

Equivale a `restart: unless-stopped` pero mejor: te garantiza N copias vivas, no solo "si se apaga, préndelo".

```yaml
spec:
  replicas: 1
  selector:
    matchLabels: {app: freshrss}
  template:
    metadata: {labels: {app: freshrss}}
    spec:
      containers:
      - name: freshrss
        image: freshrss/freshrss:latest
```

### Service ClusterIP
IP interna estable. El Pod cambia de IP en cada reinicio, el Service no. Otros Pods le hablan al Service.

```yaml
spec:
  selector: {app: freshrss}
  ports: [{port: 80, targetPort: 80}]
```

En Docker era `ports:` + nombre de red. Acá es Service + DNS interno (`freshrss.freshrss.svc.cluster.local`).

### Ingress
El nuevo nginx-proxy-manager. Recibe `https://rss.tudominio.com` y lo manda al Service según Host. Al inicio no lo usamos, usamos `port-forward` para no pelear por 80/443. En Módulo 6-8 lo activamos.

### PVC (PersistentVolumeClaim)
Pedido de disco. En Docker era `- saa_data:/app/data`. En K8s:

```yaml
spec:
  accessModes: [ReadWriteOnce]
  resources: {requests: {storage: 2Gi}}
```

`ReadWriteOnce` = un solo Nodo lo monta a la vez. Alcanza con 1 nodo. El dato sobrevive aunque el Pod muera, porque vive en `/var/lib/rancher/k3s/storage/` en el host, no en el container.

Si borras el PVC, pierdes datos. Si borras el Pod, no.

### ConfigMap y Secret
- ConfigMap: `TZ=America/Argentina/Buenos_Aires`, `DATABASE_URL`, `CORS_ORIGINS`. No secreto, va en Git.
- Secret: `ADMIN_PASSWORD`, `JWT_SECRET_KEY`, `POSTGRES_PASSWORD`. Base64, no va en Git. Lo creas con `kubectl create secret`.

En tu `saa-quiz` hoy `JWT_SECRET_KEY` y `ADMIN_PASSWORD` están vacíos y la app genera aleatorios en `/app/data`. Eso funciona en Docker con volumen eterno, pero en K8s si recreas PVC pierdes login. Por eso en K8s los fijamos.

### Probes
Tu `healthcheck:` de Docker:
```
test: curl http://127.0.0.1:8000/api/health
```
En K8s:
- `livenessProbe`: si falla, reinicia el container.
- `readinessProbe`: si falla, saca el Pod del Service pero no lo reinicia.
- `startupProbe`: para apps lentas como n8n.

Sin probes, K8s cree que un container colgado está sano.

### Limits y requests
Tu `deploy.resources.limits: cpus 1.0 memory 512M`:
- `requests`: lo que reserva al agendar. Si pides más de lo que tiene el nodo, el Pod queda `Pending`.
- `limits`: techo. Si lo pasas, te matan (OOMKilled).

Con 12 GB RAM no puedes pedir 2 GB por cada una de las 26 apps. Por eso migramos de a una.

## 4. Tabla que tienes que memorizar

```
compose build: .              -> GitHub Actions build + push a GHCR, K8s solo hace pull
compose image:                -> Deployment image:
compose ports:                -> Service + (después) Ingress
compose volumes:              -> PVC + volumeMounts
compose environment:          -> ConfigMap + Secret + env
compose restart:              -> Deployment restartPolicy Always
compose healthcheck:          -> livenessProbe + readinessProbe
compose networks:             -> Namespace (+ NetworkPolicy después)
compose deploy.resources:     -> resources.requests/limits
compose read_only, cap_drop:  -> securityContext
```

## 5. Validación

Explica sin mirar: qué pasa si borras un Pod de un Deployment, qué pasa si borras un PVC, diferencia entre Service e Ingress, diferencia entre ConfigMap y Secret. Si lo explicas, pasas al Módulo 3.
