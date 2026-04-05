/** Dateiendung aus data-URL (Standard: jpg). */
export function imageExtFromDataUrl(dataUrl) {
    const m = /^data:image\/([a-z0-9+]+)/i.exec(dataUrl);
    if (!m)
        return "jpg";
    const t = m[1].toLowerCase();
    if (t === "jpeg")
        return "jpg";
    return t;
}
export function isPdfDataUrl(dataUrl) {
    return /^data:application\/pdf/i.test(dataUrl);
}
/** Bild (.jpg …) oder PDF für Downloads / ZIP. */
export function mediaExtFromDataUrl(dataUrl) {
    if (isPdfDataUrl(dataUrl))
        return "pdf";
    return imageExtFromDataUrl(dataUrl);
}
export function slugifyDownloadBase(name) {
    const s = name
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^\w\-äöüÄÖÜß.]+/g, "")
        .slice(0, 72);
    return s || "Dokument";
}
/** Einzeldownload (Browser „Speichern unter“ / Download-Ordner je nach Einstellung). */
export function downloadDataUrl(dataUrl, filename) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
/**
 * Mehrere Downloads nacheinander (kurze Pause, damit der Browser nicht alles blockiert).
 */
export async function downloadDataUrlsStaggered(items, delayMs = 400) {
    for (let i = 0; i < items.length; i++) {
        const { dataUrl, filename } = items[i];
        downloadDataUrl(dataUrl, filename);
        if (i < items.length - 1) {
            await new Promise((r) => setTimeout(r, delayMs));
        }
    }
}
