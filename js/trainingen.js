// Trainingen: lijst, bekijken, invoeren, Word/PDF uploaden, delen en printen.
import { S, save, esc, uid, clone, db } from "./state.js";
import { mountBoard, boardSVG, presetBoard, normBoard } from "./board.js";
import { pack, shareOrDownload, safeName, EXT, blobToB64, pickFile, openBlob } from "./share.js";
import { toast, fmtDate } from "./ui.js";

const empty = () => ({ id: uid("tr"), titel: "", datum: "", doelen: "", personen: "", aandacht: "", materialen: "", wu: { tekst: "", borden: [] }, oef: [], notesHtml: "", bijlagen: [], updated: Date.now() });
const newOef = () => ({ id: uid("o"), naam: "", tijd: "", doel: "", accent: "", tekst: "", makk: "", moeil: "", borden: [] });
export function normTraining(t) {
  const o = Object.assign(empty(), t || {});
  o.wu = Object.assign({ tekst: "", borden: [] }, o.wu || {}); o.wu.borden = (o.wu.borden || []).map(normBoard);
  o.oef = (Array.isArray(o.oef) ? o.oef : []).map((x) => { const e = Object.assign(newOef(), x); e.borden = (e.borden || []).map(normBoard); return e; });
  o.bijlagen = Array.isArray(o.bijlagen) ? o.bijlagen : [];
  return o;
}
const byId = (id) => S.trainings.find((t) => t.id === id);
const lines = (s) => String(s || "").split(/\n+/).map((x) => x.replace(/^\s*[-•*]\s*/, "").trim()).filter(Boolean);
const textHTML = (s) => { const l = lines(s); if (!l.length) return ""; return l.length === 1 ? `<p>${esc(l[0])}</p>` : `<ul>${l.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`; };
const kb = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " kB");

/* ---------- Word / PDF ---------- */
let mammothP = null;
function loadMammoth() {
  if (window.mammoth) return Promise.resolve(window.mammoth);
  if (!mammothP) mammothP = new Promise((res, rej) => { const s = document.createElement("script"); s.src = "vendor/mammoth.browser.min.js"; s.onload = () => res(window.mammoth); s.onerror = () => rej(new Error("Word-lezer kon niet laden")); document.head.appendChild(s); });
  return mammothP;
}
const KEEP = new Set(["P", "H1", "H2", "H3", "H4", "UL", "OL", "LI", "STRONG", "B", "EM", "I", "U", "BR", "TABLE", "THEAD", "TBODY", "TR", "TD", "TH"]);
function clean(html) {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const walk = (n) => {
    [...n.childNodes].forEach((c) => {
      if (c.nodeType === 1) {
        if (!KEEP.has(c.tagName)) { walk(c); c.replaceWith(...c.childNodes); return; }
        [...c.attributes].forEach((a) => c.removeAttribute(a.name)); walk(c);
      } else if (c.nodeType !== 3) c.remove();
    });
  };
  const root = doc.body.firstElementChild; walk(root);
  return root.innerHTML.replace(/<p>\s*<\/p>/g, "");
}
async function addFile(t, file) {
  const id = uid("f");
  await db.putFile(id, { naam: file.name, type: file.type || guessType(file.name), blob: file });
  t.bijlagen.push({ id, naam: file.name, type: file.type || guessType(file.name), size: file.size });
}
const guessType = (n) => (/\.pdf$/i.test(n) ? "application/pdf" : /\.docx$/i.test(n) ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "");
async function importDoc(file) {
  const t = empty(); t.titel = file.name.replace(/\.(docx|pdf|doc)$/i, "").replace(/[_-]+/g, " ").trim();
  if (/\.docx$/i.test(file.name)) {
    try {
      const m = await loadMammoth();
      const r = await m.convertToHtml({ arrayBuffer: await file.arrayBuffer() }, { convertImage: m.images.imgElement(() => Promise.resolve({ src: "" })) });
      t.notesHtml = clean(r.value);
    } catch (e) { toast("Kon de tekst uit het Word-bestand niet lezen; het bestand is wel bewaard."); }
  } else if (/\.doc$/i.test(file.name)) toast("Oude .doc-bestanden kan ik niet lezen; sla het op als .docx. Het bestand is wel bewaard.");
  await addFile(t, file);
  S.trainings.push(t); save("trainings");
  return t;
}

