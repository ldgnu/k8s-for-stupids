# Módulo 4 — kubectl supervivencia: 20 comandos para el 95%

## 1. Lógica de kubectl

Todo es `kubectl VERBO RECURSO -n NAMESPACE`.

- Verbo: `get, describe, logs, apply, delete, exec, port-forward`.
- Recurso: `nodes, pods, deploy, svc, pvc, ingress, ns, secret, configmap`.
- `-A` = todos los namespaces. `-n freshrss` = solo ese.

`get` es resumen, `describe` es historia clínica, `logs` es lo que diría la app si hablara.

## 2. Ver

```bash
kubectl get nodes -o wide
kubectl get pods -A
kubectl get pods -n freshrss -o wide
kubectl get deploy,svc,pvc,ingress -n freshrss
kubectl get events -n freshrss --sort-by=.lastTimestamp | tail -20
```

`events` es oro: te dice `FailedScheduling`, `FailedMount`, `ImagePullBackOff` con motivo.

## 3. Diagnosticar

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

Estados que vas a ver y qué hacer:
- `Pending`: scheduler no pudo. Casi siempre `describe` dice `Insufficient cpu/memory` o PVC sin StorageClass.
- `ContainerCreating`: descargando imagen o montando volumen. Si queda horas, `ImagePullBackOff` (nombre mal o GHCR privado sin secret) o `MountVolume` (PVC mal).
- `CrashLoopBackOff`: arranca y muere. `logs --previous`, revisa env, puerto, permisos de volumen.
- `ImagePullBackOff`: no pudo bajar imagen. Nombre, tag, `imagePullSecrets`.
- `OOMKilled`: pasó tu `limits.memory`. Sube limits o revisa leak.
- `Error` + `Completed`: un Job terminó, no es error.

## 4. Entrar y probar

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

`port-forward` es tu mejor amigo hasta tener Ingress. No expone a internet, solo a tu terminal.

## 5. Aplicar y borrar

```bash
kubectl apply -f infra/k8s/apps/freshrss/
kubectl delete -f infra/k8s/apps/freshrss/
kubectl delete pod NOMBRE -n freshrss
# Borrar un Pod de un Deployment lo recrea. Es el test de auto-curación.

kubectl scale deploy freshrss -n freshrss --replicas=2
kubectl scale deploy freshrss -n freshrss --replicas=1
```

`apply` es declarativo: describe lo que quieres y K8s lo hace. Nunca uses `kubectl run` en este bootcamp salvo el lab `hola`.

## 6. Lab obligatorio

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

## 7. Validación

Sin mirar apuntes:
- Traer logs vivos y muertos de un Deployment.
- Explicar por qué `delete pod` no borra la app.
- Hacer `port-forward` y `curl` a un Service.
- Leer `Events` y decir si es problema de imagen, volumen o recursos.

Si haces esto fluido, el Módulo 6 (freshrss) es solo aplicar la misma rutina a una app real.
