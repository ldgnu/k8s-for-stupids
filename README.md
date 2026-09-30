# ⎈ k8s-for-stupids

**Aprendé Kubernetes haciendo, no mirando.** Plataforma interactiva del bootcamp *De Docker suelto a Kubernetes*: leés el módulo, respondés el quiz (si fallás te explica por qué), hacés los ejercicios en tu compu y pegás tus logs reales para validar.

**Live demo:** https://ldgnu.github.io/k8s-for-stupids/

> *Learn Kubernetes by doing, not watching. Interactive bootcamp platform: read the module, answer the quiz (wrong answers get explained), do the exercises on your machine and paste your real logs to validate. ES/EN switcher on the top bar.*

## Cómo se usa (3 pasos)

1. **Lee** — cada módulo está completo acá mismo, en español e inglés.
2. **Respondé** — 5 preguntas por módulo. Cada error te dice *por qué está mal*, *cuál es la posta* y *qué releer*. 10pts al primer intento, 5 si corregís.
3. **Hacé y pegá** — ejercicios hands-on + validador donde pegás salidas reales (`kubectl get nodes`, `docker inspect`...) y te dice si están bien o qué corregir.

**Módulo aprobado = quiz 4/5 + 1 log válido.** Tu score (/500), tu rango (de `CrashLoopBackOff` a `Cluster Admin`) y tu reporte compartible viven en tu navegador: nada se sube a ningún lado.

## Los 10 módulos

| # | Módulo | Libro base |
|---|---|---|
| M0 | Git y GitHub | — (prerrequisito nuestro) |
| M1 | Inventario Docker | Ch.1 |
| M2 | Historia y conceptos K8s | Ch.1 + Ch.2 |
| M3 | Instalación k3s + kubectl | Ch.5 + Ch.6/L1 |
| M4 | kubectl supervivencia | Ch.2 + Ch.6/L3 |
| M5 | Estructura GitOps | Ch.9 + Ch.6/L4 |
| M6 | Lab FreshRSS (migración real) | Ch.4 + Ch.9 |
| M7 | Lab saa-quiz + GHCR | Ch.8 |
| M8 | GitHub Actions | Ch.7 |
| Final | Apagado Docker gradual | Ch.9 + Ch.6/L6 |

Libro: [*An Introduction to Kubernetes* (Leverege, 2019)](https://github.com/pdf4j/kubernetes-book). Ver `src/content/11-FUENTES-kubernetes-book.md` para el mapeo completo, brechas honestas y notas de vigencia 2019→2026.

## Correr local con Docker

```bash
docker compose up --build -d
# http://localhost:8095
```

## Llevarlo a Kubernetes (tu Lab 3)

Mismo flujo que cualquier app del bootcamp: build → push a GHCR → Deployment + Service. Sin PVC porque no hay base de datos (el progreso es `localStorage` del navegador).

```bash
docker build -t ghcr.io/TU_USER/k8s-for-stupids:latest .
docker push ghcr.io/TU_USER/k8s-for-stupids:latest
# kubectl apply -f infra/k8s/apps/k8s-for-stupids/
```

## Stack a propósito simple

HTML + CSS + JS puro, cero dependencias, cero build. `nginx:alpine` lo sirve. Si entendés estos 3 archivos, entendés toda la app:

```
src/
  index.html  — layout terminal
  styles.css  — tema oscuro/claro, responsive
  app.js      — i18n, quiz, ejercicios, validador, reporte, mini render md
  data/       — modules, quizzes_{es,en}, validators_{es,en}, exercises_{es,en}
  content/    — los 11 módulos .md (+ en/)
```

Lo que se hizo y en qué orden está en [`docs/QUE-SE-HIZO.md`](docs/QUE-SE-HIZO.md).