/* ---------- delen ---------- */
async function shareTraining(t) {
  const files = {};
  for (const b of t.bijlagen) { const f = await db.getFile(b.id); if (f && f.blob) files[b.id] = { naam: b.naam, type: b.type, b64: await blobToB64(f.blob) }; }
  const r = await shareOrDownload(pack("training", t, files), safeName(t.titel || "Training") + EXT, { title: t.titel || "Training" });
  if (r === "downloaded") toast("Bestand opgeslagen in je downloads");
}

/* ---------- tekening-editor (overlay) ---------- */
function editDrawing(initial, onDone) {
  const ov = document.createElement("div"); ov.className = "overlay"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", "Tekening maken");
  ov.innerHTML = `<div class="ovbox"><div class="ovhead"><b>Tekening</b><span class="bsp"></span>
    ${S.boards.length ? `<select class="ovpick" aria-label="Kies een opgeslagen bord"><option value="">Uit Mijn borden…</option>${S.boards.map((b) => `<option value="${b.id}">${esc(b.naam)}</option>`).join("")}</select>` : ""}
    <button type="button" class="btn ghost" data-x="cancel">Annuleren</button><button type="button" class="btn" data-x="ok">Gebruik tekening</button></div><div class="ovbody"></div></div>`;
  document.body.appendChild(ov); document.body.classList.add("ov-open");
  const b = mountBoard(ov.querySelector(".ovbody"), initial || presetBoard("66"));
  const close = () => { b.destroy(); ov.remove(); document.body.classList.remove("ov-open"); };
  ov.addEventListener("click", (e) => { const x = e.target.closest("[data-x]"); if (!x) return; if (x.dataset.x === "ok") onDone(b.get()); close(); });
  const pick = ov.querySelector(".ovpick"); if (pick) pick.addEventListener("change", () => { const s = S.boards.find((x) => x.id === pick.value); if (s) b.set(s.state); });
}

/* ---------- lijst ---------- */
function renderList(el) {
  const list = S.trainings.slice().sort((a, b) => (b.datum || "").localeCompare(a.datum || "") || b.updated - a.updated);
  el.innerHTML = `<div class="page">
    <header class="phead"><div><p class="eyebrow">Voorbereiden en delen</p><h1>Trainingen</h1></div>
      <div class="tools"><button type="button" class="btn" data-a="new">Nieuwe training</button><button type="button" class="btn ghost" data-a="upload">Word of PDF uploaden</button></div></header>
    ${list.length ? `<div class="cards">${list.map((t) => `<a class="tcard" href="#training-${t.id}"><span class="d">${t.datum ? fmtDate(t.datum) : "Geen datum"}</span><span class="t">${esc(t.titel || "Naamloze training")}</span><span class="m">${t.oef.length} oefening${t.oef.length === 1 ? "" : "en"}${t.bijlagen.length ? ` · ${t.bijlagen.length} bijlage${t.bijlagen.length === 1 ? "" : "n"}` : ""}</span></a>`).join("")}</div>`
      : `<div class="card empty">Nog geen trainingen. Maak er een met "Nieuwe training" (zelfde opbouw als het trainingsvoorbereidingsformulier), of upload een Word- of PDF-bestand. Een training van een andere trainer open je via Instellingen › Bestand openen.</div>`}
  </div>`;
  el.firstElementChild.addEventListener("click", async (e) => {
    const a = e.target.closest("[data-a]"); if (!a) return;
    if (a.dataset.a === "new") { const t = empty(); t.oef.push(newOef()); S.trainings.push(t); save("trainings"); location.hash = "training-" + t.id + "-edit"; }
    if (a.dataset.a === "upload") {
      const f = await pickFile(".docx,.pdf,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"); if (!f) return;
      toast("Bestand inlezen…"); const t = await importDoc(f); location.hash = "training-" + t.id;
    }
  });
}

