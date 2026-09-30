/* k8s-for-stupids — motor quiz + validador, sin dependencias */
const $ = (s) => document.querySelector(s);
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
};
let MODULES = [], QUIZZES = {}, VALIDATORS = {};
let cur = store.get("kfs_cur", "m0-git");
let answers = store.get("kfs_answers", {});
let tries = store.get("kfs_tries", {});
let logsOk = store.get("kfs_logs", {});
let whoami = store.get("kfs_name", "anon");

function rank(s) {
  if (s >= 450) return "Cluster Admin";
  if (s >= 400) return "Ready";
  if (s >= 300) return "Running";
  if (s >= 200) return "ContainerCreating";
  if (s >= 100) return "Pending";
  return "CrashLoopBackOff";
}
function scoreQ(mid, qi) {
  const list = QUIZZES[mid] || [];
  if ((answers[mid] || [])[qi] === list[qi]?.answer) return (tries[mid]?.[qi] || 1) <= 1 ? 10 : 5;
  return 0;
}
function scoreMod(mid) {
  const list = QUIZZES[mid] || [];
  let s = 0;
  list.forEach((_, i) => { s += scoreQ(mid, i); });
  return s;
}
function scoreTotal() {
  return MODULES.reduce((a, m) => a + scoreMod(m.quiz), 0);
}

