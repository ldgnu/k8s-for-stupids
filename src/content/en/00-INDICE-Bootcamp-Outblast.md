# OUTBLAST Bootcamp — From loose Docker to Kubernetes with GitHub Actions
## From 26 containers you don't fully understand to SRE who understands everything.

**Estimated duration:** 14 days, 1 hour per day.
**Method:** read, run, validate, commit. If validation fails, you don't move on.
**Repo:** `outblast-migrate-k8s`. Everything you do stays here.

### Course map

- `01-Modulo-0-Git-GitHub.md` — Your engineer notebook. Without this there is no bootcamp. Branches, commits, PRs, how not to leak secrets.
- `02-Modulo-1-Inventario-Docker.md` — What you have today in Outblast and why it's there. Layer by layer: edge, apps, monitoring. How to really read `docker inspect`.
- `03-Modulo-2-Historia-y-Conceptos-Kubernetes.md` — Who invented Kubernetes and why. Borg, Omega, CNCF. What Cluster, Node, Pod, Deployment, Service, Ingress, PVC, ConfigMap, Secret, Probe are. Docker -> K8s translation table.
- `04-Modulo-3-Instalacion-k3s-kubectl.md` — Installation living alongside Docker. Why k3s without Traefik, kubeconfig, kubectl, k9s, helm. How to uninstall if you mess up. Oracle ports and firewall.
- `05-Modulo-4-kubectl-supervivencia.md` — The 20 commands you'll use 95% of the time. Create, view, log, describe, port-forward, exec, delete. The self-healing nginx lab.
- `06-Modulo-5-Estructura-GitOps.md` — How we organize this repo so `main` is always applicable. Namespaces, base vs apps, secret.example, why Git never stores passwords.
- `07-Modulo-6-FreshRSS.md` — Your first real migration. Official image, 1 volume, port 80. PVC, Deployment, Service, port-forward, data migration, rollback to Docker.
- `08-Modulo-7-SaaQuiz-y-GHCR.md` — Second migration, intermediate level. Own image with `build: .`, sqlite, readOnly, empty secrets that will break in K8s if you don't pin them. How to push to GHCR.
- `09-Modulo-8-GitHub-Actions.md` — CI/CD so you don't do it by hand. `ci-yaml` that validates, `build-push` that builds and pushes. Self-hosted runner later, not now.

### Bootcamp rules

1. One module = one sitting. Read it fully before touching the terminal.
2. Every change in `infra/` or `docs/` goes with a `docs:`, `k8s:`, `ci:` commit.
3. Never two migrations on the same day. Never shut down Docker without 3 stable days in K8s.
4. If you don't understand something, write it down in `docs/04-decisiones.md` as a question, don't skip it.

### Current status

- [x] M0 started (you already pushed to main)
- [x] M1 halfway (you have `01-inventario-superserver.md` with `docker ps`)
- [ ] M2 read
- [ ] M3 install
- [ ] M4 practice
- [ ] M6 migrate freshrss

Start with `01-Modulo-0-Git-GitHub.md`.
