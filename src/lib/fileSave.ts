// Helper untuk simpan file yang jalan di browser (vite) maupun Tauri (WebView)
// Di Tauri pakai dialog.save + fs.writeFile, di browser pakai anchor Blob.

function isTauri(): boolean {
  return typeof window !== "undefined" && (
    "__TAURI__" in window ||
    "__TAURI_INTERNALS__" in window ||
    "__TAURI_IPC__" in window ||
    navigator.userAgent.includes("Tauri")
  );
}

async function saveWithDialogOrAnchor(
  defaultFilename: string,
  data: Uint8Array,
  filters?: { name: string; extensions: string[] }[]
): Promise<boolean> {
  if (isTauri()) {
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeFile } = await import("@tauri-apps/plugin-fs");
      const ext = defaultFilename.split(".").pop() || "*";
      const dialogFilters = filters ?? [{ name: "File", extensions: [ext] }];
      const path = await save({ defaultPath: defaultFilename, filters: dialogFilters });
      if (!path) return false; // user cancel
      await writeFile(path, data);
      return true;
    } catch (e: any) {
      console.error("Tauri save failed, fallback to browser:", e);
      alert(`Gagal simpan via Tauri: ${e?.message ?? e}\nAkan coba metode browser.`);
      // fallback ke browser method
    }
  }
  // Browser fallback: anchor blob
  const blob = new Blob([data as any]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = defaultFilename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

export async function saveXlsx(
  wb: any,
  defaultFilename: string
): Promise<boolean> {
  const XLSX: any = await import("xlsx");
  // write as array untuk dapat Uint8Array
  const out: Uint8Array = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return saveWithDialogOrAnchor(defaultFilename, out, [
    { name: "Excel", extensions: ["xlsx"] },
  ]);
}

export async function savePdfArrayBuffer(
  arrayBuffer: ArrayBuffer,
  defaultFilename: string
): Promise<boolean> {
  return saveWithDialogOrAnchor(defaultFilename, new Uint8Array(arrayBuffer), [
    { name: "PDF", extensions: ["pdf"] },
  ]);
}

export async function saveCsvText(
  text: string,
  defaultFilename: string
): Promise<boolean> {
  const enc = new TextEncoder().encode(text);
  return saveWithDialogOrAnchor(defaultFilename, enc, [
    { name: "CSV", extensions: ["csv"] },
  ]);
}

export async function saveText(
  text: string,
  defaultFilename: string,
  filterName = "Text"
): Promise<boolean> {
  const ext = defaultFilename.split(".").pop() || "txt";
  return saveWithDialogOrAnchor(defaultFilename, new TextEncoder().encode(text), [
    { name: filterName, extensions: [ext] },
  ]);
}

export async function saveDataUrl(
  dataUrl: string,
  defaultFilename: string
): Promise<boolean> {
  const isPdf = dataUrl.startsWith("data:application/pdf");
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const ext = isPdf ? "pdf" : dataUrl.includes("image/png") ? "png" : "jpg";
  const filterName = isPdf ? "PDF" : "Image";
  // pakai filename user + ext yang benar
  const name = defaultFilename.includes(".") ? defaultFilename : `${defaultFilename}.${ext}`;
  return saveWithDialogOrAnchor(name, bytes, [
    { name: filterName, extensions: [ext] },
  ]);
}

export async function saveAssetPdf(
  assetUrl: string,
  defaultFilename: string
): Promise<boolean> {
  try {
    const res = await fetch(assetUrl);
    if (!res.ok) throw new Error(`fetch ${assetUrl} ${res.status}`);
    const buf = new Uint8Array(await res.arrayBuffer());
    return saveWithDialogOrAnchor(defaultFilename, buf, [
      { name: "PDF", extensions: ["pdf"] },
    ]);
  } catch (e) {
    console.error("saveAssetPdf failed", e);
    // fallback: buka di browser
    window.open(assetUrl, "_blank");
    return false;
  }
}
