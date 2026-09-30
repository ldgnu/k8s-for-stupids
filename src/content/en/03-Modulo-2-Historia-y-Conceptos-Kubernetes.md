# Module 2 — Kubernetes history and concepts, no fluff

## 1. Who invented it and why it's not marketing

2003: Google runs Search, Gmail, YouTube on thousands of machines. They don't use VMs, they use their own containers with a central boss called **Borg**. Borg decides: this job goes to this machine, if it dies I move it, if it needs more CPU I give it more.

2013: Borg evolves into **Omega**. Same idea, more flexible.

Problem: Borg/Omega are closed. Outside, in 2013 Docker shows up and everyone starts containerizing, but nobody knows how to orchestrate them well. You have 5 containers on 1 machine and `docker-compose` is enough. You have 500 on 50 machines and `compose` is not enough: where do you run it? what happens if a node dies at 3am? how do you update without downtime?

2014: **Brendan Burns, Joe Beda, and Craig McLuckie** from Google release a simplified Borg as open source: **Kubernetes**, from the Greek for helmsman (that's why the wheel in the logo). They donate it to the **CNCF**. In 2015 v1.0 comes out. Today it's the standard: AWS EKS, GCP GKE, Azure AKS, and your k3s are the same API.

Core idea: you declare the desired state ("I want 1 freshrss with this image and this disk"), Kubernetes takes care of maintaining it. You don't tell it how, you tell it what you want.

## 2. Architecture on one page

A cluster has:

- **kube-apiserver:** entry point. All `kubectl` talks to it.
- **etcd:** key-value database. It stores the desired state. If it gets corrupted, you lose the cluster.
- **scheduler:** decides on which Node each Pod runs based on available CPU/RAM.
- **controller-manager:** loop that fixes differences. If you want 1 replica and there are 0, it creates 1.
- **kubelet:** agent on each Node that talks to containerd to run containers.
- **containerd:** the one that actually runs the container (Docker uses containerd under the hood too).
- **kube-proxy / CNI:** internal network so Pods and Services can talk to each other.

In k3s all of this comes in a single binary. You don't see it, but it's there. `kubectl get pods -A` shows you the system pods in `kube-system`.

## 3. Objects you will use, with examples from your server

### Node
Your superserver. `kubectl get nodes -o wide` must say `Ready`. Today you have 1. Later you could have 3 and Kubernetes would spread the load.

### Namespace
Logical folder. `freshrss`, `saa-quiz`, `monitoring`. So you don't mix things up and so you can delete in one shot: `kubectl delete ns freshrss` deletes everything in freshrss.

Docker doesn't have this. Your `networks` (`proxy`, `saa-quiz_default`) are a similar but manual attempt.

### Pod
Minimum unit. 1 Pod = 1 ephemeral IP + 1 or more containers sharing localhost and volumes. If the Pod dies, the IP dies. You never expose Pods directly, always via Service.

Typical mistake: running `kubectl get pods` and seeing `CrashLoopBackOff`. It means the container starts and dies in a loop. You look at it with `kubectl logs` + `kubectl describe pod`.

### Deployment
The one in charge. It says: I want N replicas of this Pod with this image, these env vars, these probes, these limits. If a Pod dies, it creates another one. If you change the image, it does a rolling update.

It's the equivalent of `restart: unless-stopped` but better: it guarantees you N live copies, not just "if it shuts down, turn it on".

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
Stable internal IP. The Pod changes IP on every restart, the Service doesn't. Other Pods talk to the Service.

```yaml
spec:
  selector: {app: freshrss}
  ports: [{port: 80, targetPort: 80}]
```

In Docker it was `ports:` + network name. Here it's Service + internal DNS (`freshrss.freshrss.svc.cluster.local`).

### Ingress
The new nginx-proxy-manager. It receives `https://rss.tudominio.com` and sends it to the Service based on Host. At first we don't use it, we use `port-forward` so you don't fight over 80/443. In Modules 6-8 we enable it.

### PVC (PersistentVolumeClaim)
Disk request. In Docker it was `- saa_data:/app/data`. In K8s:

```yaml
spec:
  accessModes: [ReadWriteOnce]
  resources: {requests: {storage: 2Gi}}
```

`ReadWriteOnce` = a single Node mounts it at a time. Enough with 1 node. The data survives even if the Pod dies, because it lives in `/var/lib/rancher/k3s/storage/` on the host, not in the container.

If you delete the PVC, you lose data. If you delete the Pod, you don't.

### ConfigMap and Secret
- ConfigMap: `TZ=America/Argentina/Buenos_Aires`, `DATABASE_URL`, `CORS_ORIGINS`. Not secret, goes into Git.
- Secret: `ADMIN_PASSWORD`, `JWT_SECRET_KEY`, `POSTGRES_PASSWORD`. Base64, doesn't go into Git. You create it with `kubectl create secret`.

In your `saa-quiz` today `JWT_SECRET_KEY` and `ADMIN_PASSWORD` are empty and the app generates random ones in `/app/data`. That works in Docker with an eternal volume, but in K8s if you recreate the PVC you lose logins. That's why in K8s we pin them.

### Probes
Your Docker `healthcheck:`:
```
test: curl http://127.0.0.1:8000/api/health
```
In K8s:
- `livenessProbe`: if it fails, it restarts the container.
- `readinessProbe`: if it fails, it removes the Pod from the Service but doesn't restart it.
- `startupProbe`: for slow apps like n8n.

Without probes, K8s thinks a hung container is healthy.

### Limits and requests
Your `deploy.resources.limits: cpus 1.0 memory 512M`:
- `requests`: what it reserves when scheduling. If you ask for more than the node has, the Pod stays `Pending`.
- `limits`: ceiling. If you go over it, you get killed (OOMKilled).

With 12 GB RAM you can't ask for 2 GB for each of the 26 apps. That's why we migrate one at a time.

## 4. Table you have to memorize

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

## 5. Validation

Explain without looking: what happens if you delete a Pod from a Deployment, what happens if you delete a PVC, difference between Service and Ingress, difference between ConfigMap and Secret. If you can explain it, you move on to Module 3.
