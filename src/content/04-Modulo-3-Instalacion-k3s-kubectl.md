# Módulo 3 — Instalación: k3s + kubectl conviviendo con Docker

## 1. Qué vamos a instalar y por qué así

- **k3s:** Kubernetes completo en un binario de 100 MB, hecho por Rancher/SUSE para edge y homelab. Mismo API que EKS/GKE. Usa `containerd`, no Docker, pero entiende tus imágenes Docker.
- **Sin Traefik:** k3s trae Traefik como Ingress y quiere 80/443. Tú ya tienes `nginx-proxy-manager` ahí. Si lo dejas, uno de los dos no arranca. Lo instalamos con `--disable traefik` y seguimos usando tu borde actual. Cuando migremos Ingress lo repensamos.
- **kubectl:** cliente para hablar con el apiserver. Lo instalas en tu PC y en el superserver.
- **k9s y helm:** k9s para ver sin memorizar, helm para instalar paquetes después. Opcionales pero recomendados.

Nada de esto toca tus containers. Docker sigue en `/var/run/docker.sock`, k3s usa `/run/k3s/containerd`.

## 2. Pre-requisitos Oracle

```bash
uname -a
lsb_release -a
free -h
df -h
df -h /var/lib/rancher 2>/dev/null || echo "aun no existe, normal"
ip a | grep inet
sudo systemctl status docker --no-pager | head -20
```

- 2 CPU / 12 GB alcanza para k3s + 3-4 apps piloto. No para las 26 a la vez.
- Disco: necesitas 10 GB libres en `/var/lib/rancher`.
- Red OCI: en la consola de Oracle abre `6443/tcp` solo para tu IP pública, no para `0.0.0.0/0`. No abras 80/443 nuevos, ya están.
- Sudoers roto `100-oracle-cloud-agent-users` que ya viste: si `sudo -l` tira warnings pero te deja entrar a root, ignóralo por ahora. Se arregla con `sudo visudo -f /etc/sudoers.d/100-oracle-cloud-agent-users` después, no es parte del bootcamp.

## 3. Instalar kubectl

En superserver y en tu PC (misma versión):

```bash
KVER=$(curl -L -s https://dl.k8s.io/release/stable.txt)
curl -LO "https://dl.k8s.io/release/${KVER}/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/
kubectl version --client
# Debe decir Client Version v1.3x
```

Si `kubectl` dice `command not found` después, es PATH: cierra terminal o `export PATH=$PATH:/usr/local/bin`.

## 4. Instalar k3s (solo superserver)

```bash
curl -sfL https://get.k3s.io | sh -s - --disable traefik --write-kubeconfig-mode 644
sudo systemctl status k3s --no-pager
sudo systemctl enable k3s
ls -lh /etc/rancher/k3s/k3s.yaml
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
echo 'export KUBECONFIG=/etc/rancher/k3s/k3s.yaml' >> ~/.bashrc
kubectl get nodes -o wide
kubectl get pods -A
```

Salida esperada:
```
NAME      STATUS   ROLES                  AGE   VERSION
Outblast  Ready    control-plane,master   1m    v1.3x+k3s1
NAMESPACE     NAME                                      READY
kube-system   coredns-...                               1/1
kube-system   metrics-server-...                        1/1
```

Si `NotReady`: `sudo journalctl -u k3s -n 100 --no-pager`, casi siempre es disco lleno o memoria. `kubectl describe node` te dice `Pressure`.

Desinstalar si la embarras (borra todo k3s, no toca Docker):
```bash
/usr/local/bin/k3s-uninstall.sh
```

## 5. k9s y helm

```bash
curl -sS https://webinstall.dev/k9s | bash
export PATH=$PATH:~/.local/bin
k9s --help | head -5

curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
helm version
```

k9s se usa con `k9s --kubeconfig /etc/rancher/k3s/k3s.yaml` si no seteaste KUBECONFIG.

## 6. Kubeconfig para tu PC (opcional, después)

No lo hagas el día 1 si no entiendes SSH. Cuando quieras manejar desde tu PC:

```bash
# en superserver
sudo cat /etc/rancher/k3s/k3s.yaml
# copia el contenido, en tu PC guarda en ~/.kube/config-outblast
# cambia 127.0.0.1 por IP del superserver
# en tu PC:
export KUBECONFIG=~/.kube/config-outblast
kubectl get nodes
```

Nunca commitees ese archivo, tiene certificados admin.

## 7. Lab y validación

```bash
kubectl get nodes
kubectl create deployment hola --image=nginx:alpine
kubectl get pods -w
kubectl logs deploy/hola
kubectl delete deployment hola
kubectl get pods
```

Validación para pasar al Módulo 4:
- `kubectl get nodes` dice `Ready`.
- `kubectl get pods -A` sin `CrashLoopBackOff` en `kube-system` por más de 2 min.
- `docker ps` sigue mostrando tus 26 containers Up. Si Docker se cayó, avisa antes de seguir.
- Sabes dónde está tu kubeconfig y por qué k3s no usa Docker.

Guarda la salida en `docs/03-instalacion-k3s.md` y commitea `docs: instala k3s sin traefik`.