/* ---------- bekijken ---------- */
function renderView(view, t) {
  let confirm = false;
  view.innerHTML = `<div></div>`; const el = view.firstElementChild;
  const draw = () => {
    el.innerHTML = `<div class="page tview">
      <div class="noprint backrow"><a href="#trainingen" class="linkbtn">‹ Alle trainingen</a></div>
      <header class="phead"><div><p class="eyebrow">${t.datum ? fmtDate(t.datum) : "Geen datum"}</p><h1>${esc(t.titel || "Naamloze training")}</h1></div>
        <div class="tools noprint"><a class="btn" href="#training-${t.id}-edit">Bewerken</a><button type="button" class="btn ghost" data-a="share">Delen</button><button type="button" class="btn ghost" data-a="print">Printen / PDF</button></div></header>
      ${t.doelen || t.personen || t.materialen || t.aandacht ? `<dl class="facts">
        ${t.doelen ? `<div><dt>Doel en thema</dt><dd>${textHTML(t.doelen)}</dd></div>` : ""}
        ${t.personen ? `<div><dt>Aantal personen</dt><dd>${textHTML(t.personen)}</dd></div>` : ""}
        ${t.materialen ? `<div><dt>Materialen</dt><dd>${textHTML(t.materialen)}</dd></div>` : ""}
        ${t.aandacht ? `<div><dt>Beginsituatie</dt><dd>${textHTML(t.aandacht)}</dd></div>` : ""}</dl>` : ""}
      ${t.wu.tekst || t.wu.borden.length ? `<section class="sec"><h2>Warming-up</h2><div class="ex"><div class="exbody">${textHTML(t.wu.tekst)}</div>${t.wu.borden.length ? `<div class="drawings">${t.wu.borden.map((b) => boardSVG(b, { cls: "mini", label: "Tekening warming-up" })).join("")}</div>` : ""}</div></section>` : ""}
      ${t.oef.length ? `<section class="sec"><h2>Oefeningen</h2>${t.oef.map((o, i) => `<article class="ex">
        <div class="exbody">
          <div class="extop"><span class="exno">${i + 1}</span><h3>${esc(o.naam || "Oefening " + (i + 1))}</h3>${o.tijd ? `<span class="time">${esc(o.tijd)}</span>` : ""}</div>
          ${o.doel || o.accent ? `<dl class="rows">${o.doel ? `<dt>Doel</dt><dd>${esc(o.doel)}</dd>` : ""}${o.accent ? `<dt>Accent</dt><dd><span class="accent">${esc(o.accent)}</span></dd>` : ""}</dl>` : ""}
          ${textHTML(o.tekst)}
          ${o.makk || o.moeil ? `<div class="diff">${o.makk ? `<div class="easy"><b>Makkelijker</b>${esc(o.makk)}</div>` : ""}${o.moeil ? `<div class="hard"><b>Moeilijker</b>${esc(o.moeil)}</div>` : ""}</div>` : ""}
        </div>
        ${o.borden.length ? `<div class="drawings">${o.borden.map((b) => boardSVG(b, { cls: "mini", label: "Tekening " + (o.naam || "oefening") })).join("")}</div>` : ""}
      </article>`).join("")}</section>` : ""}
      ${t.notesHtml ? `<section class="sec"><h2>Uit het Word-bestand</h2><div class="card doc">${t.notesHtml}</div></section>` : ""}
      ${t.bijlagen.length ? `<section class="sec noprint"><h2>Bijlagen</h2><ul class="files">${t.bijlagen.map((b) => `<li><span class="ftype">${/pdf/.test(b.type) ? "PDF" : /word|docx/.test(b.type) ? "Word" : "Bestand"}</span><span class="fname">${esc(b.naam)}</span><small>${kb(b.size || 0)}</small><button type="button" class="btn ghost sm" data-open="${b.id}">Openen</button></li>`).join("")}</ul></section>` : ""}
      ${!t.oef.length && !t.notesHtml && !t.bijlagen.length && !t.wu.tekst ? `<div class="card empty noprint">Deze training is nog leeg. Tik op Bewerken.</div>` : ""}
      <div class="danger noprint">${confirm ? `<span>Deze training verwijderen?</span><button type="button" class="btn warn" data-a="del-yes">Ja, verwijderen</button><button type="button" class="btn ghost" data-a="del-no">Nee</button>` : `<button type="button" class="linkbtn" data-a="del">Training verwijderen</button>`}</div>
    </div>`;
  };
  draw();
  el.addEventListener("click", async (e) => {
    const a = e.target.closest("[data-a]"), op = e.target.closest("[data-open]");
    if (op) { const f = await db.getFile(op.dataset.open); if (f && f.blob) openBlob(f.blob, f.naam); else toast("Bestand niet gevonden op dit apparaat"); return; }
    if (!a) return;
    const k = a.dataset.a;
    if (k === "share") shareTraining(t);
    if (k === "print") window.print();
    if (k === "del") { confirm = true; draw(); }
    if (k === "del-no") { confirm = false; draw(); }
    if (k === "del-yes") { for (const b of t.bijlagen) await db.delFile(b.id); S.trainings = S.trainings.filter((x) => x.id !== t.id); save("trainings"); location.hash = "trainingen"; }
  });
}

