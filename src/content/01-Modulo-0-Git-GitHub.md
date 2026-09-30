# Módulo 0 — Git y GitHub, tu cuaderno de ingeniero

## 1. Por qué este módulo va primero

Sin Git no hay migración seria. Vas a romper YAMLs, vas a querer volver atrás. Git es el botón de "deshacer" de todo el bootcamp.

Git no es GitHub:
- **Git** = programa en tu PC que guarda versiones en `.git/`.
- **GitHub** = página que guarda esas versiones en la nube para no perderlas y para revisarlas.

Todo lo que aprendas acá sirve igual para Azure DevOps, GitLab, lo que sea. Cambia solo la URL del remoto.

## 2. Qué tienes que entender de verdad

### El área de trabajo tiene 3 estados

1. **Working directory:** archivos que editaste y Git aún no mira.
2. **Staging:** archivos que marcaste con `git add` para el próximo commit.
3. **Repository:** fotos ya guardadas con `git commit`.

```bash
git status        # ¿en qué estado estoy?
git diff          # ¿qué cambié y aún no subí a staging?
git diff --staged # ¿qué ya está en staging?
```

Si `git status` dice `nada para hacer commit, el árbol limpio`, significa que todo lo que hiciste ya tiene foto. No hay que forzar otro commit.

### Commit = foto con mensaje

```bash
git add docs/bootcamp/00-INDICE-Bootcamp-Outblast.md
git commit -m "docs: agrega indice bootcamp"
```

Formato que usamos en este curso:
- `docs:` solo texto, inventario, apuntes.
- `k8s:` manifiestos YAML.
- `ci:` workflows de GitHub Actions.
- `fix:` arregla algo que rompiste.

Mal: `cambios`, `update`, `asdf`. Dentro de 2 semanas no vas a saber qué fue.

Ver historia:
```bash
git log --oneline -10
git show HEAD --stat
```

### Ramas = fotocopias para experimentar

`main` es lo que anda. Nunca experimentas en `main`.

```bash
git branch                # ver ramas
git checkout -b lab/freshrss   # crear y moverte a rama de lab
# ... trabajas, commiteas ...
git checkout main
git merge lab/freshrss
```

En GitHub el merge se hace con Pull Request para poder leer el diff antes.

### Remoto = copia en la nube

```bash
git remote -v
# origin  git@github.com:ldgnu/outblast-migrate-k8s.git (fetch)
# origin  git@github.com:ldgnu/outblast-migrate-k8s.git (push)
```

Solo se agrega una vez. Si te equivocas de URL:
```bash
git remote remove origin
git remote add origin git@github.com:ldgnu/outblast-migrate-k8s.git
```

`git push -u origin main` sube tu rama y la deja linkeada. Después basta `git push` y `git pull`.

Errores que ya viste y qué significan:
- `error: remoto origin ya existe` -> intentaste `add` dos veces. Usa `set-url` o `remove` + `add`.
- `ERROR: Repository not found` -> el repo no existe en GitHub con ese nombre exacto, o es privado y tu SSH no tiene acceso. Verifica nombre letra por letra y `ssh -T git@github.com`.
- `fatal: 'origitn' does not appear` -> typo. Es `origin`.
- `nada para hacer commit` -> no es error. Ya está todo guardado.

Autenticación:
- SSH `git@github.com:...` usa tu llave `~/.ssh/id_ed25519`. Prueba con `ssh -T git@github.com` debe decir `Hi ldgnu!`.
- HTTPS `https://github.com/...` pide token (PAT), no password.

## 3. .gitignore, lo que nunca se sube

Tu `.gitignore` actual:
```
*.env
*secret*.yaml
*secrets*.yaml
```

Por qué: `ADMIN_PASSWORD`, `JWT_SECRET_KEY`, `*.db` no van a Git aunque el repo sea privado. Se filtra por accidente y queda en la historia para siempre.

Si ya subiste un secreto por error, no alcanza con borrar el archivo. Hay que rotar el secreto y limpiar historia con `git filter-repo`. Mejor no subirlo nunca.

Para K8s guardamos `secret.example.yaml` con valores falsos, y el real lo creamos con `kubectl create secret` sin commitear.

## 4. Lab de este módulo

1. Crea rama `lab/git-practica`:
```bash
git checkout -b lab/git-practica
echo "# prueba" >> docs/prueba.txt
git status
git add docs/prueba.txt
git commit -m "docs: prueba de rama"
git push -u origin lab/git-practica
```
2. Anda a GitHub, abre Pull Request, léelo, haz Merge, borra la rama.
3. Vuelve a main y actualiza:
```bash
git checkout main
git pull
git branch -d lab/git-practica
rm docs/prueba.txt
git add -A
git commit -m "docs: limpia prueba"
git push
```

## 5. Validación para pasar al Módulo 1

- `git log --oneline -5` muestra tus commits con prefijos `docs:/k8s:`.
- `git status` limpio.
- `git remote -v` apunta a `ldgnu/outblast-migrate-k8s`.
- Sabes explicar qué hace `add`, `commit`, `push`, `pull` sin mirar apuntes.

Si fallas acá, el resto del bootcamp se vuelve un lío de archivos perdidos.
