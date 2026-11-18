// VolleyBeert: start, slot (pincode), navigatie, instellingen, back-up en import.
import { S, load, save, onStatus, uid, clone, esc, db } from "./state.js";
import * as teamV from "./team.js";
import * as opV from "./opstelling.js";
import * as bordV from "./bordview.js";
import * as trV from "./trainingen.js";
import { normMatch } from "./opstelling.js";
import { normBoard } from "./board.js";
import { pack, readPack, pickFile, shareOrDownload, blobToB64, b64ToBlob, EXT } from "./share.js";
import { toast } from "./ui.js";

const VERSION = "1.1.0";
const $ = (s) => document.querySelector(s);
const view = () => $("#view");
let deferredInstall = null;

/* ---------- pincode ---------- */
async function hashPin(pin) {
  const data = new TextEncoder().encode("volleybeert:" + pin);
  if (window.crypto && crypto.subtle) { const h = await crypto.subtle.digest("SHA-256", data); return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join(""); }
  let h = 0; for (const b of data) h = (h * 31 + b) >>> 0; return "x" + h.toString(16);
}
function showLock() {
  return new Promise((resolve) => {
    const el = $("#lock"); el.hidden = false; document.body.classList.add("locked");
    el.innerHTML = `<form class="lockbox" autocomplete="off"><div class="logo" aria-hidden="true"></div><h1>VolleyBeert</h1><p>Vul je pincode in</p>
      <input type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" aria-label="Pincode" autofocus>
      <button class="btn" type="submit">Openen</button><p class="lockmsg" role="status"></p>
      <details><summary>Pincode vergeten?</summary><p>De pincode kan niet worden teruggehaald. Je kunt de app wel leegmaken en opnieuw beginnen (eventueel met een back-up).</p><button type="button" class="btn warn" data-wipe>Alles wissen op dit apparaat</button></details></form>`;
    const f = el.querySelector("form"), i = f.querySelector("input"), msg = f.querySelector(".lockmsg");
    setTimeout(() => i.focus(), 50);
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      if ((await hashPin(i.value)) === S.settings.pinHash) { el.hidden = true; el.innerHTML = ""; document.body.classList.remove("locked"); resolve(); }
      else { msg.textContent = "Onjuiste pincode"; i.value = ""; i.focus(); }
    });
    f.querySelector("[data-wipe]").addEventListener("click", async () => {
      if (f.querySelector("[data-wipe]").dataset.sure) { await wipeAll(); location.reload(); return; }
      f.querySelector("[data-wipe]").dataset.sure = "1"; f.querySelector("[data-wipe]").textContent = "Zeker weten? Tik nogmaals";
    });
  });
}
async function wipeAll() {
  try { indexedDB.deleteDatabase("volleybeert"); } catch (e) {}
  try { localStorage.clear(); } catch (e) {}
}
let hiddenAt = 0;
document.addEventListener("visibilitychange", () => {
  if (document.hidden) hiddenAt = Date.now();
  else if (S.settings.pinHash && hiddenAt && Date.now() - hiddenAt > 5 * 60 * 1000) showLock();
});

