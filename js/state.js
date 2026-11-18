import * as db from "./db.js";

export const S = {
  settings: { pinHash: "", teamId: "", naam: "" },
  teams: [],      // [{id, naam, spelers:[{id,naam,nr,rol}]}]
  matches: {},    // id -> wedstrijd
  boards: [],     // [{id, naam, updated, state:{tok,ln,half}}]
  trainings: [],  // zie trainingen.js
};
const KEYS = ["settings", "teams", "matches", "boards", "trainings"];
const timers = {};
let statusCb = () => {};

export const uid = (p = "x") => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const clone = (o) => JSON.parse(JSON.stringify(o));
export const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export async function load() {
  for (const k of KEYS) {
    const v = await db.get(k, undefined);
    if (v !== undefined && v !== null) S[k] = v;
  }
  S.settings = Object.assign({ pinHash: "", teamId: "", naam: "" }, S.settings || {});
  if (!Array.isArray(S.teams)) S.teams = [];
  if (!S.matches || typeof S.matches !== "object") S.matches = {};
  if (!Array.isArray(S.boards)) S.boards = [];
  if (!Array.isArray(S.trainings)) S.trainings = [];
  if (!S.teams.length) {
    const t = { id: uid("t"), naam: "Mijn team", spelers: [] };
    S.teams.push(t); S.settings.teamId = t.id;
    await db.set("teams", S.teams); await db.set("settings", S.settings);
  }
  if (!S.teams.some((t) => t.id === S.settings.teamId)) S.settings.teamId = S.teams[0].id;
  db.persist();
}

export function save(key, now = false) {
  clearTimeout(timers[key]);
  statusCb("Opslaan…");
  const run = async () => {
    try { await db.set(key, clone(S[key])); statusCb(db.isMemoryOnly() ? "Niet blijvend opgeslagen (privévenster?)" : "Opgeslagen op dit apparaat"); }
    catch (e) { statusCb("Opslaan mislukt"); }
  };
  if (now) return run();
  timers[key] = setTimeout(run, 300);
}
export function onStatus(fn) { statusCb = fn; }
export const team = () => S.teams.find((t) => t.id === S.settings.teamId) || S.teams[0];
export { db };
