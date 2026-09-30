# Module 4 — kubectl survival: 20 commands for 95%

## 1. kubectl logic

Everything is `kubectl VERBO RECURSO -n NAMESPACE`.

- Verb: `get, describe, logs, apply, delete, exec, port-forward`.
- Resource: `nodes, pods, deploy, svc, pvc, ingress, ns, secret, configmap`.
- `-A` = all namespaces. `-n freshrss` = only that one.

`get` is the summary, `describe` is the full medical history, `logs` is what the app would say if it could talk.

## 2. See

```bash
kubectl get nodes -o wide
kubectl get pods -A
kubectl get pods -n freshrss -o wide
kubectl get deploy,svc,pvc,ingress -n freshrss
kubectl get events -n freshrss --sort-by=.lastTimestamp | tail -20
```

`events` is gold: it tells you `FailedScheduling`, `FailedMount`, `ImagePullBackOff` with the reason.

## 3. Diagnose

```bash
kubectl describe pod NOMBRE -n freshrss
# Mira Events al final: qué intentó K8s y por qué falló.

kubectl logs deploy/freshrss -n freshrss
kubectl logs deploy/freshrss -n freshrss --previous
kubectl logs -f deploy/freshrss -n freshrss
# --previous = log del container que ya murió. Clave para CrashLoop.

kubectl describe pvc saa-data -n saa-quiz
kubectl describe svc freshrss -n freshrss
```

States you will see and what to do:
- `Pending`: scheduler couldn't place it. `describe` almost always says `Insufficient cpu/memory` or a PVC with no StorageClass.
- `ContainerCreating`: downloading the image or mounting the volume. If it stays for hours, it's `ImagePullBackOff` (wrong name or private GHCR without secret) or `MountVolume` (bad PVC).
- `CrashLoopBackOff`: starts and dies. Check `logs --previous`, env vars, port, volume permissions.
- `ImagePullBackOff`: couldn't pull the image. Name, tag, `imagePullSecrets`.
- `OOMKilled`: you went over your `limits.memory`. Raise limits or check for a leak.
- `Error` + `Completed`: a Job finished, it's not an error.

## 4. Get in and test

```bash
kubectl exec -it deploy/freshrss -n freshrss -- sh
# adentro:
ls -la /var/www/FreshRSS/data
id
env | sort
wget -qO- http://127.0.0.1:80/i/ | head

kubectl port-forward svc/freshrss 8080:80 -n freshrss
# en otra terminal:
curl -f http://localhost:8080/i/
```

`port-forward` is your best friend until you have Ingress. It doesn't expose anything to the internet, only to your terminal.

## 5. Apply and delete

```bash
kubectl apply -f infra/k8s/apps/freshrss/
kubectl delete -f infra/k8s/apps/freshrss/
kubectl delete pod NOMBRE -n freshrss
# Borrar un Pod de un Deployment lo recrea. Es el test de auto-curación.

kubectl scale deploy freshrss -n freshrss --replicas=2
kubectl scale deploy freshrss -n freshrss --replicas=1
```

`apply` is declarative: you describe what you want and K8s makes it happen. Never use `kubectl run` in this bootcamp except for the `hola` lab.

## 6. Mandatory lab

```bash
kubectl create ns lab
kubectl create deployment hola --image=nginx:alpine -n lab
kubectl get pods -n lab -w
POD=$(kubectl get pods -n lab -o jsonpath='{.items[0].metadata.name}')
kubectl describe pod $POD -n lab | tail -30
kubectl logs deploy/hola -n lab
kubectl exec -it deploy/hola -n lab -- cat /usr/share/nginx/html/index.html
kubectl delete pod $POD -n lab
kubectl get pods -n lab
# Observa: el nombre cambió, Deployment creó otro solo.
kubectl port-forward svc/hola 8080:80 -n lab 2>&1 || kubectl expose deploy hola --port=80 -n lab
curl http://localhost:8080/
kubectl delete ns lab
```

## 7. Validation

Without looking at your notes:
- Fetch live and dead logs from a Deployment.
- Explain why `delete pod` doesn't delete the app.
- Do a `port-forward` and `curl` to a Service.
- Read `Events` and tell whether it's an image, volume, or resources problem.

If you do this fluently, Module 6 (freshrss) is just applying the same routine to a real app.