/* ---------- bewerken ---------- */
function renderEdit(view, t) {
  view.innerHTML = `<div></div>`; const el = view.firstElementChild;
  const fld = (label, key, val, { area = false, ph = "", type = "text", rows = 3 } = {}) => `<label class="f">${label}${area ? `<textarea data-k="${key}" rows="${rows}" placeholder="${esc(ph)}">${esc(val)}</textarea>` : `<input type="${type}" data-k="${key}" value="${esc(val)}" placeholder="${esc(ph)}">`}</label>`;
  const drawings = (list, path) => `<div class="drawings edit">${list.map((b, j) => `<div class="dthumb"><button type="button" data-draw="${path}:${j}" aria-label="Tekening ${j + 1} bewerken">${boardSVG(b, { cls: "mini" })}</button><button type="button" class="del" data-undraw="${path}:${j}" aria-label="Tekening ${j + 1} verwijderen">×</button></div>`).join("")}<button type="button" class="dadd" data-draw="${path}:new">+ Tekening</button></div>`;
  const draw = () => {
    el.innerHTML = `<div class="page tedit">
      <div class="backrow"><a href="#training-${t.id}" class="linkbtn">‹ Klaar, bekijk training</a></div>
      <header class="phead"><div><p class="eyebrow">Bewerken · wordt vanzelf bewaard</p><h1>${esc(t.titel || "Nieuwe training")}</h1></div></header>
      <section class="card grid2">
        ${fld("Titel / thema", "titel", t.titel, { ph: "Bijv. Tip en plaatsbal verdedigen" })}
        ${fld("Datum", "datum", t.datum, { type: "date" })}
        ${fld("Doel en thema (één per regel)", "doelen", t.doelen, { area: true, ph: "Verdedigen tegen tip en plaatsbal\nOpbouw: WU · K1 · K2 · slot" })}
        ${fld("Aantal personen", "personen", t.personen, { ph: "Bijv. 10–14 (1 veld)" })}
        ${fld("Beginsituatie / aandachtspunten", "aandacht", t.aandacht, { area: true })}
        ${fld("Materialen", "materialen", t.materialen, { area: true, rows: 2 })}
      </section>
      <section class="card"><h2>Warming-up</h2>${fld("Uitleg (één punt per regel)", "wu.tekst", t.wu.tekst, { area: true, rows: 4 })}${drawings(t.wu.borden, "wu")}</section>
      ${t.oef.map((o, i) => `<section class="card oefedit"><div class="trow"><h2>Oefening ${i + 1}</h2><span class="bsp"></span>
          <button type="button" class="btn ghost sm" data-mv="${i}:-1" ${i ? "" : "disabled"} aria-label="Omhoog">↑</button><button type="button" class="btn ghost sm" data-mv="${i}:1" ${i < t.oef.length - 1 ? "" : "disabled"} aria-label="Omlaag">↓</button><button type="button" class="btn ghost sm" data-rm="${i}">Verwijder</button></div>
        <div class="grid2">
          ${fld("Naam", `oef.${i}.naam`, o.naam, { ph: "Bijv. Slag of tip" })}
          ${fld("Tijd", `oef.${i}.tijd`, o.tijd, { ph: "15 min" })}
          ${fld("Doel", `oef.${i}.doel`, o.doel)}
          ${fld("Accent (één!)", `oef.${i}.accent`, o.accent)}
        </div>
        ${fld("Uitleg en organisatie (één punt per regel)", `oef.${i}.tekst`, o.tekst, { area: true, rows: 5 })}
        <div class="grid2">${fld("Makkelijker", `oef.${i}.makk`, o.makk)}${fld("Moeilijker", `oef.${i}.moeil`, o.moeil)}</div>
        ${drawings(o.borden, "oef." + i)}
      </section>`).join("")}
      <div class="tools"><button type="button" class="btn" data-a="addoef">+ Oefening</button><button type="button" class="btn ghost" data-a="attach">+ Bijlage (PDF/Word)</button></div>
      ${t.bijlagen.length ? `<section class="card"><h2>Bijlagen</h2><ul class="files">${t.bijlagen.map((b) => `<li><span class="fname">${esc(b.naam)}</span><small>${kb(b.size || 0)}</small><button type="button" class="del" data-unfile="${b.id}" aria-label="${esc(b.naam)} verwijderen">×</button></li>`).join("")}</ul></section>` : ""}
      ${t.notesHtml ? `<section class="card"><h2>Tekst uit Word</h2><p class="hint">Deze tekst blijft onder de training staan. Neem over wat je wilt in de velden hierboven.</p><div class="doc">${t.notesHtml}</div><button type="button" class="linkbtn" data-a="rmnotes">Tekst uit Word weghalen</button></section>` : ""}
    </div>`;
  };
  draw();
  const setPath = (k, v) => { const p = k.split("."); let o = t; for (let i = 0; i < p.length - 1; i++) o = o[p[i]]; o[p[p.length - 1]] = v; };
  const getList = (path) => (path === "wu" ? t.wu.borden : t.oef[+path.split(".")[1]].borden);
  const touch = () => { t.updated = Date.now(); save("trainings"); };
  el.addEventListener("input", (e) => {
    const k = e.target.dataset.k; if (!k) return; setPath(k, e.target.value); touch();
    if (k === "titel") { const h1 = el.querySelector("h1"); if (h1) h1.textContent = e.target.value || "Nieuwe training"; }
  });
  el.addEventListener("click", async (e) => {
    const x = e.target.closest("[data-a],[data-mv],[data-rm],[data-draw],[data-undraw],[data-unfile]"); if (!x) return;
    const d = x.dataset;
    if (d.a === "addoef") { t.oef.push(newOef()); touch(); draw(); const s = el.querySelectorAll(".oefedit"); s[s.length - 1].scrollIntoView({ behavior: "smooth", block: "start" }); }
    if (d.a === "attach") { const f = await pickFile(".pdf,.docx,.doc,application/pdf"); if (!f) return; await addFile(t, f); touch(); draw(); toast("Bijlage toegevoegd"); }
    if (d.a === "rmnotes") { t.notesHtml = ""; touch(); draw(); }
    if (d.mv) { const [i, dir] = d.mv.split(":").map(Number); const j = i + dir; [t.oef[i], t.oef[j]] = [t.oef[j], t.oef[i]]; touch(); draw(); }
    if (d.rm !== undefined) { t.oef.splice(+d.rm, 1); touch(); draw(); }
    if (d.draw) { const [path, j] = d.draw.split(":"); const list = getList(path); editDrawing(j === "new" ? null : list[+j], (st) => { if (j === "new") list.push(st); else list[+j] = st; touch(); draw(); }); }
    if (d.undraw) { const [path, j] = d.undraw.split(":"); getList(path).splice(+j, 1); touch(); draw(); }
    if (d.unfile) { await db.delFile(d.unfile); t.bijlagen = t.bijlagen.filter((b) => b.id !== d.unfile); touch(); draw(); }
  });
}

export function render(el, route) {
  const m = /^training-([\w]+?)(-edit)?$/.exec(route || "");
  if (m) {
    const t = byId(m[1]);
    if (!t) { el.innerHTML = `<div class="page"><div class="card empty">Deze training bestaat niet (meer) op dit apparaat. <a href="#trainingen">Naar alle trainingen</a></div></div>`; return; }
    Object.assign(t, normTraining(t));
    return m[2] ? renderEdit(el, t) : renderView(el, t);
  }
  renderList(el);
}

// Import van een gedeelde training.
export async function importTraining(o) {
  const t = normTraining(clone(o.data)); t.id = uid("tr"); t.updated = Date.now();
  const old = t.bijlagen; t.bijlagen = [];
  for (const b of old) {
    const f = o.files && o.files[b.id]; if (!f) continue;
    const { b64ToBlob } = await import("./share.js");
    const id = uid("f"); const blob = b64ToBlob(f.b64, f.type);
    await db.putFile(id, { naam: f.naam, type: f.type, blob });
    t.bijlagen.push({ id, naam: f.naam, type: f.type, size: blob.size });
  }
  S.trainings.push(t); save("trainings");
  return t;
}
