// Tactiekbord: tekenen, spelers neerzetten en slepen. Herbruikbaar in de Bord-tab en in trainingen.
import { esc, uid, clone } from "./state.js";

export const POS = [["4", 1.5, 10.6], ["3", 4.5, 10.6], ["2", 7.5, 10.6], ["5", 1.5, 15.5], ["6", 4.5, 16.2], ["1", 7.5, 15.5]];
export const TYPES = {
  blauw: { r: .48, fill: "#2054C7", ink: "#fff", naam: "Speler" },
  grijs: { r: .48, fill: "#8E95AC", ink: "#fff", naam: "Tegenstander" },
  trainer: { r: .48, fill: "#F28C0F", ink: "#fff", naam: "Trainer" },
  bal: { r: .24, fill: "#FFD43B", ink: "#000", naam: "Bal" },
  kast: { r: .5, fill: "#C99A63", ink: "#5a3a12", naam: "Kast" },
  pion: { r: .35, fill: "#F26B1D", ink: "#fff", naam: "Pion" },
};
export const PENS = { loop: { c: "#141E46", d: "", naam: "Loop" }, bal: { c: "#D7263D", d: ".35 .25", naam: "Bal" }, blauw: { c: "#2054C7", d: "", naam: "Blauw" } };

export function emptyBoard() { return { tok: [], ln: [], half: false, size: 1 }; }
export function presetBoard(kind) {
  const b = emptyBoard();
  if (kind === "66" || kind === "6") POS.forEach((p) => b.tok.push({ id: uid("k"), t: "blauw", l: p[0], x: p[1], y: p[2] }));
  if (kind === "66") POS.forEach((p) => b.tok.push({ id: uid("k"), t: "grijs", l: p[0], x: 9 - p[1], y: 18 - p[2] }));
  if (kind === "6") b.half = true;
  return b;
}
export function normBoard(b) {
  const o = Object.assign(emptyBoard(), b || {});
  o.tok = Array.isArray(o.tok) ? o.tok.filter((t) => t && TYPES[t.t]) : [];
  o.ln = Array.isArray(o.ln) ? o.ln.filter((l) => l && Array.isArray(l.p) && l.p.length > 1) : [];
  o.size = [0.8, 1, 1.3].includes(o.size) ? o.size : 1;
  return o;
}

const viewBox = (b) => (b.half ? "-1.2 7.6 11.4 11.8" : "-1.2 -1.2 11.4 20.4");
const pathD = (p) => p.map((q, i) => (i ? "L" : "M") + (+q[0]).toFixed(2) + " " + (+q[1]).toFixed(2)).join("");
const lineW = (b) => 0.13 * (b.size || 1);

function defs(pfx) {
  return `<defs>${Object.entries(PENS).map(([k, v]) => `<marker id="${pfx}-${k}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="${v.c}"/></marker>`).join("")}</defs>`;
}
function courtSVG(b) {
  return `<rect x="-1.2" y="-1.2" width="11.4" height="20.4" fill="#E3E8F2"/>
  <rect x="0" y="${b.half ? 9 : 0}" width="9" height="${b.half ? 9 : 18}" fill="#E9A06F" stroke="#fff" stroke-width=".08"/>
  <g stroke="#fff" stroke-width=".06">${b.half ? "" : `<line x1="0" y1="6" x2="9" y2="6"/>`}<line x1="0" y1="12" x2="9" y2="12"/></g>
  <line x1="-.7" y1="9" x2="9.7" y2="9" stroke="#1C2C6E" stroke-width=".2" stroke-linecap="round"/>`;
}
function lineSVG(l, i, b, pfx, hit) {
  const pen = PENS[l.c] || PENS.loop; const d = pathD(l.p);
  return `<g data-li="${i}"><path d="${d}" fill="none" stroke="${pen.c}" stroke-width="${lineW(b)}" stroke-linecap="round" stroke-linejoin="round" ${pen.d ? `stroke-dasharray="${pen.d}"` : ""} ${l.h ? `marker-end="url(#${pfx}-${l.c})"` : ""}/>${hit ? `<path class="bhit" d="${d}" fill="none" stroke="transparent" stroke-width=".8"/>` : ""}</g>`;
}
function tokSVG(o, b, sel, hit, rot) {
  const T = TYPES[o.t] || TYPES.blauw; const r = T.r * (b.size || 1);
  const shape = o.t === "kast" ? `<rect x="${-r}" y="${-r}" width="${r * 2}" height="${r * 2}" rx=".08" fill="${T.fill}" stroke="#5a3a12" stroke-width=".05"/>`
    : o.t === "pion" ? `<path d="M0 ${-r * 1.1}L${r} ${r * .8}L${-r} ${r * .8}Z" fill="${T.fill}" stroke="#000" stroke-width=".03"/>`
    : `<circle r="${r}" fill="${T.fill}" stroke="${o.t === "bal" ? "#7a5a00" : "rgba(0,0,0,.35)"}" stroke-width=".05"/>`;
  const fs = (String(o.l || "").length > 2 ? .4 : .52) * (b.size || 1);
  return `<g class="btok" data-tid="${o.id}" transform="translate(${o.x} ${o.y})">${sel ? `<circle r="${r + .18}" fill="none" stroke="#141E46" stroke-width=".07" stroke-dasharray=".2 .12"/>` : ""}${shape}${o.l ? `<text ${rot ? 'transform="rotate(-90)" ' : ""}y="${fs * .34}" text-anchor="middle" font-family="Barlow, Arial, sans-serif" font-size="${fs}" font-weight="700" fill="${T.ink}">${esc(o.l)}</text>` : ""}${hit ? `<circle class="bhit" r="${Math.max(r, .6)}" fill="transparent"/>` : ""}</g>`;
}