function renderReport() {
  const box = $("#report");
  if (!box) return;
  const pts = scoreTotal();
  const labs = MODULES.filter((m) => m.validator && logsOk[m.validator]).length;
  const totalLabs = MODULES.filter((m) => m.validator).length;
  const passed = MODULES.filter((m) => {
    const q = QUIZZES[m.quiz] || [];
    return (answers[m.id] || []).filter((a, i) => a === q[i]?.answer).length >= 4;
  }).length;
  const rows = MODULES.map((m) => {
    const q = QUIZZES[m.quiz] || [];
    const okQ = (answers[m.id] || []).filter((a, i) => a === q[i]?.answer).length;
    const lab = m.validator ? (logsOk[m.validator] ? "✓" : "·") : "-";
    return `<div>${okQ >= 4 ? '<span class="ok">pass</span>' : '<span class="muted">····</span>'} ${m.title} <span class="muted">${scoreMod(m.quiz)}/${q.length * 10}pts lab:${lab}</span></div>`;
  }).join("");
  box.innerHTML = `<h3>$ ./mi-reporte --user ${whoami}</h3>
    <div class="term">score total: <b>${pts}/500</b> · rango: <b>${rank(pts)}</b><br>módulos: ${passed}/${MODULES.length} · labs: ${labs}/${totalLabs}</div>
    <div style="margin-top:10px">${rows}</div>`;
  const btn = document.createElement("button");
  btn.className = "btn ghost";
  btn.style.marginTop = "10px";
  btn.textContent = "copiar reporte para compartir";
  const msg = document.createElement("span");
  msg.className = "muted";
  btn.onclick = async () => {
    const txt = `⎈ k8s-for-stupids — reporte de ${whoami}\nScore: ${pts}/500 · Rango: ${rank(pts)}\nMódulos: ${passed}/${MODULES.length} · Labs: ${labs}/${totalLabs}`;
    try { await navigator.clipboard.writeText(txt); msg.textContent = " copiado."; }
    catch { msg.textContent = " no se pudo copiar, selecciona el texto."; }
  };
  box.append(btn, msg);
}
async function load() {
  const wi = document.getElementById("whoami");
  if (wi) {
    wi.value = whoami === "anon" ? "" : whoami;
    wi.onchange = () => { whoami = wi.value.trim() || "anon"; store.set("kfs_name", whoami); renderReport(); };
  }
  MODULES = await (await fetch("data/modules.json")).json();
  QUIZZES = await (await fetch("data/quizzes.json")).json();
  VALIDATORS = await (await fetch("data/validators.json")).json();
  bootType();
  renderMods();
  select(cur);
}
function bootType() {
  const t = "cargando 10 módulos... quiz 4/5 + 1 log para aprobar. Sin atajos.";
  const el = $("#typed");
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { el.textContent = t; return; }
  let i = 0, done = false;
  const finish = () => { if (!done) { done = true; clearInterval(id); el.textContent = t; } };
  const id = setInterval(() => { el.textContent = t.slice(0, ++i); if (i >= t.length) finish(); }, 18);
  document.getElementById("topbar").onclick = finish;
  document.getElementById("boot").onclick = finish;
}
function renderMods() {
  const box = $("#mods");
  box.innerHTML = "";
  MODULES.forEach((m) => {
    const q = QUIZZES[m.quiz] || [];
    const okQ = (answers[m.id] || []).filter((a, i) => a === q[i]?.answer).length;
    const done = okQ >= 4 && (m.validator ? logsOk[m.validator] : true);
    const b = document.createElement("button");
    b.className = "mod" + (m.id === cur ? " active" : "") + (done ? " done" : "");
    b.innerHTML = `${m.title} <span class="st">${done ? "pass" : okQ + "/" + q.length}</span>`;
    b.onclick = () => select(m.id);
    box.appendChild(b);
  });
  const total = MODULES.filter((m) => {
    const q = QUIZZES[m.quiz] || [];
    return (answers[m.id] || []).filter((a, i) => a === q[i]?.answer).length >= 4;
  }).length;
  const pts = scoreTotal();
  $("#total").textContent = `score: ${pts}/500 · módulos: ${total}/${MODULES.length}`;
  $("#bar").style.width = `${Math.round((pts / 500) * 100)}%`;
  renderReport();
}
function select(id) {
  cur = id;
  store.set("kfs_cur", id);
  const m = MODULES.find((x) => x.id === id);
  $("#mtitle").textContent = m.title;
  $("#mref").innerHTML = `Lee: <a href="${m.file}">${m.file}</a> y luego responde abajo.`;
  renderQuiz(m);
  renderValidator(m);
  renderMods();
}
function renderQuiz(m) {
  const list = QUIZZES[m.quiz] || [];
  const box = $("#quiz");
  box.innerHTML = `<h3>$ quiz --modulo ${m.id}</h3>`;
  if (!answers[m.id]) answers[m.id] = [];
  list.forEach((it, qi) => {
    const div = document.createElement("div");
    div.innerHTML = `<p><span class="ps1" style="color:var(--k8s-light)">Q${qi + 1}</span> ${it.q} <span class="muted">[${scoreQ(m.id, qi)}pts]</span></p>`;
    const locked = answers[m.id][qi] === it.answer;
    it.options.forEach((op, oi) => {
      const b = document.createElement("button");
      b.className = "opt";
      b.textContent = `$ ${op}`;
      const chosen = answers[m.id][qi];
      if (chosen !== undefined) {
        if (oi === it.answer) b.classList.add("good");
        if (oi === chosen && chosen !== it.answer) b.classList.add("bad");
      }
      if (locked) b.disabled = true;
      b.onclick = () => {
        if (!tries[m.id]) tries[m.id] = {};
        tries[m.id][qi] = (tries[m.id][qi] || 0) + 1;
        answers[m.id][qi] = oi;
        store.set("kfs_tries", tries);
        store.set("kfs_answers", answers);
        renderQuiz(m); renderMods();
        const w = document.createElement("div");
        w.className = "why" + (oi === it.answer ? "" : " err");
        w.innerHTML = oi === it.answer
          ? `<span class="ok">exit 0 — correcto, bien ahí.</span> ${it.why}`
          : `<span class="err">exit 1 — te equivocaste.</span><br><b>Por qué está mal:</b> ${it.why_wrong?.[oi] || it.why}<br><b>La posta:</b> ${it.why}<br><span class="muted">Relee: ${it.ref}</span>`;
        div.appendChild(w);
      };
      div.appendChild(b);
    });
    box.appendChild(div);
  });
  const ok = (answers[m.id] || []).filter((a, i) => a === list[i]?.answer).length;
  const p = document.createElement("p");
  const labOk = m.validator ? !!logsOk[m.validator] : true;
  if (ok >= 4 && labOk) {
    p.innerHTML = `<div class="term" style="border-color:var(--ok)"><span class="ok">✔ MÓDULO APROBADO — ${ok}/${list.length} correctas · ${scoreMod(m.id)}pts${m.validator ? " · log válido" : ""}.</span><br>Bien ahí, ${whoami}. Pasá al siguiente módulo.</div>`;
  } else if (ok >= 4) {
    p.innerHTML = `score: <b>${ok}/${list.length} correctas · ${scoreMod(m.id)}/${list.length * 10}pts</b> <span class="ok">quiz OK</span> <span class="err">— falta pegar el log abajo para cerrar el módulo.</span>`;
  } else {
    p.innerHTML = `score: <b>${ok}/${list.length} correctas · ${scoreMod(m.id)}/${list.length * 10}pts</b> <span class="muted">necesitas 4/5 (10pts al primer intento, 5 si corregiste)</span>`;
  }
  box.appendChild(p);
}
function renderValidator(m) {
  const box = $("#valid");
  box.innerHTML = "";
  if (!m.validator) { box.innerHTML = `<p class="muted">$ validator — este módulo no pide log.</p>`; return; }
  const v = VALIDATORS[m.validator];
  box.innerHTML = `<h3>$ validator --log ${m.validator}</h3><p class="muted">${v.prompt}</p>`;
  const ta = document.createElement("textarea");
  ta.placeholder = "pega acá la salida tal cual...";
  const btn = document.createElement("button");
  btn.className = "btn";
  btn.textContent = "./validate";
  const out = document.createElement("div");
  btn.onclick = () => {
    const txt = ta.value;
    const miss = (v.must_contain || []).filter((s) => !txt.includes(s));
    const badm = (v.must_match || []).filter((re) => !new RegExp(re).test(txt));
    const bad = (v.must_not_contain || []).filter((s) => txt.includes(s));
    if (!txt.trim()) { out.innerHTML = `<p class="err">Vacío. Pega algo.</p>`; return; }
    if (miss.length === 0 && badm.length === 0 && bad.length === 0) {
      logsOk[m.validator] = true; store.set("kfs_logs", logsOk); renderMods();
      out.innerHTML = `<p class="ok">exit 0 — ${v.success}</p>`;
    } else {
      out.innerHTML = `<p class="err">exit 1 — falla.</p>
        ${miss.map((s) => `<div>Falta: <code>${s}</code></div>`).join("")}
        ${badm.map((s) => `<div>No matchea: <code>${s}</code></div>`).join("")}
        ${bad.map((s) => `<div>Sobra (indica error): <code>${s}</code></div>`).join("")}
        <div class="why err">${v.fail_hint}</div>`;
    }
  };
  const rst = document.createElement("button");
  rst.className = "btn ghost";
  rst.textContent = "reset progreso";
  rst.style.marginLeft = "8px";
  rst.onclick = () => { localStorage.clear(); location.reload(); };
  box.append(ta, document.createElement("br"), btn, rst, out);
  if (logsOk[m.validator]) out.innerHTML = `<p class="ok">Ya validado antes.</p>`;
}
load();
