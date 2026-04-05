import JSZip from "jszip";
import { mediaExtFromDataUrl, slugifyDownloadBase } from "@/utils/downloadDataUrl";
import type { ContractBundleDetail } from "@/types/contracts";

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const i = dataUrl.indexOf(",");
  if (i < 0) throw new Error("invalid_data_url");
  const b64 = dataUrl.slice(i + 1);
  const binary = atob(b64);
  const len = binary.length;
  const out = new Uint8Array(len);
  for (let j = 0; j < len; j++) out[j] = binary.charCodeAt(j);
  return out;
}

/** Mehrere Vertrags-Bundles als ZIP (Ordner pro Dokument). */
export async function downloadBundlesAsZip(
  bundles: ContractBundleDetail[],
  zipNameBase: string
): Promise<void> {
  const zip = new JSZip();
  const usedFolders = new Set<string>();

  bundles.forEach((b, idx) => {
    const slug = slugifyDownloadBase(b.title);
    const short = b.id.replace(/^ctr-/, "").slice(0, 10);
    let folder = `${String(idx + 1).padStart(2, "0")}_${slug}_${short}`.replace(/[/\\:*?"<>|]+/g, "_").slice(0, 120);
    let n = 1;
    while (usedFolders.has(folder)) {
      folder = `${String(idx + 1).padStart(2, "0")}_${slug}_${short}_${n++}`.replace(/[/\\:*?"<>|]+/g, "_").slice(0, 120);
    }
    usedFolders.add(folder);

    b.pageDataUrls.forEach((url, pi) => {
      const ext = mediaExtFromDataUrl(url);
      const fileName =
        b.pageDataUrls.length > 1 ? `Seite_${pi + 1}.${ext}` : `Dokument.${ext}`;
      zip.file(`${folder}/${fileName}`, dataUrlToUint8Array(url));
    });
  });

  const blob = await zip.generateAsync({ type: "blob" });
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = `${slugifyDownloadBase(zipNameBase)}.zip`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}
