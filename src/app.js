/* k8s-for-stupids — ES/EN, light/dark, quiz + ejercicios + logs + reporte. Sin dependencias. */
const $ = (s) => document.querySelector(s);
const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
};
const I18N = {
  es: {
    subtitle: "ldgnu@outblast:~$ ./learn — 10 módulos · quiz con porqué · ejercicios · validador de logs",
    boot: "cargando 10 módulos... quiz 4/5 + 1 log para aprobar. Sin atajos.",
    read: "01 · lee", quiz: "02 · quiz", ex: "03 · ejercicios", valid: "04 · valida tu log", report: "$ ./mi-reporte",
    need45: "necesitas 4/5", firstTry: "10pts al primer intento, 5 si corregiste",
    correct: "exit 0 — correcto, bien ahí.", wrong: "exit 1 — te equivocaste.",
    whyWrong: "Por qué está mal:", theFix: "La posta:", reread: "Relee:",
    modPass: "MÓDULO APROBADO", quizOkNeedLog: "quiz OK — falta pegar el log abajo para cerrar el módulo.",
    nextMod: "Bien ahí. Pasá al siguiente módulo.", correctas: "correctas",
    noLog: "$ validator — este módulo no pide log.", paste: "pega acá la salida tal cual...",
    validate: "./validate", reset: "reset progreso", empty: "Vacío. Pega algo.",
    okLog: "exit 0", failLog: "exit 1 — falla.", missing: "Falta:", noMatch: "No matchea:", extra: "Sobra (indica error):",
    alreadyValid: "Ya validado antes.", score: "score", mods: "módulos", labs: "labs", exercises: "ejercicios",
    total: "score total", rank: "rango", copy: "copiar reporte para compartir", copied: " copiado.",
    copyFail: " no se pudo copiar, selecciona el texto.", pass: "pass", lab: "lab",
    exerciseDone: "lo hice", reportUser: "$ ./mi-reporte --user",
    heroTitle: "¿Primera vez acá? Tranqui, es así:",
    heroSteps: ["<b>Lee</b> el módulo (sección 01, el texto está acá mismo).", "<b>Respondé</b> el quiz (sección 02). Si fallás te explico por qué, sin nota.", "<b>Hacé</b> los ejercicios en tu compu y <b>pegá</b> el log para validar (secciones 03 y 04)."],
    heroNote: "4 de 5 en el quiz + 1 log válido = módulo aprobado. Nadie ve tu progreso, queda en tu navegador.",
    rankHi: {"CrashLoopBackOff": "recién arrancás, todo bien", "Pending": "calentando motores", "ContainerCreating": "armando tu cluster mental", "Running": "ya vas andando solo", "Ready": "listo para migrar de verdad", "Cluster Admin": "ya podés enseñar a otros"},
    shareText: (u, p, r, m, t, l, lt, e, et) => `⎈ k8s-for-stupids — reporte de ${u}\nScore: ${p}/500 · Rango: ${r}\nMódulos: ${m}/${t} · Labs: ${l}/${lt} · Ejercicios: ${e}/${et}`
  },
  en: {
    subtitle: "ldgnu@outblast:~$ ./learn — 10 modules · quiz with why · exercises · log validator",
    boot: "loading 10 modules... quiz 4/5 + 1 log to pass. No shortcuts.",
    read: "01 · read", quiz: "02 · quiz", ex: "03 · exercises", valid: "04 · validate your log", report: "$ ./my-report",
    need45: "you need 4/5", firstTry: "10pts first try, 5 if you corrected",
    correct: "exit 0 — correct, nice.", wrong: "exit 1 — you got it wrong.",
    whyWrong: "Why it's wrong:", theFix: "The truth:", reread: "Re-read:",
    modPass: "MODULE PASSED", quizOkNeedLog: "quiz OK — paste the log below to close the module.",
    nextMod: "Nice. Move to the next module.", correctas: "correct",
    noLog: "$ validator — this module needs no log.", paste: "paste the raw output here...",
    validate: "./validate", reset: "reset progress", empty: "Empty. Paste something.",
    okLog: "exit 0", failLog: "exit 1 — fails.", missing: "Missing:", noMatch: "No match:", extra: "Extra (signals error):",
    alreadyValid: "Already validated.", score: "score", mods: "modules", labs: "labs", exercises: "exercises",
    total: "total score", rank: "rank", copy: "copy report to share", copied: " copied.",
    copyFail: " couldn't copy, select the text.", pass: "pass", lab: "lab",
    exerciseDone: "done it", reportUser: "$ ./my-report --user",
    heroTitle: "First time here? No stress, it works like this:",
    heroSteps: ["<b>Read</b> the module (section 01, the text is right here).", "<b>Answer</b> the quiz (section 02). If you fail I explain why, no grades.", "<b>Do</b> the exercises on your machine and <b>paste</b> the log to validate (sections 03 and 04)."],
    heroNote: "4 of 5 on the quiz + 1 valid log = module passed. Nobody sees your progress, it stays in your browser.",
    rankHi: {"CrashLoopBackOff": "just starting out, that's fine", "Pending": "warming up", "ContainerCreating": "building your mental cluster", "Running": "you're walking on your own", "Ready": "ready to migrate for real", "Cluster Admin": "you can teach others"},
    shareText: (u, p, r, m, t, l, lt, e, et) => `⎈ k8s-for-stupids — ${u}'s report\nScore: ${p}/500 · Rank: ${r}\nModules: ${m}/${t} · Labs: ${l}/${lt} · Exercises: ${e}/${et}`
  }
};
let LANG = store.get("kfs_lang", "es");
const t = (k) => I18N[LANG][k];
let MODULES = [], QUIZZES = {}, VALIDATORS = {}, EXS = {};
let cur = store.get("kfs_cur", "m0-git");
let answers = store.get("kfs_answers", {});
let tries = store.get("kfs_tries", {});
let logsOk = store.get("kfs_logs", {});
let exDone = store.get("kfs_ex", {});
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
function scoreTotal() { return MODULES.reduce((a, m) => a + scoreMod(m.quiz), 0); }
function exCount() {
  let d = 0, n = 0;
  MODULES.forEach((m) => {
    const list = EXS[m.id] || [];
    n += list.length;
    list.forEach((_, i) => { if ((exDone[m.id] || [])[i]) d++; });
  });
  return [d, n];
}
function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function inline(s) {
  s = esc(s);
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return s;
}
function md(src) {
  const lines = src.split("\n");
  let html = "", inCode = false, inList = null;
  const closeList = () => { if (inList) { html += inList === "ul" ? "</ul>" : "</ol>"; inList = null; } };
  for (const ln of lines) {
    if (ln.startsWith("```")) {
      if (inCode) { html += "</code></pre>"; inCode = false; }
      else { closeList(); html += "<pre><code>"; inCode = true; }
      continue;
    }
    if (inCode) { html += esc(ln) + "\n"; continue; }
    let m;
    if ((m = ln.match(/^(#{1,3})\s+(.*)/))) { closeList(); html += `<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`; }
    else if (/^\s*---+\s*$/.test(ln)) { closeList(); html += "<hr>"; }
    else if ((m = ln.match(/^>\s?(.*)/))) { closeList(); html += `<blockquote>${inline(m[1])}</blockquote>`; }
    else if ((m = ln.match(/^\s*[-*]\s+(.*)/))) { if (inList !== "ul") { closeList(); html += "<ul>"; inList = "ul"; } html += `<li>${inline(m[1])}</li>`; }
    else if ((m = ln.match(/^\s*\d+[.)]\s+(.*)/))) { if (inList !== "ol") { closeList(); html += "<ol>"; inList = "ol"; } html += `<li>${inline(m[1])}</li>`; }
    else if (/^\s*\|.*\|\s*$/.test(ln)) { closeList(); html += `<p>${inline(ln)}</p>`; }
    else if (ln.trim() === "") { closeList(); }
    else { closeList(); html += `<p>${inline(ln)}</p>`; }
  }
  closeList();
  return html;
}
async function load() {
  applyTheme();
  applyLang();
  MODULES = await (await fetch("data/modules.json")).json();
  await loadLangData();
  const wi = $("#whoami");
  wi.value = whoami === "anon" ? "" : whoami;
  wi.onchange = () => { whoami = wi.value.trim() || "anon"; store.set("kfs_name", whoami); renderMods(); };
  $("#langBtn").onclick = () => {
    LANG = LANG === "es" ? "en" : "es";
    store.set("kfs_lang", LANG);
    applyLang();
    loadLangData().then(() => select(cur));
  };
  $("#themeBtn").onclick = () => {
    const h = document.documentElement;
    h.dataset.theme = h.dataset.theme === "light" ? "dark" : "light";
    store.set("kfs_theme", h.dataset.theme);
  };
  bootType();
  renderMods();
  select(cur);
}
async function loadLangData() {
  QUIZZES = await (await fetch(`data/quizzes_${LANG}.json`)).json();
  VALIDATORS = await (await fetch(`data/validators_${LANG}.json`)).json();
  EXS = await (await fetch(`data/exercises_${LANG}.json`)).json();
}
function applyTheme() {
  document.documentElement.dataset.theme = store.get("kfs_theme", "dark");
}
function applyLang() {
  document.documentElement.lang = LANG;
  $("#langBtn").textContent = LANG === "es" ? "ES" : "EN";
  $("#subtitle").textContent = t("subtitle");
  renderHero();
}
function renderHero() {
  const h = $("#hero");
  if (!h) return;
  h.innerHTML = `<h3>${t("heroTitle")}</h3><ol>${t("heroSteps").map((s) => `<li>${s}</li>`).join("")}</ol><div class="hi">${t("heroNote")}</div>`;
}
function bootType() {
  const msg = t("boot");
  const el = $("#typed");
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { el.textContent = msg; return; }
  let i = 0, done = false;
  const finish = () => { if (!done) { done = true; clearInterval(id); el.textContent = msg; } };
  const id = setInterval(() => { el.textContent = msg.slice(0, ++i); if (i >= msg.length) finish(); }, 14);
  document.getElementById("topbar").onclick = (e) => { if (e.target.tagName !== "BUTTON") finish(); };
  document.getElementById("boot").onclick = finish;
}
function titleOf(m) { return LANG === "en" ? m.title_en : m.title; }
function fileOf(m) { return LANG === "en" ? m.file_en : m.file; }
function modPassed(m) {
  const q = QUIZZES[m.quiz] || [];
  const okQ = (answers[m.id] || []).filter((a, i) => a === q[i]?.answer).length;
  return okQ >= 4 && (m.validator ? !!logsOk[m.validator] : true);
}
function renderMods() {
  const box = $("#mods");
  box.innerHTML = "";
  MODULES.forEach((m) => {
    const q = QUIZZES[m.quiz] || [];
    const okQ = (answers[m.id] || []).filter((a, i) => a === q[i]?.answer).length;
    const done = modPassed(m);
    const b = document.createElement("button");
    b.className = "mod" + (m.id === cur ? " active" : "") + (done ? " done" : "");
    b.innerHTML = `${esc(titleOf(m))} <span class="st">${done ? t("pass") : okQ + "/" + q.length}</span>`;
    b.onclick = () => select(m.id);
    box.appendChild(b);
  });
  const total = MODULES.filter(modPassed).length;
  const pts = scoreTotal();
  $("#total").textContent = `${t("score")}: ${pts}/500 · ${t("mods")}: ${total}/${MODULES.length}`;
  $("#bar").style.width = `${Math.round((pts / 500) * 100)}%`;
  renderReport();
}
function select(id) {
  cur = id;
  store.set("kfs_cur", id);
  const m = MODULES.find((x) => x.id === id);
  $("#mtitle").textContent = titleOf(m);
  renderDoc(m);
  renderQuiz(m);
  renderEx(m);
  renderValidator(m);
  renderMods();
}
async function renderDoc(m) {
  const box = $("#doc");
  box.innerHTML = `<h3>$ ${t("read")}</h3><p class="muted">${esc(fileOf(m))}${m.books && m.books !== "-" ? ` · ${LANG === "en" ? "book" : "libro"} ${esc(m.books)}` : ""}</p><div class="doc"><p class="muted">…</p></div>`;
  try {
    const txt = await (await fetch(fileOf(m))).text();
    box.querySelector(".doc").innerHTML = md(txt);
  } catch {
    box.querySelector(".doc").innerHTML = `<p class="err">No se pudo cargar el archivo (¿abierto como file://? usa docker).</p>`;
  }
}
function renderQuiz(m) {
  const list = QUIZZES[m.quiz] || [];
  const box = $("#quiz");
  box.innerHTML = `<h3>$ ${t("quiz")} --modulo ${m.id}</h3>`;
  if (!answers[m.id]) answers[m.id] = [];
  list.forEach((it, qi) => {
    const div = document.createElement("div");
    div.innerHTML = `<p><span class="ps1" style="color:var(--k8s-ink)">Q${qi + 1}</span> ${esc(it.q)} <span class="muted">[${scoreQ(m.id, qi)}pts]</span></p>`;
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
          ? `<span class="ok">${t("correct")}</span> ${esc(it.why)}`
          : `<span class="err">${t("wrong")}</span><br><b>${t("whyWrong")}</b> ${esc(it.why_wrong?.[oi] || it.why)}<br><b>${t("theFix")}</b> ${esc(it.why)}<br><span class="muted">${t("reread")} ${esc(it.ref)}</span>`;
        $("#quiz").children[1 + qi].appendChild(w);
        w.scrollIntoView({block: "nearest"});
      };
      div.appendChild(b);
    });
    box.appendChild(div);
  });
  const ok = (answers[m.id] || []).filter((a, i) => a === list[i]?.answer).length;
  const p = document.createElement("p");
  const labOk = m.validator ? !!logsOk[m.validator] : true;
  if (ok >= 4 && labOk) {
    p.innerHTML = `<div class="term" style="border-color:var(--ok)"><span class="ok">✔ ${t("modPass")} — ${ok}/${list.length} ${t("correctas")} · ${scoreMod(m.id)}pts${m.validator ? " · log ✓" : ""}.</span><br>${t("nextMod")} ${esc(whoami)}.</div>`;
  } else if (ok >= 4) {
    p.innerHTML = `${t("score")}: <b>${ok}/${list.length} ${t("correctas")} · ${scoreMod(m.id)}/${list.length * 10}pts</b> <span class="ok">quiz OK</span> <span class="err">— ${t("quizOkNeedLog")}</span>`;
  } else {
    p.innerHTML = `${t("score")}: <b>${ok}/${list.length} ${t("correctas")} · ${scoreMod(m.id)}/${list.length * 10}pts</b> <span class="muted">${t("need45")} (${t("firstTry")})</span>`;
  }
  box.appendChild(p);
}
function renderEx(m) {
  const box = $("#ex");
  const list = EXS[m.id] || [];
  box.innerHTML = `<h3>$ ${t("ex")}</h3>`;
  if (!exDone[m.id]) exDone[m.id] = [];
  list.forEach((e, i) => {
    const div = document.createElement("div");
    div.className = "ex" + (exDone[m.id][i] ? " done" : "");
    div.innerHTML = `<label><input type="checkbox" ${exDone[m.id][i] ? "checked" : ""}> <b>${esc(e.t)}</b> <span class="muted">[${exDone[m.id][i] ? "✓ " + t("exerciseDone") : t("exerciseDone") + "?"}]</span></label><ol>${e.steps.map((s) => `<li>${inline(s)}</li>`).join("")}</ol>`;
    div.querySelector("input").onchange = (ev) => {
      exDone[m.id][i] = ev.target.checked;
      store.set("kfs_ex", exDone);
      renderEx(m); renderReport();
    };
    box.appendChild(div);
  });
}
function renderValidator(m) {
  const box = $("#valid");
  box.innerHTML = "";
  if (!m.validator) { box.innerHTML = `<p class="muted">${t("noLog")}</p>`; return; }
  const v = VALIDATORS[m.validator];
  box.innerHTML = `<h3>$ ${t("valid")} ${m.validator}</h3><p class="muted">${esc(v.prompt)}</p>`;
  const ta = document.createElement("textarea");
  ta.placeholder = t("paste");
  const btn = document.createElement("button");
  btn.className = "btn";
  btn.textContent = t("validate");
  const out = document.createElement("div");
  btn.onclick = () => {
    const txt = ta.value;
    const miss = (v.must_contain || []).filter((s) => !txt.includes(s));
    const badm = (v.must_match || []).filter((re) => { try { return !new RegExp(re).test(txt); } catch { return true; } });
    const bad = (v.must_not_contain || []).filter((s) => txt.includes(s));
    if (!txt.trim()) { out.innerHTML = `<p class="err">${t("empty")}</p>`; return; }
    if (miss.length === 0 && badm.length === 0 && bad.length === 0) {
      logsOk[m.validator] = true; store.set("kfs_logs", logsOk); renderMods();
      out.innerHTML = `<p class="ok">${t("okLog")} — ${esc(v.success)}</p>`;
    } else {
      out.innerHTML = `<p class="err">${t("failLog")}</p>
        ${miss.map((s) => `<div>${t("missing")} <code>${esc(s)}</code></div>`).join("")}
        ${badm.map((s) => `<div>${t("noMatch")} <code>${esc(s)}</code></div>`).join("")}
        ${bad.map((s) => `<div>${t("extra")} <code>${esc(s)}</code></div>`).join("")}
        <div class="why err">${esc(v.fail_hint)}</div>`;
    }
  };
  const rst = document.createElement("button");
  rst.className = "btn ghost";
  rst.textContent = t("reset");
  rst.style.marginLeft = "8px";
  rst.onclick = () => { localStorage.clear(); location.reload(); };
  box.append(ta, document.createElement("br"), btn, rst, out);
  if (logsOk[m.validator]) out.innerHTML = `<p class="ok">${t("alreadyValid")}</p>`;
}
function renderReport() {
  const box = $("#report");
  if (!box || !MODULES.length) return;
  const pts = scoreTotal();
  const labs = MODULES.filter((m) => m.validator && logsOk[m.validator]).length;
  const totalLabs = MODULES.filter((m) => m.validator).length;
  const passed = MODULES.filter(modPassed).length;
  const [ed, en] = exCount();
  const rows = MODULES.map((m) => {
    const q = QUIZZES[m.quiz] || [];
    const okQ = (answers[m.id] || []).filter((a, i) => a === q[i]?.answer).length;
    const lab = m.validator ? (logsOk[m.validator] ? "✓" : "·") : "-";
    return `<div>${modPassed(m) ? '<span class="ok">' + t("pass") + "</span>" : '<span class="muted">····</span>'} ${esc(titleOf(m))} <span class="muted">${scoreMod(m.quiz)}/${q.length * 10}pts ${t("lab")}:${lab}</span></div>`;
  }).join("");
  box.innerHTML = `<h3>${t("reportUser")} ${esc(whoami)}</h3>
    <div class="term">${t("total")}: <b>${pts}/500</b> · ${t("rank")}: <b>${rank(pts)}</b> <span class="rankhi">(${t("rankHi")[rank(pts)]})</span><br>${t("mods")}: ${passed}/${MODULES.length} · ${t("labs")}: ${labs}/${totalLabs} · ${t("exercises")}: ${ed}/${en}</div>
    <div style="margin-top:10px">${rows}</div>`;
  const btn = document.createElement("button");
  btn.className = "btn ghost";
  btn.style.marginTop = "10px";
  btn.textContent = t("copy");
  const msg = document.createElement("span");
  msg.className = "muted";
  btn.onclick = async () => {
    const txt = t("shareText")(whoami, pts, rank(pts), passed, MODULES.length, labs, totalLabs, ed, en);
    try { await navigator.clipboard.writeText(txt); msg.textContent = t("copied"); }
    catch { msg.textContent = t("copyFail"); }
  };
  box.append(btn, msg);
}
load();
