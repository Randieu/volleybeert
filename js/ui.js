// Kleine hulpmiddelen voor de interface.
let tt = null;
export function toast(msg, ms = 2600) {
  let el = document.getElementById("toast");
  if (!el) { el = document.createElement("div"); el.id = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
  el.textContent = msg; el.classList.add("show");
  clearTimeout(tt); tt = setTimeout(() => el.classList.remove("show"), ms);
}
export const fmtDate = (d) => { if (!d) return ""; const [y, m, dd] = String(d).split("-").map(Number); if (!y || !m) return d; return new Date(y, m - 1, dd || 1).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }); };
export const fmtStamp = (t) => (t ? new Date(t).toLocaleDateString("nl-NL", { day: "numeric", month: "short" }) + " " + new Date(t).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }) : "");
