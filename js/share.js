// Delen en bewaren: bestanden maken, delen via het deelmenu van de telefoon, of downloaden.
export const EXT = ".volleybeert.json";

export function blobToB64(blob) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1] || ""); r.onerror = rej; r.readAsDataURL(blob); });
}
export function b64ToBlob(b64, type) {
  const bin = atob(b64); const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return new Blob([a], { type: type || "application/octet-stream" });
}
export const safeName = (s) => (String(s || "bestand").replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim() || "bestand").slice(0, 80);

export function pack(type, data, files) {
  return new Blob([JSON.stringify({ app: "volleybeert", v: 1, type, data, files: files || {} })], { type: "application/json" });
}

// Probeert eerst het deelmenu (WhatsApp, mail, AirDrop…), anders een gewone download.
export async function shareOrDownload(blob, filename, { preferShare = true, title = "" } = {}) {
  const file = new File([blob], filename, { type: blob.type || "application/octet-stream" });
  if (preferShare && navigator.canShare && navigator.share) {
    try {
      if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: title || filename }); return "shared"; }
    } catch (e) { if (e && e.name === "AbortError") return "cancelled"; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return "downloaded";
}

export function pickFile(accept, multiple = false) {
  return new Promise((resolve) => {
    const i = document.createElement("input"); i.type = "file"; if (accept) i.accept = accept; i.multiple = multiple;
    i.style.display = "none"; document.body.appendChild(i);
    i.addEventListener("change", () => { resolve(multiple ? [...i.files] : i.files[0] || null); i.remove(); }, { once: true });
    i.click();
  });
}

export async function readPack(file) {
  const txt = await file.text();
  let o; try { o = JSON.parse(txt); } catch (e) { throw new Error("Dit is geen VolleyBeert-bestand."); }
  if (!o || !["volleybeert", "trainersbord"].includes(o.app) || !o.type) throw new Error("Dit is geen VolleyBeert-bestand.");
  return o;
}

export function openBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (!w) { const a = document.createElement("a"); a.href = url; a.target = "_blank"; a.download = name || ""; document.body.appendChild(a); a.click(); a.remove(); }
  setTimeout(() => URL.revokeObjectURL(url), 120000);
}
