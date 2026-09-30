# Module 3 — Installation: k3s + kubectl living alongside Docker

## 1. What we're going to install and why this way

- **k3s:** full Kubernetes in a 100 MB binary, made by Rancher/SUSE for edge and homelab. Same API as EKS/GKE. It uses `containerd`, not Docker, but it understands your Docker images.
- **No Traefik:** k3s ships Traefik as Ingress and wants 80/443. You already have `nginx-proxy-manager` there. If you leave it, one of the two won't start. We install it with `--disable traefik` and keep using your current edge. When we migrate Ingress we'll rethink it.
- **kubectl:** client to talk to the apiserver. You install it on your PC and on the superserver.
- **k9s and helm:** k9s to look without memorizing, helm to install packages later. Optional but recommended.

None of this touches your containers. Docker keeps running on `/var/run/docker.sock`, k3s uses `/run/k3s/containerd`.

## 2. Oracle pre-requisites

```bash
uname -a
lsb_release -a
free -h
df -h
df -h /var/lib/rancher 2>/dev/null || echo "aun no existe, normal"
ip a | grep inet
sudo systemctl status docker --no-pager | head -20
```

- 2 CPUs / 12 GB is enough for k3s + 3-4 pilot apps. Not for all 26 at once.
- Disk: you need 10 GB free in `/var/lib/rancher`.
- OCI network: in the Oracle console open `6443/tcp` only for your public IP, not for `0.0.0.0/0`. Don't open new 80/443 ports, they're already open.
- Broken `100-oracle-cloud-agent-users` sudoers file you already saw: if `sudo -l` throws warnings but still lets you into root, ignore it for now. You fix it with `sudo visudo -f /etc/sudoers.d/100-oracle-cloud-agent-users` later, it's not part of the bootcamp.

## 3. Install kubectl

On the superserver and on your PC (same version):

```bash
KVER=$(curl -L -s https://dl.k8s.io/release/stable.txt)
curl -LO "https://dl.k8s.io/release/${KVER}/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/
kubectl version --client
# Debe decir Client Version v1.3x
```

If `kubectl` says `command not found` afterwards, it's PATH: close the terminal or run `export PATH=$PATH:/usr/local/bin`.

## 4. Install k3s (superserver only)

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

Expected output:
```
NAME      STATUS   ROLES                  AGE   VERSION
Outblast  Ready    control-plane,master   1m    v1.3x+k3s1
NAMESPACE     NAME                                      READY
kube-system   coredns-...                               1/1
kube-system   metrics-server-...                        1/1
```

If `NotReady`: run `sudo journalctl -u k3s -n 100 --no-pager`, it's almost always full disk or memory. `kubectl describe node` tells you `Pressure`.

To uninstall if you mess up (deletes all of k3s, doesn't touch Docker):
```bash
/usr/local/bin/k3s-uninstall.sh
```

## 5. k9s and helm

```bash
curl -sS https://webinstall.dev/k9s | bash
export PATH=$PATH:~/.local/bin
k9s --help | head -5

curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
helm version
```

You use k9s with `k9s --kubeconfig /etc/rancher/k3s/k3s.yaml` if you didn't set KUBECONFIG.

## 6. Kubeconfig for your PC (optional, later)

Don't do it on day 1 if you don't understand SSH. When you want to manage things from your PC:

```bash
# en superserver
sudo cat /etc/rancher/k3s/k3s.yaml
# copia el contenido, en tu PC guarda en ~/.kube/config-outblast
# cambia 127.0.0.1 por IP del superserver
# en tu PC:
export KUBECONFIG=~/.kube/config-outblast
kubectl get nodes
```

Never commit that file, it holds admin certificates.

## 7. Lab and validation

```bash
kubectl get nodes
kubectl create deployment hola --image=nginx:alpine
kubectl get pods -w
kubectl logs deploy/hola
kubectl delete deployment hola
kubectl get pods
```

Validation to move on to Module 4:
- `kubectl get nodes` says `Ready`.
- `kubectl get pods -A` with no `CrashLoopBackOff` in `kube-system` for more than 2 min.
- `docker ps` still shows your 26 containers Up. If Docker went down, report it before continuing.
- You know where your kubeconfig is and why k3s doesn't use Docker.

Save the output to `docs/03-instalacion-k3s.md` and commit `docs: instala k3s sin traefik`.
