# Sources — which book chapter backs each module

Base book: **"An Introduction to Kubernetes" (Leverege, 2019)** — https://github.com/pdf4j/kubernetes-book — 10 chapters + helm. Real production focus (they run giant IoT on GKE).

Descargas PDFs (2016-2018, old APIs) set aside except for reference.

## Module → chapter map

| Module | Chapters | What it adds |
|---|---|---|
| M0 Git/GitHub | - | Nothing from the book. Our addition (the book assumes git). |
| M1 Docker inventory | Ch.1 | Docker vs K8s are complementary: K8s orchestrates, the runtime executes. Swarm/Mesos/K8s table. |
| M2 History & concepts | Ch.1 + Ch.2 | Borg→CNCF 2014 origin. Master/node architecture, declarative vs current state, 1 app per Pod rule, disposable Pods, Deployment over ReplicaSet, StatefulSets with sticky identity. |
| M3 Install | Ch.5 + Ch.6/L1 | Ch.5 compares managed cloud only (EKS/AKS/GKE): justifies our on-premise k3s. Ch.6 lesson 1: start simple in `default` before hardening. |
| M4 kubectl | Ch.2 + Ch.6/L3 | Controllers create Pods. Ch.6 lesson 3: always verify context/namespace before applying. |
| M5 GitOps | Ch.9 + Ch.6/L4 | Ch.9: backup = git with manifests. Ch.6 lesson 4: Helm to package and roll back until you have CD. |
| M6 FreshRSS | Ch.4 + Ch.9 | Readiness (pre-live) vs liveness (restart). Ch.9: HA ≠ backup, PVs don't recover alone. |
| M7 saa-quiz | Ch.8 | Audit with polaris/popeye: probes, image tags, requests/limits, security contexts (`runAsRootAllowed:false`), Secrets and ServiceAccounts. No manifests: categories to check. |
| M8 Actions | Ch.7 | CI→CD pattern: CI builds/pushes image, CD updates the cluster. Beware mixing contexts/namespaces. The book's Keel is dated (GCR/PubSub): we use GHCR + Actions. |
| Final | Ch.9 + Ch.6/L6 | DR plan against human error and disk failure. Ch.6 lesson 6: observable change windows. |

## Honest gaps (the book does NOT cover, we add it)

- ClusterIP/NodePort Services, PV/PVC/StorageClass, ConfigMaps/Secrets as objects, Namespaces: mentions only. Our YAMLs are our own, validated with `kubectl dry-run` + kubeconform.
- GitHub Actions: not mentioned. The CI→CD pattern is.
- Single-node k3s, TLS with cert-manager, Postgres: not covered. Postgres migrates as Deployment + PVC following the StatefulSets logic of Ch.2/Ch.9, not a book recipe.
- RBAC manifests, SealedSecrets, full securityContext: the book only audits (Ch.8), doesn't teach writing them.

## Freshness notes (2019 → 2026)

- `helm.md` uses Helm 2 with Tiller (`helm init`): TODAY it's Helm 3+ without Tiller. Don't use `helm init`.
- Heapster in Ch.4: dead. Today metrics-server.
- `extensions/v1beta1` APIs: today `apps/v1`, `networking.k8s.io/v1`. Our manifests use current ones.
- EKS/AKS/GKE pricing and versions in Ch.5/6: outdated. Principles hold (start simple, static IPs, update windows), numbers don't.
- Ch.7 Spinnaker/Keel: we don't use them. Our CD is GitHub Actions + `kubectl apply`.

## Ch.6 lessons that are bootcamp rules

1. Start simple (default first).
2. Always know your context (explicit `--context`, `--namespace`).
3. Few Ingresses with stable IP/DNS (no `LoadBalancer` per app).
4. Observable change windows for upgrades.
