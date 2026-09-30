# Outblast Learn Platform — Design v1 (local first, K8s later)

## 1. Idea in one sentence
You learn the bootcamp inside an app that you yourself are going to migrate to K8s. The app teaches you and at the same time it is your Lab 3.

## 2. How you learn inside
- You read the module (we reuse your `docs/bootcamp/*.md` as-is, without duplicating).
- You answer a 5-question quiz per module. If you fail, it doesn't just say "wrong", it says why and which part of the module to revisit.
- You paste real logs (`kubectl get nodes`, `kubectl get pods`, `docker inspect`) and the app validates with patterns whether it's right or what to fix.
- You advance only with 4/5 on the quiz + 1 valid log. Progress in `localStorage` (no backend so the deploy stays simple).

## 3. Architecture for learning (not the most pro, the most didactic)
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

Why static first:
1. A single port 80, a single image, zero DB. Just like `freshrss` but simpler.
2. Same flow you are going to use in saa-quiz: `docker build -> push a GHCR -> Deployment K8s`.
3. When you master that, we add a Python backend + SQLite + PVC and you learn state (phase 2).

## 4. Data format (you will fill it in, I give you the template)

`quizzes.json` per module:
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

`validators.json` per lab:
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

## 5. Build plan
- Step 1 (today): we build a minimal `platform/src` that reads local `quizzes.json` and `validators.json`. `docker compose up` on your PC.
- Step 2: we import your 10 modules as plain HTML (basic md->html conversion, no weird libraries).
- Step 3: we complete 5 questions per module (we start with M0-M2, the rest later).
- Step 4: `docker build + push a GHCR` just like saa-quiz.
- Step 5: `infra/k8s/apps/outblast-learn/` with namespace+pvc? no, only deployment+service (stateless). Port-forward, then Ingress. That is your real Lab 3.

## 6. What I need from you to start
Tell me:
1. Name? I propose `outblast-learn`.
2. Do we start with M0-M2 + validator for `git log` and `kubectl get nodes` or do you want all 10 modules at once?
3. Do we create it in `platform/` inside this same repo?

If you say yes, I create the skeleton and you test it with local `docker compose up`.
