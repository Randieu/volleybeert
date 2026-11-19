// Bord-tab: werkbord plus opgeslagen borden.
import { S, save, esc, uid, clone } from "./state.js";
import { mountBoard, boardSVG, boardPNG, presetBoard, normBoard } from "./board.js";
import { pack, shareOrDownload, safeName, EXT } from "./share.js";
import { toast, fmtStamp } from "./ui.js";

let inst = null, saving = false, confirmId = null, sheet = false;

export function render(el) {
  if (inst) { inst.destroy(); inst = null; }
  if (!S.settings.werkbord) S.settings.werkbord = { naam: "", id: "", state: presetBoard("66") };
  const W = S.settings.werkbord;
  const open = W.id && S.boards.find((b) => b.id === W.id);
  document.body.classList.add("bordtab");
  el.innerHTML = `<div class="page bordpage">
    <header class="bbar">
      <div class="bbname"><small>Tactiekbord</small><b>${open ? esc(open.naam) : "Nieuw bord"}</b></div>
      <button type="button" class="btn sm" data-a="${open ? "update" : "saveas"}">Opslaan</button>
      <button type="button" class="btn ghost sm" data-a="sheet" aria-expanded="${sheet}">☰ Borden</button>
    </header>
    <div class="boardhost"></div>
    ${sheet ? `<div class="bsheet" role="dialog" aria-label="Borden">
      <div class="bsheetin">
        <div class="trow"><h2>Borden</h2><button type="button" class="btn ghost sm" data-a="sheet">✕ Sluiten</button></div>
        ${saving ? `<form class="addrow one" data-f="saveas"><input name="naam" maxlength="60" placeholder="Naam, bijv. Kern 2a · tip of slag" aria-label="Naam van het bord" required value="${esc(open ? open.naam + " (kopie)" : "")}"><button class="btn" type="submit">Bewaar</button><button class="btn ghost" type="button" data-a="cancel">Annuleren</button></form>` : ""}
        <div class="tools">
          ${open ? `<button type="button" class="btn" data-a="update">Opslaan</button>` : ""}
          <button type="button" class="btn${open ? " ghost" : ""}" data-a="saveas">${open ? "Opslaan als nieuw" : "Bord opslaan"}</button>
          <button type="button" class="btn ghost" data-a="png">Afbeelding</button>
          <button type="button" class="btn ghost" data-a="fresh">Nieuw bord</button>
        </div>
        <section class="sec"><h3>Mijn borden (${S.boards.length})</h3>
      ${S.boards.length ? `<div class="bcards">${S.boards.slice().sort((a, b) => b.updated - a.updated).map((b) => `<article class="bcard${b.id === W.id ? " cur" : ""}">
        <button type="button" class="bthumb" data-open="${b.id}" aria-label="Open ${esc(b.naam)}">${boardSVG(b.state, { label: b.naam })}</button>
        <div class="bmeta"><b>${esc(b.naam)}</b><small>${fmtStamp(b.updated)}</small></div>
        <div class="tools">${confirmId === b.id ? `<button type="button" class="btn warn sm" data-del-yes="${b.id}">Verwijderen</button><button type="button" class="btn ghost sm" data-del-no>Nee</button>`
          : `<button type="button" class="btn ghost sm" data-share="${b.id}">Delen</button><button type="button" class="btn ghost sm" data-del="${b.id}" aria-label="${esc(b.naam)} verwijderen">×</button>`}</div>
      </article>`).join("")}</div>` : `<p class="empty">Nog geen opgeslagen borden. Teken iets en tik op "Opslaan".</p>`}
        </section>
      </div>
    </div>` : ""}
  </div>`;
  const root = el.firstElementChild, rr = () => render(el);
  inst = mountBoard(root.querySelector(".boardhost"), W.state, { onChange: (st) => { W.state = st; save("settings"); } });

  root.addEventListener("submit", (e) => {
    e.preventDefault(); const naam = String(new FormData(e.target).get("naam") || "").trim(); if (!naam) return;
    const b = { id: uid("b"), naam, updated: Date.now(), state: inst.get() };
    S.boards.push(b); W.id = b.id; W.naam = naam; saving = false; sheet = false; save("boards"); save("settings"); toast("Bord opgeslagen"); rr();
  });
  root.addEventListener("click", async (e) => {
    const t = e.target;
    const a = t.closest("[data-a]") && t.closest("[data-a]").dataset.a;
    if (a === "sheet") { sheet = !sheet; saving = false; confirmId = null; rr(); return; }
    if (a === "saveas") { saving = true; sheet = true; rr(); const i = el.querySelector('[data-f="saveas"] input'); if (i) { i.focus(); i.select(); } return; }
    if (a === "cancel") { saving = false; rr(); return; }
    if (a === "update" && open) { open.state = inst.get(); open.updated = Date.now(); save("boards"); toast("Opgeslagen"); rr(); return; }
    if (a === "fresh") { S.settings.werkbord = { naam: "", id: "", state: presetBoard("66") }; sheet = false; save("settings"); rr(); return; }
    if (a === "png") { const blob = await boardPNG(inst.get()); const r = await shareOrDownload(blob, safeName(open ? open.naam : "Tactiekbord") + ".png", { title: "Tactiekbord" }); if (r === "downloaded") toast("Afbeelding opgeslagen"); return; }
    const o = t.closest("[data-open]"); if (o) { const b = S.boards.find((x) => x.id === o.dataset.open); if (b) { S.settings.werkbord = { id: b.id, naam: b.naam, state: normBoard(clone(b.state)) }; sheet = false; save("settings"); rr(); } return; }
    const sh = t.closest("[data-share]"); if (sh) { const b = S.boards.find((x) => x.id === sh.dataset.share); if (b) { const r = await shareOrDownload(pack("board", { naam: b.naam, state: b.state }), safeName(b.naam) + EXT, { title: b.naam }); if (r === "downloaded") toast("Bestand opgeslagen in je downloads"); } return; }
    const d = t.closest("[data-del]"); if (d) { confirmId = d.dataset.del; rr(); return; }
    if (t.closest("[data-del-no]")) { confirmId = null; rr(); return; }
    const dy = t.closest("[data-del-yes]"); if (dy) { S.boards = S.boards.filter((x) => x.id !== dy.dataset.delYes); if (W.id === dy.dataset.delYes) W.id = ""; confirmId = null; save("boards"); save("settings"); rr(); }
  });
}
export function leave() { if (inst) { inst.destroy(); inst = null; } sheet = false; document.body.classList.remove("bordtab"); }