/* ---------- import ---------- */
export async function importFile(file) {
  let o; try { o = await readPack(file); } catch (e) { toast(e.message); return; }
  if (o.type === "team") {
    const ids = {}, t = { id: uid("t"), naam: o.data.naam || "Gedeeld team", spelers: (o.data.spelers || []).map((p) => ({ ...p, id: (ids[p.id] = uid("p")) })) };
    t.cap = ids[o.data.cap] || ""; t.vcap = ids[o.data.vcap] || "";
    S.teams.push(t); S.settings.teamId = t.id; save("teams"); save("settings"); toast(`Team "${t.naam}" toegevoegd`); location.hash = "team";
  } else if (o.type === "board") {
    S.boards.push({ id: uid("b"), naam: o.data.naam || "Gedeeld bord", updated: Date.now(), state: normBoard(o.data.state) }); save("boards"); toast("Bord toegevoegd aan Mijn borden"); location.hash = "bord";
  } else if (o.type === "training") {
    const t = await trV.importTraining(o); toast("Training toegevoegd"); location.hash = "training-" + t.id;
  } else if (o.type === "backup") {
    const d = o.data || {};
    for (const k of ["teams", "matches", "boards", "trainings"]) if (d[k]) S[k] = d[k];
    if (d.settings) S.settings = Object.assign({}, S.settings, d.settings, { pinHash: S.settings.pinHash });
    for (const id in o.files || {}) { const f = o.files[id]; await db.putFile(id, { naam: f.naam, type: f.type, blob: b64ToBlob(f.b64, f.type) }); }
    for (const k of ["teams", "matches", "boards", "trainings", "settings"]) await save(k, true);
    toast("Back-up teruggezet"); route();
  } else toast("Onbekend soort bestand");
}
async function backup() {
  const files = {};
  for (const t of S.trainings) for (const b of t.bijlagen || []) { const f = await db.getFile(b.id); if (f && f.blob) files[b.id] = { naam: b.naam, type: b.type, b64: await blobToB64(f.blob) }; }
  const data = clone({ teams: S.teams, matches: S.matches, boards: S.boards, trainings: S.trainings, settings: { teamId: S.settings.teamId, werkbord: S.settings.werkbord } });
  const d = new Date().toISOString().slice(0, 10);
  const r = await shareOrDownload(pack("backup", data, files), `VolleyBeert back-up ${d}${EXT}`, { title: "VolleyBeert back-up" });
  if (r === "downloaded") toast("Back-up opgeslagen in je downloads");
}

/* ---------- instellingen ---------- */
function renderSettings(el) {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  el.innerHTML = `<div class="page">
    <header class="phead"><div><p class="eyebrow">VolleyBeert ${VERSION}</p><h1>Instellingen</h1></div></header>
    <section class="card"><h2>Bestand openen</h2><p class="hint">Een team, bord, training of back-up die iemand je stuurde (eindigt op <code>${EXT}</code>).</p><div class="tools"><button type="button" class="btn" data-a="import">Bestand openen</button></div></section>
    <section class="card"><h2>Pincode</h2>
      <p class="hint">Een slot tegen meekijken als iemand je telefoon pakt. Je gegevens staan alleen op dit apparaat. Let op: een vergeten pincode is niet terug te halen.</p>
      <form class="addrow one" data-f="pin" autocomplete="off"><input name="pin" type="password" inputmode="numeric" pattern="[0-9]*" minlength="4" maxlength="8" placeholder="${S.settings.pinHash ? "Nieuwe pincode" : "Pincode (4–8 cijfers)"}" aria-label="Pincode"><button class="btn" type="submit">${S.settings.pinHash ? "Wijzig pincode" : "Zet pincode aan"}</button></form>
      ${S.settings.pinHash ? `<button type="button" class="linkbtn" data-a="pinoff">Pincode uitzetten</button>` : ""}
    </section>
    <section class="card"><h2>Back-up</h2><p class="hint">Alles staat alleen op dit apparaat. Maak af en toe een back-up (bijvoorbeeld naar je mail of Google Drive/iCloud), of zet je spullen zo over naar een nieuwe telefoon.</p>
      <div class="tools"><button type="button" class="btn ghost" data-a="backup">Back-up maken</button><button type="button" class="btn ghost" data-a="import">Back-up terugzetten</button></div><p class="hint" id="usage"></p></section>
    <section class="card"><h2>Installeren als app</h2>
      ${standalone ? `<p>De app is geïnstalleerd en werkt ook zonder internet.</p>` : ios
        ? `<ol class="steps"><li>Open deze pagina in <b>Safari</b>.</li><li>Tik op de deelknop (vierkantje met pijl omhoog).</li><li>Kies <b>Zet op beginscherm</b> en tik op <b>Voeg toe</b>.</li></ol>`
        : `${deferredInstall ? `<div class="tools"><button type="button" class="btn" data-a="install">Installeer VolleyBeert</button></div>` : ""}<ol class="steps"><li>Open deze pagina in <b>Chrome</b>.</li><li>Tik op het menu (⋮) rechtsboven.</li><li>Kies <b>App installeren</b> of <b>Toevoegen aan startscherm</b>.</li></ol>`}
      <p class="hint">Na het installeren opent VolleyBeert als een gewone app en werkt hij ook in de zaal zonder internet.</p></section>
  </div>`;
  const root = el.firstElementChild;
  if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then((e) => { const u = $("#usage"); if (u && e.usage != null) u.textContent = `In gebruik: ${(e.usage / 1048576).toFixed(1)} MB${db.isMemoryOnly() ? " · let op: deze browser bewaart niets (privévenster?)" : ""}`; });
  root.addEventListener("submit", async (e) => {
    e.preventDefault(); const pin = String(new FormData(e.target).get("pin") || "");
    if (!/^\d{4,8}$/.test(pin)) { toast("Gebruik 4 tot 8 cijfers"); return; }
    S.settings.pinHash = await hashPin(pin); await save("settings", true); toast("Pincode ingesteld"); renderSettings(el);
  });
  root.addEventListener("click", async (e) => {
    const a = e.target.closest("[data-a]"); if (!a) return;
    if (a.dataset.a === "import") { const f = await pickFile(".json,application/json"); if (f) importFile(f); }
    if (a.dataset.a === "backup") backup();
    if (a.dataset.a === "pinoff") { S.settings.pinHash = ""; await save("settings", true); toast("Pincode uit"); renderSettings(el); }
    if (a.dataset.a === "install" && deferredInstall) { deferredInstall.prompt(); deferredInstall = null; }
  });
}

