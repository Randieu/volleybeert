// Opstelling per wedstrijd: 5 sets, posities 1–6, wissels, rollen per set, invallers en notities.
import { S, save, esc, uid, team } from "./state.js";

export const ROL = { S: "Spelverdeler", A: "Aanvaller", M: "Midden", L: "Libero", "": "Geen rol" };
const ROLK = { S: "S", A: "A", M: "M", L: "L", "": "–" };
const SETS = ["1", "2", "3", "4", "5"];
const FRONT = ["4", "3", "2"], BACK = ["5", "6", "1"];
const emptySet = () => ({ pos: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null }, bank: [], notitie: "", rollen: {} });
let curId = null, opSet = "1", opSel = null, view = "opstelling", confirmDel = false, newForm = false;

function normSet(x) { const e = emptySet(); if (!x) return e; for (const k in e.pos) e.pos[k] = (x.pos && x.pos[k]) || null; e.bank = Array.isArray(x.bank) ? [...x.bank] : []; e.notitie = x.notitie || ""; e.rollen = x.rollen && typeof x.rollen === "object" ? { ...x.rollen } : {}; return e; }
export function normMatch(d) { const m = { teamId: d.teamId || "", tegenstander: d.tegenstander || "", datum: d.datum || "", plek: d.plek || "thuis", uitslag: d.uitslag || "", aangemaakt: d.aangemaakt || 0, invallers: Array.isArray(d.invallers) ? d.invallers.map((x) => ({ ...x })) : [], sets: {} }; SETS.forEach((s) => (m.sets[s] = normSet(d.sets && d.sets[s]))); return m; }
const myMatches = () => Object.entries(S.matches).filter(([, m]) => m.teamId === team().id).sort((a, b) => (b[1].datum || "").localeCompare(a[1].datum || "") || b[1].aangemaakt - a[1].aangemaakt);
const cur = () => (curId && S.matches[curId] && S.matches[curId].teamId === team().id ? S.matches[curId] : null);
function pickCur() { if (!cur()) { const l = myMatches(); curId = l.length ? l[0][0] : null; } }
function fmtDatum(d) { if (!d) return "Geen datum"; const [y, m, dd] = d.split("-").map(Number); if (!y) return d; return new Date(y, m - 1, dd).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short", year: "numeric" }); }
const title = (m) => m.tegenstander || "Tegenstander onbekend";
const setsFilled = (m) => SETS.filter((s) => Object.values(m.sets[s].pos).some(Boolean)).length;
const P = (id, m = cur()) => team().spelers.find((p) => p.id === id) || (m && m.invallers.find((p) => p.id === id)) || null;
const isInv = (id, m = cur()) => !!(m && m.invallers.some((p) => p.id === id));
const rolIn = (set, id) => { const r = cur() && cur().sets[set].rollen[id]; return r !== undefined ? r : ((P(id) || {}).rol || ""); };
function whereIs(s, id) { for (const k in s.pos) if (s.pos[k] === id) return { pos: k }; if (s.bank.includes(id)) return { bank: true }; return null; }
function removeFrom(s, id) { for (const k in s.pos) if (s.pos[k] === id) s.pos[k] = null; s.bank = s.bank.filter((x) => x !== id); }
const saveM = () => save("matches");

export const rolSelect = (attrs, val) => `<select ${attrs}>${Object.entries(ROL).map(([k, v]) => `<option value="${k}"${(val || "") === k ? " selected" : ""}>${v}</option>`).join("")}</select>`;
function chip(p, rol) {
  if (!p) return ""; const r = rol === undefined ? p.rol || "" : rol;
  const nr = p.nr ? String(p.nr) : (p.naam || "?").slice(0, 1).toUpperCase();
  return `<span class="chip r-${r || "x"}${isInv(p.id) ? " inv" : ""}" role="button" tabindex="0" data-pid="${p.id}" aria-pressed="${opSel === p.id}"><span class="nr">${esc(nr)}</span><span class="nm">${esc(p.naam || "Naamloos")}</span>${r ? `<span class="rl">${ROLK[r]}</span>` : ""}${isInv(p.id) ? `<span class="rl">inv</span>` : ""}</span>`;
}
function slot(k) {
  const id = cur().sets[opSet].pos[k]; const p = id && P(id);
  return `<div class="slot${p ? " filled" : ""}" data-drop="pos" data-pos="${k}" role="button" tabindex="0" aria-label="Positie ${k}${p ? ": " + esc(p.naam) : " (leeg)"}"><span class="pn">${k}</span>${p ? chip(p, rolIn(opSet, id)) : `<span class="hint">${opSel ? "Zet hier" : "Leeg"}</span>`}</div>`;
}
function newMatchForm() {
  const last = myMatches()[0];
  return `<form class="card newm" data-f="newm" autocomplete="off"><h2>Nieuwe wedstrijd</h2>
    <div class="fields">
      <label>Tegenstander<input name="teg" maxlength="60" required placeholder="Bijv. VC Sporting 3"></label>
      <label>Datum<input name="dat" type="date" value="${new Date().toISOString().slice(0, 10)}"></label>
      <label>Thuis/uit<select name="plek"><option value="thuis">Thuis</option><option value="uit">Uit</option></select></label>
    </div>
    ${last ? `<label class="check"><input type="checkbox" name="copy" checked> Neem de opstelling over van ${esc(title(last[1]))} (${fmtDatum(last[1].datum)})</label>` : ""}
    <div class="tools"><button class="btn" type="submit">Wedstrijd aanmaken</button><button class="btn ghost" type="button" data-a="cancel-new">Annuleren</button></div></form>`;
}
function setView() {
  const m = cur(), s = m.sets[opSet];
  const placed = new Set([...Object.values(s.pos).filter(Boolean), ...s.bank]);
  const free = team().spelers.concat(m.invallers).filter((p) => !placed.has(p.id));
  const onCourt = Object.values(s.pos).filter(Boolean).length;
  const inSet = [...FRONT, ...BACK].map((k) => s.pos[k]).filter(Boolean).concat(s.bank).map((id) => P(id)).filter(Boolean);
  return `<div class="segs" role="group" aria-label="Set kiezen">${SETS.map((x) => `<button type="button" data-set="${x}" aria-pressed="${x === opSet}">Set ${x}</button>`).join("")}</div>
  <div class="tools">
    <button type="button" class="btn ghost" data-a="rot" ${onCourt ? "" : "disabled"}>Doordraaien ↻</button>
    <button type="button" class="btn ghost" data-a="copy" ${opSet === "1" ? "disabled" : ""}>Kopieer set ${opSet === "1" ? "" : +opSet - 1}</button>
    <button type="button" class="btn ghost" data-a="clear">Set leegmaken</button>
  </div>
  <div class="stage">
    <div>
      <div class="field" aria-label="Eigen speelhelft, net boven"><div class="net"></div>
        <div class="row front">${FRONT.map(slot).join("")}</div><div class="row">${BACK.map(slot).join("")}</div></div>
      <p class="note">Tik een speler aan en tik daarna een positie, de bank of "niet opgesteld". Positie 1 serveert. ${onCourt}/6 opgesteld.</p>
    </div>
    <div class="col">
      <div class="zone" data-drop="bank" role="button" tabindex="0"><h3>Wissels (${s.bank.length})</h3>${s.bank.map((id) => chip(P(id), rolIn(opSet, id))).join("") || `<span class="hint">${opSel ? "Tik hier om op de bank te zetten" : "Nog geen wissels"}</span>`}</div>
      <div class="zone" data-drop="none" role="button" tabindex="0"><h3>Niet opgesteld (${free.length})</h3>${free.map((p) => chip(p)).join("") || `<span class="hint">${team().spelers.length ? "Iedereen is ingedeeld" : "Voeg eerst spelers toe bij Team"}</span>`}</div>
      <div class="zone static"><h3>Rollen in set ${opSet}</h3>${inSet.length ? `<ul class="setroles">${inSet.map((p) => { const own = p.rol || ""; const r = rolIn(opSet, p.id); return `<li><span class="nm">${esc(p.naam)}</span>${rolSelect(`data-setrol="${p.id}" aria-label="Rol ${esc(p.naam)}"`, r)}${r !== own ? `<span class="tag">aangepast</span>` : ""}</li>`; }).join("")}</ul>` : `<span class="hint">Zet eerst spelers op het veld of de bank.</span>`}</div>
      <label class="zone static"><h3>Notitie set ${opSet}</h3><textarea data-m="note" placeholder="Bijv. afspraken, wissel na 12 punten…">${esc(s.notitie)}</textarea></label>
      <div class="zone static"><h3>Invallers deze wedstrijd (${m.invallers.length})</h3>
        <p class="hint full">Spelers van buiten het team. Ze staan alleen bij deze wedstrijd.</p>
        ${m.invallers.length ? `<ul class="roster">${m.invallers.map((p) => `<li><input value="${esc(p.nr || "")}" data-iedit="nr" data-id="${p.id}" aria-label="Rugnummer" maxlength="3" inputmode="numeric"><input value="${esc(p.naam)}" data-iedit="naam" data-id="${p.id}" aria-label="Naam" maxlength="40">${rolSelect(`data-iedit="rol" data-id="${p.id}" aria-label="Rol"`, p.rol)}<button type="button" class="del" data-idel="${p.id}" aria-label="Verwijderen">×</button></li>`).join("")}</ul>` : ""}
        <form class="addrow" data-f="inv" autocomplete="off"><input name="nr" inputmode="numeric" maxlength="3" placeholder="Nr" aria-label="Rugnummer"><input name="naam" maxlength="40" placeholder="Naam invaller" aria-label="Naam invaller" required>${rolSelect('name="rol" aria-label="Rol"', "")}<button class="btn ghost" type="submit">Invaller toevoegen</button></form>
      </div>
      <div class="danger">${confirmDel ? `<span>Deze wedstrijd echt verwijderen?</span><button type="button" class="btn warn" data-a="delm-yes">Ja, verwijderen</button><button type="button" class="btn ghost" data-a="delm-no">Nee</button>` : `<button type="button" class="linkbtn" data-a="delm">Wedstrijd verwijderen</button>`}</div>
    </div>
  </div>`;
}
function overview() {
  return `<div class="cards">${myMatches().map(([id, m]) => {
    const s1 = m.sets["1"]; const names = FRONT.concat(BACK).map((k) => s1.pos[k] && P(s1.pos[k], m)).filter(Boolean).map((p) => esc(p.naam)).join(", ");
    return `<button type="button" class="mcard" data-open="${id}"><span class="d">${fmtDatum(m.datum)} · ${m.plek === "uit" ? "Uit" : "Thuis"}</span><span class="t">${esc(title(m))}</span><span class="m">${setsFilled(m)} van 5 sets ingevuld${m.uitslag ? " · " + esc(m.uitslag) : ""}</span>${names ? `<span class="m">Set 1: ${names}</span>` : ""}</button>`;
  }).join("")}</div>`;
}

export function render(el) {
  pickCur();
  const list = myMatches(), m = cur();
  el.innerHTML = `<div class="page">
    <header class="phead"><div><p class="eyebrow">${esc(team().naam)}</p><h1>Opstelling</h1></div>
      <div class="tools"><button type="button" class="btn" data-a="new">Nieuwe wedstrijd</button>${list.length ? `<button type="button" class="btn ghost" data-a="overview">${view === "overzicht" ? "Terug naar opstelling" : "Alle wedstrijden"}</button>` : ""}</div></header>
    ${newForm ? newMatchForm() : ""}
    ${!list.length && !newForm ? `<div class="card empty">Nog geen wedstrijden voor ${esc(team().naam)}. Maak een wedstrijd aan; per wedstrijd bewaar je 5 sets met opstelling, wissels, rollen en een notitie.${team().spelers.length ? "" : ` Zet eerst je spelers bij <a href="#team">Team</a>.`}</div>` : ""}
    ${m ? (view === "overzicht" ? overview() : `
      <div class="mbar">
        <label class="msel">Wedstrijd<select data-m="match">${list.map(([id, x]) => `<option value="${id}"${id === curId ? " selected" : ""}>${fmtDatum(x.datum)} · ${esc(title(x))}</option>`).join("")}</select></label>
      </div>
      <div class="fields mdetail">
        <label>Tegenstander<input data-m="teg" value="${esc(m.tegenstander)}" maxlength="60"></label>
        <label>Datum<input data-m="dat" type="date" value="${esc(m.datum)}"></label>
        <label>Thuis/uit<select data-m="plek"><option value="thuis"${m.plek === "thuis" ? " selected" : ""}>Thuis</option><option value="uit"${m.plek === "uit" ? " selected" : ""}>Uit</option></select></label>
        <label>Uitslag<input data-m="uit" value="${esc(m.uitslag)}" maxlength="40" placeholder="Bijv. 3-1"></label>
      </div>
      ${setView()}`) : ""}
  </div>`;
  const root = el.firstElementChild;
  const rerender = () => render(el);

  root.addEventListener("submit", (e) => {
    e.preventDefault(); const f = e.target; const fd = new FormData(f);
    if (f.dataset.f === "newm") {
      const teg = String(fd.get("teg") || "").trim(); if (!teg) return;
      const id = uid("w"); const copy = fd.get("copy") && myMatches()[0];
      const nm = normMatch({ teamId: team().id, tegenstander: teg, datum: fd.get("dat"), plek: fd.get("plek"), aangemaakt: Date.now() });
      if (copy) { const keep = (pid) => team().spelers.some((p) => p.id === pid); SETS.forEach((s) => { const x = normSet(copy[1].sets[s]); for (const k in x.pos) if (x.pos[k] && !keep(x.pos[k])) x.pos[k] = null; x.bank = x.bank.filter(keep); for (const k in x.rollen) if (!keep(k)) delete x.rollen[k]; x.notitie = ""; nm.sets[s] = x; }); }
      S.matches[id] = nm; curId = id; opSet = "1"; newForm = false; view = "opstelling"; saveM(); rerender();
    }
    if (f.dataset.f === "inv") {
      const naam = String(fd.get("naam") || "").trim(); if (!naam || !cur()) return;
      cur().invallers.push({ id: uid("i"), naam, nr: String(fd.get("nr") || "").trim(), rol: fd.get("rol") || "" }); saveM(); rerender();
      const n = el.querySelector('[data-f="inv"] [name="naam"]'); if (n) n.focus();
    }
  });
  root.addEventListener("change", (e) => {
    const t = e.target; const mm = cur();
    if (t.dataset.m === "match") { curId = t.value; opSet = "1"; opSel = null; confirmDel = false; rerender(); return; }
    if (!mm) return;
    if (t.dataset.iedit) { const p = mm.invallers.find((x) => x.id === t.dataset.id); if (p) { p[t.dataset.iedit] = t.value.trim(); saveM(); rerender(); } return; }
    if (t.dataset.setrol) { const id = t.dataset.setrol; const own = (P(id) || {}).rol || ""; if (t.value === own) delete mm.sets[opSet].rollen[id]; else mm.sets[opSet].rollen[id] = t.value; saveM(); rerender(); return; }
    const map = { note: () => (mm.sets[opSet].notitie = t.value), teg: () => (mm.tegenstander = t.value.trim()), dat: () => (mm.datum = t.value), plek: () => (mm.plek = t.value), uit: () => (mm.uitslag = t.value.trim()) };
    if (map[t.dataset.m]) { map[t.dataset.m](); saveM(); if (t.dataset.m !== "note") rerender(); }
  });
  root.addEventListener("click", (e) => {
    const t = e.target; const a = t.closest("[data-a]") && t.closest("[data-a]").dataset.a;
    if (a === "new") { newForm = true; rerender(); const f = el.querySelector('[name="teg"]'); if (f) f.focus(); return; }
    if (a === "cancel-new") { newForm = false; rerender(); return; }
    if (a === "overview") { view = view === "overzicht" ? "opstelling" : "overzicht"; rerender(); return; }
    const op = t.closest("[data-open]"); if (op) { curId = op.dataset.open; view = "opstelling"; opSet = "1"; rerender(); return; }
    const mm = cur(); if (!mm) return;
    const idel = t.closest("[data-idel]"); if (idel) { const id = idel.dataset.idel; mm.invallers = mm.invallers.filter((p) => p.id !== id); SETS.forEach((x) => { removeFrom(mm.sets[x], id); delete mm.sets[x].rollen[id]; }); if (opSel === id) opSel = null; saveM(); rerender(); return; }
    if (a === "delm") { confirmDel = true; rerender(); return; }
    if (a === "delm-no") { confirmDel = false; rerender(); return; }
    if (a === "delm-yes") { delete S.matches[curId]; confirmDel = false; curId = null; saveM(); rerender(); return; }
    const sb = t.closest("[data-set]"); if (sb) { opSet = sb.dataset.set; opSel = null; confirmDel = false; rerender(); return; }
    const s = mm.sets[opSet];
    if (a === "rot") { const o = { ...s.pos }; s.pos = { 1: o["2"], 6: o["1"], 5: o["6"], 4: o["5"], 3: o["4"], 2: o["3"] }; saveM(); rerender(); return; }
    if (a === "copy") { const prev = mm.sets[String(+opSet - 1)]; mm.sets[opSet] = { pos: { ...prev.pos }, bank: [...prev.bank], notitie: s.notitie, rollen: { ...prev.rollen } }; saveM(); rerender(); return; }
    if (a === "clear") { mm.sets[opSet] = emptySet(); opSel = null; saveM(); rerender(); return; }
    const c = t.closest(".chip"), drop = t.closest("[data-drop]");
    if (c && !(opSel && drop && opSel !== c.dataset.pid && drop.dataset.drop === "pos")) { opSel = opSel === c.dataset.pid ? null : c.dataset.pid; rerender(); return; }
    if (drop && opSel) {
      const id = opSel, d = drop.dataset.drop, from = whereIs(s, id);
      if (d === "pos") { const k = drop.dataset.pos, occ = s.pos[k]; if (occ !== id) { removeFrom(s, id); if (occ) { if (from && from.pos) s.pos[from.pos] = occ; else if (from && from.bank) s.bank.push(occ); } s.pos[k] = id; } }
      else if (d === "bank") { removeFrom(s, id); s.bank.push(id); }
      else removeFrom(s, id);
      opSel = null; saveM(); rerender();
    }
  });
  root.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target.matches(".chip,[data-drop]")) { e.preventDefault(); e.target.click(); } });
}
