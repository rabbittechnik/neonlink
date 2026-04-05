/** Skaliert auf maxEdge und liefert JPEG data-URL (klein fuer In-Memory-Server). */
export function fileToAvatarDataUrl(file, maxEdge = 256, quality = 0.82) {
    const toJpeg = (source, width, height) => {
        const scale = Math.min(1, maxEdge / Math.max(width, height));
        const w = Math.max(1, Math.round(width * scale));
        const h = Math.max(1, Math.round(height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx)
            throw new Error("no_canvas");
        ctx.drawImage(source, 0, 0, w, h);
        return canvas.toDataURL("image/jpeg", quality);
    };
    if (typeof createImageBitmap === "function") {
        return (async () => {
            try {
                const bitmap = await createImageBitmap(file);
                try {
                    return toJpeg(bitmap, bitmap.width, bitmap.height);
                }
                finally {
                    bitmap.close();
                }
            }
            catch {
                /* z. B. HEIC oder Browser ohne Decoder — weiter mit Image()-Pfad */
            }
            return fileToAvatarDataUrlLegacy(file, maxEdge, quality, toJpeg);
        })();
    }
    return fileToAvatarDataUrlLegacy(file, maxEdge, quality, toJpeg);
}
function fileToAvatarDataUrlLegacy(file, maxEdge, quality, toJpeg) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            try {
                resolve(toJpeg(img, img.naturalWidth || img.width, img.naturalHeight || img.height));
            }
            catch (e) {
                reject(e instanceof Error ? e : new Error("canvas_failed"));
            }
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("image_load_failed"));
        };
        img.src = url;
    });
}
