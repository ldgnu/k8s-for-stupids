# Qué se hizo — bitácora de construcción

De una idea suelta a webapp pública para estudiar Kubernetes en el celu.

## 1. Punto de partida

- Bootcamp de 10 módulos en `outblast-migrate-k8s/docs/bootcamp/` (de Docker a K8s con GitHub Actions).
- Pedido: plataforma donde responder, avanzar con cuestionario, corrección explicada al fallar y validación pegando logs.

## 2. Decisiones

- **Repo nuevo** `k8s-for-stupids` (monorepo no, repo propio compartible).
- **Estática sin backend** (HTML+CSS+JS puro, `nginx:alpine`): el progreso vive en `localStorage`. Cero DB = deploy trivial a Pages, Docker y K8s.
- **Diseño terminal** con skill `frontend-design`: base en solisjavier.com.ar y pumphradio.com.ar (boot con click-to-skip), colores oficiales Kubernetes azul `#326CE5` + blanco, tema oscuro y claro.
- **Libro base**: se descartaron los PDFs sueltos; se usa https://github.com/pdf4j/kubernetes-book (Leverege). Cada módulo cita sus capítulos (`00-FUENTES`).

## 3. Qué tiene hoy

- 10 módulos legibles inline (ES/EN, switcher que persiste).
- Quiz 5 preguntas x módulo (50 ES + 50 EN): explica *por qué está mal*, *la posta* y *qué releer*. 10pts primer intento, 5 si corregís. La pregunta acertada se bloquea.
- 19 ejercicios hands-on con checkbox persistido.
- 6 validadores de logs pegados (regex debe/no-debe contener + pista de arreglo).
- Score /500, rangos con subtítulo humano (`CrashLoopBackOff → recién arrancás, todo bien` … `Cluster Admin → ya podés enseñar a otros`), reporte copiable para compartir.
- Banner `MÓDULO APROBADO` (quiz 4/5 + log si corresponde).
- Responsive mobile-first para estudiar en el celu: módulos colapsables, targets 44px, sin zoom forzado en inputs, instalable (meta mobile-web-app).
- CI a GitHub Pages con Actions (`pages.yml`).

## 4. Bugs cazados con browser real

- Explicación del quiz adjunta a nodo descartado (nunca se veía) → se re-engancha post render + scroll.
- Puerto 8080 ocupado por npm → app en 8095 local.
- Pages 404 inicial → creación del sitio vía API + `enablement: true`.

## 5. Pendiente (Lab 3)

`docker build + push a GHCR` y `Deployment + Service` en k3s — la misma app como ejercicio de migración.
