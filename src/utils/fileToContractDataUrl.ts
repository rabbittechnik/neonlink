import { fileToAvatarDataUrl } from "@/utils/fileToAvatarDataUrl";

const MAX_PDF_BYTES = 6 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("read_failed"));
    r.readAsDataURL(file);
  });
}

/** Bilder werden wie bisher skaliert (JPEG); PDFs unverändert als data-URL (Base64). */
export async function fileToContractDataUrl(file: File): Promise<string> {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (isPdf) {
    if (file.size > MAX_PDF_BYTES) {
      throw new Error("pdf_too_large");
    }
    const url = await readFileAsDataUrl(file);
    if (!/^data:application\/pdf;base64,/i.test(url)) {
      throw new Error("invalid_pdf");
    }
    return url;
  }
  return fileToAvatarDataUrl(file, 1600, 0.85);
}
