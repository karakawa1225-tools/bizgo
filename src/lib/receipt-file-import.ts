import { compressReceiptImageToDataUrl } from "@/lib/receipt-image-compress";

/** ファイル選択ダイアログ用（PC では PDF も選択可） */
export const RECEIPT_FILE_ACCEPT = "image/*,application/pdf,.pdf";

/** カメラ撮影用（画像のみ） */
export const RECEIPT_CAMERA_ACCEPT = "image/*";

/** Turso 同期・localStorage 向けの PDF 上限 */
export const RECEIPT_PDF_MAX_BYTES = 4 * 1024 * 1024;

export function isReceiptPdfDataUrl(
  dataUrl: string | null | undefined,
): boolean {
  return Boolean(dataUrl?.startsWith("data:application/pdf"));
}

function readFileAsDataUrl(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

function isPdfFile(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

/** 領収書添付（画像は圧縮、PDF は Data URL のまま） */
export async function processReceiptAttachmentFile(file: File): Promise<{
  dataUrl: string | null;
  error?: string;
}> {
  if (isPdfFile(file)) {
    if (file.size > RECEIPT_PDF_MAX_BYTES) {
      return {
        dataUrl: null,
        error: `PDFは${RECEIPT_PDF_MAX_BYTES / (1024 * 1024)}MB以下にしてください。`,
      };
    }
    const dataUrl = await readFileAsDataUrl(file);
    if (!dataUrl || !isReceiptPdfDataUrl(dataUrl)) {
      return { dataUrl: null, error: "PDFの読み込みに失敗しました。" };
    }
    return { dataUrl };
  }

  const compressed = await compressReceiptImageToDataUrl(file);
  if (compressed) return { dataUrl: compressed };

  if (file.type.startsWith("image/")) {
    const dataUrl = await readFileAsDataUrl(file);
    if (dataUrl) return { dataUrl };
    return { dataUrl: null, error: "画像の読み込みに失敗しました。" };
  }

  return {
    dataUrl: null,
    error: "写真（JPEG/PNG 等）または PDF を選んでください。",
  };
}
