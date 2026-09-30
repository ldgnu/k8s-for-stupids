# Module 0 — Git and GitHub, your engineer notebook

## 1. Why this module comes first

Without Git there is no serious migration. You will break YAMLs, you will want to go back. Git is the "undo" button for the whole bootcamp.

Git is not GitHub:
- **Git** = program on your PC that saves versions in `.git/`.
- **GitHub** = site that stores those versions in the cloud so you don't lose them and can review them.

Everything you learn here applies equally to Azure DevOps, GitLab, whatever. Only the remote URL changes.

## 2. What you need to truly understand

### The workspace has 3 states

1. **Working directory:** files you edited and Git isn't watching yet.
2. **Staging:** files you marked with `git add` for the next commit.
3. **Repository:** snapshots already saved with `git commit`.

```bash
git status        # ¿en qué estado estoy?
git diff          # ¿qué cambié y aún no subí a staging?
git diff --staged # ¿qué ya está en staging?
```

If `git status` says `nada para hacer commit, el árbol limpio`, it means everything you did already has a snapshot. Don't force another commit.

### Commit = snapshot with a message

```bash
git add docs/bootcamp/00-INDICE-Bootcamp-Outblast.md
git commit -m "docs: agrega indice bootcamp"
```

Format we use in this course:
- `docs:` text only, inventory, notes.
- `k8s:` YAML manifests.
- `ci:` GitHub Actions workflows.
- `fix:` fixes something you broke.

Bad: `cambios`, `update`, `asdf`. In 2 weeks you won't know what it was.

See history:
```bash
git log --oneline -10
git show HEAD --stat
```

### Branches = copies for experimenting

`main` is what works. You never experiment on `main`.

```bash
git branch                # ver ramas
git checkout -b lab/freshrss   # crear y moverte a rama de lab
# ... trabajas, commiteas ...
git checkout main
git merge lab/freshrss
```

On GitHub you merge with a Pull Request so you can read the diff first.

### Remote = copy in the cloud

```bash
git remote -v
# origin  git@github.com:ldgnu/outblast-migrate-k8s.git (fetch)
# origin  git@github.com:ldgnu/outblast-migrate-k8s.git (push)
```

You only add it once. If you get the URL wrong:
```bash
git remote remove origin
git remote add origin git@github.com:ldgnu/outblast-migrate-k8s.git
```

`git push -u origin main` uploads your branch and links it. After that just `git push` and `git pull` are enough.

Errors you've already seen and what they mean:
- `error: remoto origin ya existe` -> you tried `add` twice. Use `set-url` or `remove` + `add`.
- `ERROR: Repository not found` -> the repo doesn't exist on GitHub with that exact name, or it's private and your SSH has no access. Check the name letter by letter and `ssh -T git@github.com`.
- `fatal: 'origitn' does not appear` -> typo. It's `origin`.
- `nada para hacer commit` -> not an error. Everything is already saved.

Authentication:
- SSH `git@github.com:...` uses your key in `~/.ssh/id_ed25519`. Test with `ssh -T git@github.com`; it should say `Hi ldgnu!`.
- HTTPS `https://github.com/...` asks for a token (PAT), not a password.

## 3. .gitignore, what never gets uploaded

Your current `.gitignore`:
```
*.env
*secret*.yaml
*secrets*.yaml
```

Why: `ADMIN_PASSWORD`, `JWT_SECRET_KEY`, `*.db` don't go into Git even if the repo is private. They leak by accident and stay in history forever.

If you already pushed a secret by mistake, deleting the file is not enough. You have to rotate the secret and clean history with `git filter-repo`. Better to never push it.

For K8s we store `secret.example.yaml` with fake values, and we create the real one with `kubectl create secret` without committing.

## 4. Lab for this module

1. Create branch `lab/git-practica`:
```bash
git checkout -b lab/git-practica
echo "# prueba" >> docs/prueba.txt
git status
git add docs/prueba.txt
git commit -m "docs: prueba de rama"
git push -u origin lab/git-practica
```
2. Go to GitHub, open a Pull Request, read it, Merge it, delete the branch.
3. Back to main and update:
```bash
git checkout main
git pull
git branch -d lab/git-practica
rm docs/prueba.txt
git add -A
git commit -m "docs: limpia prueba"
git push
```

## 5. Validation to move on to Module 1

- `git log --oneline -5` shows your commits with `docs:/k8s:` prefixes.
- `git status` clean.
- `git remote -v` points to `ldgnu/outblast-migrate-k8s`.
- You can explain what `add`, `commit`, `push`, `pull` do without looking at notes.

If you fail here, the rest of the bootcamp becomes a mess of lost files.