// Stilstaande tekening (voor trainingen, lijstjes en afbeeldingen).
export function boardSVG(b, { cls = "", label = "Veldtekening" } = {}) {
  b = normBoard(b); const pfx = "m" + Math.random().toString(36).slice(2, 7);
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="${viewBox(b)}" role="img" aria-label="${esc(label)}">${defs(pfx)}${courtSVG(b)}${b.ln.map((l, i) => lineSVG(l, i, b, pfx, false)).join("")}${b.tok.map((o) => tokSVG(o, b, false, false)).join("")}</svg>`;
}

export async function boardPNG(b, px = 1200) {
  b = normBoard(b);
  const [, , w, h] = viewBox(b).split(" ").map(Number);
  const W = px, H = Math.round(px * h / w);
  const svg = boardSVG(b).replace("<svg ", `<svg width="${W}" height="${H}" `);
  const img = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H); ctx.drawImage(img, 0, 0, W, H);
  URL.revokeObjectURL(url);
  return new Promise((res) => c.toBlob(res, "image/png"));
}

// Interactief bord. opts.onChange(state) bij elke wijziging; opts.compact verbergt de veld-rij.
export function mountBoard(host, initial, opts = {}) {
  let B = normBoard(clone(initial || presetBoard("66")));
  let mode = "move", pen = "loop", head = true, sel = null, undo = [], big = false, more = false;
  const pfx = "b" + Math.random().toString(36).slice(2, 7);
  host.innerHTML = `<div class="bord"><div class="btools"></div><div class="bstage"><svg class="bsvg" role="img" aria-label="Volleybalveld om op te tekenen" preserveAspectRatio="xMidYMid meet"></svg></div></div>`;
  const root = host.querySelector(".bord"), tools = host.querySelector(".btools"), svg = host.querySelector(".bsvg");
  const changed = () => { if (opts.onChange) opts.onChange(clone(B)); };
  const push = () => { undo.push(JSON.stringify(B)); if (undo.length > 80) undo.shift(); };

  function nextLabel(t) {
    if (t === "trainer") return "T"; if (t === "bal" || t === "pion") return ""; if (t === "kast") return "K";
    const used = B.tok.filter((o) => o.t === t).map((o) => o.l);
    for (let i = 1; i <= 6; i++) if (!used.includes(String(i))) return String(i);
    return "";
  }
  function paintTools() {
    const seg = (arr, cur, attr) => `<div class="bseg" role="group">${arr.map((a) => `<button type="button" class="bbtn${cur === a[0] ? " on" : ""}" ${attr}="${a[0]}" aria-pressed="${cur === a[0]}">${a[1]}</button>`).join("")}</div>`;
    const s = B.tok.find((o) => o.id === sel);
    tools.innerHTML = `<div class="brow">
      ${seg([["move", "✋ Verplaats"], ["pen", "✏️ Pen"], ["arrow", "➝ Pijl"], ["gum", "⌫ Gum"]], mode, "data-bmode")}
      ${mode === "pen" || mode === "arrow" ? seg(Object.entries(PENS).map(([k, v]) => [k, v.naam]), pen, "data-bpen") + (mode === "pen" ? `<label class="bchk"><input type="checkbox" data-bhead ${head ? "checked" : ""}> Pijlpunt</label>` : "") : ""}
      <span class="bsp"></span>
      <button type="button" class="bbtn" data-bact="undo" ${undo.length ? "" : "disabled"}>↶ <span class="bt">Ongedaan</span></button>
      <button type="button" class="bbtn bmore" data-bact="more" aria-expanded="${more}" aria-label="Meer opties">⋯</button>
      <button type="button" class="bbtn" data-bact="big">${big ? "✕ <span class='bt'>Klein</span>" : "⛶ <span class='bt'>Groot</span>"}</button>
    </div>
    <div class="brow">
      ${Object.entries(TYPES).map(([k, v]) => `<button type="button" class="bbtn add" data-badd="${k}" aria-label="${v.naam} neerzetten"><i class="bdot ${k}"></i><span class="bt">${v.naam}</span></button>`).join("")}
    </div>
    <div class="brow bveld${more ? " open" : ""}">
      ${seg([["heel", "Heel veld"], ["half", "Eigen helft"]], B.half ? "half" : "heel", "data-bhalf")}
      ${seg([["0.8", "S"], ["1", "M"], ["1.3", "L"]], String(B.size), "data-bsize")}
      <button type="button" class="bbtn" data-bpre="66">6 tegen 6</button><button type="button" class="bbtn" data-bpre="6">Eigen 6</button>
      <button type="button" class="bbtn" data-bact="lines">Wis lijnen</button><button type="button" class="bbtn" data-bpre="leeg">Alles leeg</button>
    </div>
    ${s ? `<div class="brow bselrow"><label class="blabel">Tekst <input data-blabel maxlength="3" value="${esc(s.l || "")}" autocomplete="off"></label><button type="button" class="bbtn" data-bact="del">Verwijder</button><button type="button" class="bbtn" data-bact="desel">Klaar</button></div>` : ""}`;
  }
  let land = false;
  function draw() {
    svg.setAttribute("viewBox", land ? (B.half ? "-19.4 -1.2 11.8 11.4" : "-19.2 -1.2 20.4 11.4") : viewBox(B));
    svg.innerHTML = `${defs(pfx)}<g class="world"${land ?  ' transform="rotate(90)"' : ""}>${courtSVG(B)}<g class="blines${mode === "gum" ? " gum" : ""}">${B.ln.map((l, i) => lineSVG(l, i, B, pfx, true)).join("")}</g><g class="blive"></g><g class="btoks${mode === "move" ? "" : " off"}">${B.tok.map((o) => tokSVG(o, B, o.id === sel, true, land)).join("")}</g></g>`;
  }
  const pt = (e) => { const w = svg.querySelector(".world") || svg; const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const m = w.getScreenCTM(); if (!m) return [0, 0]; const q = p.matrixTransform(m.inverse()); return [q.x, q.y]; };
  const stage = host.querySelector(".bstage");
  const ro = window.ResizeObserver ? new ResizeObserver(() => { const r = stage.getBoundingClientRect(); const l = r.width > r.height * 1.15; if (l !== land && !drag && !live) { land = l; draw(); } }) : null;
  if (ro) ro.observe(stage);
  let drag = null, live = null;
  function liveDraw() {
    const g = svg.querySelector(".blive"); if (!g || !live) return; const p = PENS[live.c];
    g.innerHTML = live.p.length > 1 ? `<path d="${pathD(live.p)}" fill="none" stroke="${p.c}" stroke-width="${lineW(B)}" stroke-linecap="round" stroke-linejoin="round" ${p.d ? `stroke-dasharray="${p.d}"` : ""} ${live.h ? `marker-end="url(#${pfx}-${live.c})"` : ""}/>` : "";
  }
  svg.addEventListener("pointerdown", (e) => {
    const p = pt(e);
    if (mode === "move") {
      const g = e.target.closest(".btok");
      if (!g) { if (sel) { sel = null; draw(); paintTools(); } return; }
      const o = B.tok.find((t) => t.id === g.dataset.tid); if (!o) return;
      drag = { o, dx: o.x - p[0], dy: o.y - p[1], sx: p[0], sy: p[1], moved: false, pre: JSON.stringify(B) };
      svg.setPointerCapture(e.pointerId); e.preventDefault(); return;
    }
    if (mode === "gum") { const g = e.target.closest("[data-li]"); if (g) { push(); B.ln.splice(+g.dataset.li, 1); draw(); paintTools(); changed(); } return; }
    live = { p: [p], c: pen, h: mode === "arrow" ? true : head, arrow: mode === "arrow" };
    svg.setPointerCapture(e.pointerId); e.preventDefault(); liveDraw();
  });
  svg.addEventListener("pointermove", (e) => {
    if (drag) {
      const p = pt(e), o = drag.o;
      if (!drag.moved && Math.hypot(p[0] - drag.sx, p[1] - drag.sy) < .12) return;
      drag.moved = true;
      o.x = Math.min(10, Math.max(-1, p[0] + drag.dx)); o.y = Math.min(19, Math.max(-1, p[1] + drag.dy));
      const g = svg.querySelector(`[data-tid="${o.id}"]`); if (g) g.setAttribute("transform", `translate(${o.x} ${o.y})`);
      return;
    }
    if (live) {
      const p = pt(e);
      if (live.arrow) live.p[1] = p;
      else { const l = live.p[live.p.length - 1]; if (Math.hypot(p[0] - l[0], p[1] - l[1]) > .08) live.p.push(p); }
      liveDraw();
    }
  });
  const end = () => {
    if (drag) {
      const d = drag; drag = null;
      if (d.moved) { undo.push(d.pre); if (undo.length > 80) undo.shift(); changed(); } else sel = d.o.id;
      draw(); paintTools(); return;
    }
    if (live) {
      const l = live; live = null;
      const len = l.p.reduce((a, q, i) => (i ? a + Math.hypot(q[0] - l.p[i - 1][0], q[1] - l.p[i - 1][1]) : 0), 0);
      if (l.p.length > 1 && len > .25) { push(); B.ln.push({ c: l.c, h: l.h, p: l.p.map((q) => [+q[0].toFixed(2), +q[1].toFixed(2)]) }); changed(); }
      draw(); paintTools();
    }
  };
  svg.addEventListener("pointerup", end); svg.addEventListener("pointercancel", end);

  function setBig(on) {
    big = on; root.classList.toggle("max", on); document.body.classList.toggle("bord-open", on);
    try { if (on && root.requestFullscreen && !document.fullscreenElement) root.requestFullscreen().catch(() => {}); else if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {}); } catch (e) {}
    paintTools();
  }
  const onFs = () => { if (!document.fullscreenElement && big) { big = false; root.classList.remove("max"); document.body.classList.remove("bord-open"); paintTools(); } };
  document.addEventListener("fullscreenchange", onFs);
  const onKey = (e) => { if (e.key === "Escape" && big) setBig(false); };
  document.addEventListener("keydown", onKey);

  tools.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.bmode) { mode = b.dataset.bmode; if (mode !== "move") sel = null; draw(); paintTools(); }
    else if (b.dataset.bpen) { pen = b.dataset.bpen; paintTools(); }
    else if (b.dataset.badd) {
      push(); const t = b.dataset.badd; const n = B.tok.length % 5;
      const o = { id: uid("k"), t, l: nextLabel(t), x: 2 + n * 1.25, y: t === "grijs" ? 4.5 : (B.half || t === "blauw" ? 13.5 : 4.5) };
      B.tok.push(o); sel = o.id; mode = "move"; draw(); paintTools(); changed();
    }
    else if (b.dataset.bhalf) { push(); B.half = b.dataset.bhalf === "half"; draw(); paintTools(); changed(); }
    else if (b.dataset.bsize) { B.size = +b.dataset.bsize; draw(); paintTools(); changed(); }
    else if (b.dataset.bpre) { push(); const keep = B.size; B = b.dataset.bpre === "leeg" ? Object.assign(emptyBoard(), { half: B.half }) : presetBoard(b.dataset.bpre); B.size = keep; sel = null; draw(); paintTools(); changed(); }
    else if (b.dataset.bact) {
      const a = b.dataset.bact;
      if (a === "undo" && undo.length) { B = normBoard(JSON.parse(undo.pop())); if (!B.tok.some((t) => t.id === sel)) sel = null; draw(); paintTools(); changed(); }
      else if (a === "big") setBig(!big);
      else if (a === "more") { more = !more; paintTools(); }
      else if (a === "lines" && B.ln.length) { push(); B.ln = []; draw(); paintTools(); changed(); }
      else if (a === "del" && sel) { push(); B.tok = B.tok.filter((t) => t.id !== sel); sel = null; draw(); paintTools(); changed(); }
      else if (a === "desel") { sel = null; draw(); paintTools(); }
    }
  });
  tools.addEventListener("change", (e) => { if (e.target.matches("[data-bhead]")) head = e.target.checked; });
  tools.addEventListener("input", (e) => {
    if (!e.target.matches("[data-blabel]")) return;
    const o = B.tok.find((t) => t.id === sel); if (!o) return;
    o.l = e.target.value.slice(0, 3); draw(); changed();
  });

  paintTools(); draw();
  return {
    get: () => clone(B),
    set: (nb) => { push(); B = normBoard(clone(nb)); sel = null; draw(); paintTools(); },
    destroy: () => { if (ro) ro.disconnect(); document.removeEventListener("fullscreenchange", onFs); document.removeEventListener("keydown", onKey); document.body.classList.remove("bord-open"); },
  };
}