/* ---------- navigatie ---------- */
const TABS = [["team", "Team"], ["opstelling", "Opstelling"], ["bord", "Bord"], ["trainingen", "Trainingen"], ["instellingen", "Meer"]];
function route() {
  const h = (location.hash || "#bord").slice(1);
  const tab = h.startsWith("training") ? "trainingen" : TABS.some((t) => t[0] === h) ? h : "bord";
  document.querySelectorAll(".nav a").forEach((a) => { if (a.dataset.tab === tab) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  if (tab !== "bord") bordV.leave();
  const el = view();
  if (tab === "team") teamV.render(el);
  else if (tab === "opstelling") opV.render(el);
  else if (tab === "trainingen") trV.render(el, h);
  else if (tab === "instellingen") renderSettings(el);
  else bordV.render(el);
  try { localStorage.setItem("tb-last", h); } catch (e) {}
}

async function start() {
  await load();
  for (const id in S.matches) S.matches[id] = normMatch(S.matches[id]);
  S.trainings = S.trainings.map(trV.normTraining);
  onStatus((m) => { const s = $("#savestate"); if (s) s.textContent = m; });
  $("#nav").innerHTML = TABS.map(([k, v]) => `<a href="#${k}" data-tab="${k}"><span class="ic ic-${k}" aria-hidden="true"></span><span>${v}</span></a>`).join("");
  if (!location.hash) { let last = ""; try { last = localStorage.getItem("tb-last") || ""; } catch (e) {} if (last) location.replace("#" + last); }
  if (S.settings.pinHash) await showLock();
  addEventListener("hashchange", () => { route(); scrollTo(0, 0); });
  route();
}

addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredInstall = e; });
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").then((reg) => {
    reg.addEventListener("updatefound", () => { const w = reg.installing; if (w) w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) toast("Nieuwe versie klaar: sluit en open de app opnieuw", 6000); }); });
  }).catch(() => {}));
}
start();
