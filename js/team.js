// Teams en spelers.
import { S, save, esc, uid, team } from "./state.js";
import { rolSelect } from "./opstelling.js";
import { pack, shareOrDownload, safeName, EXT } from "./share.js";
import { toast } from "./ui.js";

let confirmDel = false, renaming = false;

export function render(el) {
  const t = team();
  el.innerHTML = `<div class="page">
    <header class="phead"><div><p class="eyebrow">Je spelers</p><h1>Team</h1></div>
      <div class="tools">${S.teams.length > 1 ? `<label class="msel inline">Team<select data-a="pick">${S.teams.map((x) => `<option value="${x.id}"${x.id === t.id ? " selected" : ""}>${esc(x.naam)}</option>`).join("")}</select></label>` : ""}
      <button type="button" class="btn ghost" data-a="newteam">+ Team</button></div></header>
    <section class="card">
      ${renaming ? `<form class="addrow one" data-f="rename"><input name="naam" value="${esc(t.naam)}" maxlength="40" aria-label="Teamnaam" required><button class="btn" type="submit">Bewaar naam</button></form>`
        : `<div class="trow"><h2>${esc(t.naam)}</h2><button type="button" class="linkbtn" data-a="rename">Naam wijzigen</button></div>`}
      <form class="addrow" data-f="add" autocomplete="off">
        <input name="nr" inputmode="numeric" maxlength="3" placeholder="Nr" aria-label="Rugnummer">
        <input name="naam" maxlength="40" placeholder="Naam speler" aria-label="Naam speler" required>
        ${rolSelect('name="rol" aria-label="Vaste rol"', "")}
        <button class="btn" type="submit">Speler toevoegen</button>
      </form>
      ${t.spelers.length ? `<p class="lbl">${t.spelers.length} spelers · vaste rol (per set aan te passen bij Opstelling)</p>
      <ul class="roster">${t.spelers.map((p) => `<li>
        <input value="${esc(p.nr || "")}" data-edit="nr" data-id="${p.id}" aria-label="Rugnummer" maxlength="3" inputmode="numeric">
        <input value="${esc(p.naam)}" data-edit="naam" data-id="${p.id}" aria-label="Naam" maxlength="40">
        ${rolSelect(`data-edit="rol" data-id="${p.id}" aria-label="Vaste rol"`, p.rol)}
        <button type="button" class="del" data-del="${p.id}" aria-label="${esc(p.naam)} verwijderen">×</button></li>`).join("")}</ul>`
        : `<p class="empty">Nog geen spelers. Vul hierboven een naam in, en eventueel rugnummer en rol.</p>`}
    </section>
    <section class="card">
      <h2>Delen</h2>
      <p class="hint">Stuur je team naar een andere trainer. Die opent het bestand in zijn eigen VolleyBeert via Instellingen › Bestand openen.</p>
      <div class="tools"><button type="button" class="btn ghost" data-a="share">Team delen</button></div>
      ${S.teams.length > 1 ? `<div class="danger">${confirmDel ? `<span>${esc(t.naam)} en de wedstrijden van dit team verwijderen?</span><button type="button" class="btn warn" data-a="del-yes">Ja, verwijderen</button><button type="button" class="btn ghost" data-a="del-no">Nee</button>` : `<button type="button" class="linkbtn" data-a="delteam">Team verwijderen</button>`}</div>` : ""}
    </section>
  </div>`;
  const root = el.firstElementChild, rr = () => render(el);
  root.addEventListener("submit", (e) => {
    e.preventDefault(); const fd = new FormData(e.target);
    if (e.target.dataset.f === "add") {
      const naam = String(fd.get("naam") || "").trim(); if (!naam) return;
      t.spelers.push({ id: uid("p"), naam, nr: String(fd.get("nr") || "").trim(), rol: fd.get("rol") || "" });
      save("teams"); rr(); el.querySelector('[data-f="add"] [name="naam"]').focus();
    }
    if (e.target.dataset.f === "rename") { const n = String(fd.get("naam") || "").trim(); if (n) t.naam = n; renaming = false; save("teams"); rr(); }
  });
  root.addEventListener("change", (e) => {
    const x = e.target;
    if (x.dataset.a === "pick") { S.settings.teamId = x.value; save("settings"); confirmDel = false; rr(); return; }
    if (x.dataset.edit) { const p = t.spelers.find((q) => q.id === x.dataset.id); if (p) { p[x.dataset.edit] = x.value.trim(); save("teams"); } }
  });
  root.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-a],[data-del]"); if (!b) return;
    if (b.dataset.del) { t.spelers = t.spelers.filter((p) => p.id !== b.dataset.del); save("teams"); rr(); return; }
    const a = b.dataset.a;
    if (a === "rename") { renaming = true; rr(); el.querySelector('[data-f="rename"] input').select(); }
    if (a === "newteam") { const n = { id: uid("t"), naam: "Nieuw team", spelers: [] }; S.teams.push(n); S.settings.teamId = n.id; renaming = true; save("teams"); save("settings"); rr(); el.querySelector('[data-f="rename"] input').select(); }
    if (a === "delteam") { confirmDel = true; rr(); }
    if (a === "del-no") { confirmDel = false; rr(); }
    if (a === "del-yes") {
      for (const id in S.matches) if (S.matches[id].teamId === t.id) delete S.matches[id];
      S.teams = S.teams.filter((x) => x.id !== t.id); S.settings.teamId = S.teams[0].id; confirmDel = false;
      save("teams"); save("matches"); save("settings"); rr();
    }
    if (a === "share") {
      const r = await shareOrDownload(pack("team", { naam: t.naam, spelers: t.spelers }), safeName("Team " + t.naam) + EXT, { title: "Team " + t.naam });
      if (r === "downloaded") toast("Bestand opgeslagen in je downloads");
    }
  });
}
