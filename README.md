# k8s-for-stupids — plataforma para aprender el bootcamp haciendo

App estática (HTML+JS puro, sin backend). Lees el módulo, respondes quiz con corrección explicada, pegas logs y valida. Progreso en `localStorage`.

## Uso local
```bash
docker compose up --build
# abrir http://localhost:8080
```
Sin docker, también anda abriendo `src/index.html`, pero usa docker para aprender el flujo que luego va a K8s.

## Estructura
```
Dockerfile              # nginx:alpine sirve src/
docker-compose.yml      # 8080:80 local
src/
  index.html
  styles.css
  app.js                # motor quiz + validador + progreso
  data/
    modules.json
    quizzes.json        # 5 preguntas x módulo, con porqué
    validators.json     # patrones para pegar logs
content/                # tus 10 módulos .md del bootcamp (solo lectura)
```

## A K8s (fase 2, cuando el quiz ande local)
Mismo flujo que saa-quiz: `docker build + push a GHCR` y `infra/k8s/apps/k8s-for-stupids/` con Deployment + Service ClusterIP. Sin PVC porque no hay DB (progreso en navegador).

## Regla de avance
Quiz 4/5 + 1 log válido = módulo aprobado. Todo queda en tu navegador, nada se sube.
