# Fuentes — qué capítulo del libro respalda cada módulo

Libro base: **"An Introduction to Kubernetes" (Leverege, 2019)** — https://github.com/pdf4j/kubernetes-book — 10 capítulos + helm. Enfoque producción real (corren IoT gigante en GKE).

Se dejan de lado los PDFs de Descargas (2016-2018, APIs viejas) salvo consulta.

## Mapeo módulo → capítulos

| Módulo | Capítulos | Qué aporta |
|---|---|---|
| M0 Git/GitHub | - | Nada del libro. Nuestro agregado (el libro asume git sabido). |
| M1 Inventario Docker | Ch.1 | Docker vs K8s son complementarias: K8s orquesta, el runtime ejecuta. Tabla Swarm/Mesos/K8s. |
| M2 Historia y conceptos | Ch.1 + Ch.2 | Origen Borg→CNCF 2014. Arquitectura master/node, modelo declarativo vs current state, regla 1 app por Pod, Pods descartables, Deployment sobre ReplicaSet, StatefulSets con sticky identity. |
| M3 Instalación | Ch.5 + Ch.6/L1 | Ch.5 compara solo cloud managed (EKS/AKS/GKE): justifica por qué nosotros k3s on-premise. Ch.6 lección 1: empezar simple en `default` antes de endurecer. |
| M4 kubectl | Ch.2 + Ch.6/L3 | Controllers crean Pods. Ch.6 lección 3: verificar siempre context/namespace antes de aplicar. |
| M5 GitOps | Ch.9 + Ch.6/L4 | Ch.9: backup = git con manifests. Ch.6 lección 4: Helm para empaquetar y rollback hasta tener CD. |
| M6 FreshRSS | Ch.4 + Ch.9 | Readiness (pre-live) vs liveness (restart). Ch.9: HA ≠ backup, los PVs no se recuperan solos. |
| M7 saa-quiz | Ch.8 | Auditoría con polaris/popeye: probes, image tags, requests/limits, security contexts (`runAsRootAllowed:false`), Secrets y ServiceAccounts. Sin manifiestos: categorías a chequear. |
| M8 Actions | Ch.7 | Patrón CI→CD: CI hace build/push de imagen, el CD actualiza el cluster. Cuidado con mezclar contextos/namespaces. Keel del libro está datado (GCR/PubSub): nosotros GHCR + Actions. |
| Final | Ch.9 + Ch.6/L6 | Plan DR contra error humano y fallo de disco. Ch.6 lección 6: ventanas de cambio observables. |

## Brechas honestas (el libro NO cubre, lo ponemos nosotros)

- Services ClusterIP/NodePort, PV/PVC/StorageClass, ConfigMaps/Secrets como objetos, Namespaces: solo menciones. Nuestros YAMLs son agregado propio validado con `kubectl dry-run` + kubeconform.
- GitHub Actions: no mencionado. El patrón CI→CD sí.
- k3s single-node, TLS con cert-manager, Postgres: no cubiertos. Postgres se migra como Deployment + PVC siguiendo la lógica de StatefulSets del Ch.2/Ch.9, no receta del libro.
- RBAC manifiestos, SealedSecrets, securityContext completo: el libro solo audita (Ch.8), no enseña a escribirlos.

## Notas de vigencia (2019 → 2026)

- `helm.md` usa Helm 2 con Tiller (`helm init`): HOY es Helm 3+ sin Tiller. No usar `helm init`.
- Heapster mencionado en Ch.4: muerto. Hoy metrics-server.
- APIs `extensions/v1beta1`: hoy `apps/v1`, `networking.k8s.io/v1`. Nuestros manifiestos usan las actuales.
- Precios y versiones de EKS/AKS/GKE del Ch.5/6: desactualizados. Valen los principios (start simple, static IPs, update windows), no los números.
- Spinnaker/Keel del Ch.7: no los usamos. Nuestro CD es GitHub Actions + `kubectl apply`.

## Lecciones del Ch.6 que son regla del bootcamp

1. Start simple (default primero).
2. Always know your context (`--context`, `--namespace` explícitos).
3. Pocos Ingress con IP/DNS estable (no `LoadBalancer` por app).
4. Ventanas de cambio observables para upgrades.
