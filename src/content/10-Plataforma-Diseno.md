# Plataforma Outblast Learn — Diseño v1 (local primero, K8s después)

## 1. Idea en una frase
Aprendes el bootcamp dentro de una app que tú mismo vas a migrar a K8s. La app te enseña y a la vez es tu Lab 3.

## 2. Cómo aprendes adentro
- Lees el módulo (reusamos tus `docs/bootcamp/*.md` tal cual, sin duplicar).
- Respondes quiz de 5 preguntas por módulo. Si fallas, no solo dice "mal", dice por qué y a qué parte del módulo volver.
- Pegás logs reales (`kubectl get nodes`, `kubectl get pods`, `docker inspect`) y la app valida con patrones si está bien o qué corregir.
- Avanzas solo con 4/5 en quiz + 1 log válido. Progreso en `localStorage` (sin backend para no complicar el deploy).

## 3. Arquitectura para aprender (no la más pro, la más didáctica)
```
platform/
  Dockerfile            # nginx:alpine, copia src/ -> /usr/share/nginx/html
  docker-compose.yml    # local: puerto 8080:80
  src/
    index.html          # 3 vistas: Módulos / Quiz / Validador logs
    app.js              # sin framework, JS puro para que entiendas todo
    styles.css
    data/
      modules.json      # índice generado de docs/bootcamp/
      quizzes.json      # preguntas + opciones + correcta + porqué
      validators.json   # regex por lab
```

Por qué estático primero:
1. Un solo puerto 80, una sola imagen, cero DB. Igual que `freshrss` pero más simple.
2. Mismo flujo que vas a usar en saa-quiz: `docker build -> push a GHCR -> Deployment K8s`.
3. Cuando domines eso, le agregamos backend Python + SQLite + PVC y aprendes estado (fase 2).

## 4. Formato de datos (lo vas a llenar tú, yo te doy plantilla)

`quizzes.json` por módulo:
```json
{
  "m0-git": [
    {
      "q": "¿Qué hace `git add`?",
      "options": ["Guarda foto", "Marca para próxima foto", "Sube a GitHub"],
      "answer": 1,
      "why_wrong": ["Eso es commit", "Eso es push"],
      "why": "`add` pasa a staging. `commit` guarda foto. `push` sube.",
      "ref": "01-Modulo-0-Git-GitHub.md#area-de-trabajo"
    }
  ]
}
```

`validators.json` por lab:
```json
{
  "k3s-nodes": {
    "title": "M3: kubectl get nodes",
    "must_contain": ["Ready"],
    "must_not_contain": ["NotReady"],
    "success": "Nodo Ready. Puedes seguir a M4.",
    "fail_hint": "Si dice NotReady mira `journalctl -u k3s`. Si no hay salida pegaste otro comando."
  },
  "freshrss-pods": {
    "must_contain": ["freshrss", "Running"],
    "must_not_contain": ["CrashLoopBackOff", "ImagePullBackOff"],
    "success": "Pod Running.",
    "fail_hint": "CrashLoop = mira logs --previous. ImagePull = nombre/tag mal."
  }
}
```

## 5. Plan de construcción
- Paso 1 (hoy): armamos `platform/src` mínimo que lea `quizzes.json` y `validators.json` locales. `docker compose up` en tu PC.
- Paso 2: importamos tus 10 módulos como HTML simple (conversión md->html básica, sin librerías raras).
- Paso 3: completamos 5 preguntas por módulo (empezamos M0-M2, resto después).
- Paso 4: `docker build + push a GHCR` igual que saa-quiz.
- Paso 5: `infra/k8s/apps/outblast-learn/` con namespace+pvc? no, solo deployment+service (sin estado). Port-forward, después Ingress. Ese es tu Lab 3 real.

## 6. Qué necesito de ti para arrancar
Dime:
1. ¿Nombre? Propongo `outblast-learn`.
2. ¿Empezamos con M0-M2 + validador de `git log` y `kubectl get nodes` o quieres los 10 módulos de una?
3. ¿Lo creamos en `platform/` dentro de este mismo repo?

Si dices sí, creo el esqueleto y lo pruebas con `docker compose up` local.
