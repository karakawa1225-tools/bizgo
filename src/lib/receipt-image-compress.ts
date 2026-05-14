/** 領収書プレビュー用：長辺の上限（px）。これを超える画像だけ縮小します。 */
export const RECEIPT_IMAGE_MAX_EDGE_PX = 640;

/** JPEG 品質（0〜1）。Turso 同期や localStorage 向けにやや低め。 */
export const RECEIPT_IMAGE_JPEG_QUALITY = 0.72;

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image_load_failed"));
    };
    img.src = url;
  });
}

/**
 * カメラ・ギャラリーから選んだ画像を長辺 maxEdgePx 以内の JPEG Data URL にまとめる。
 * 失敗時は null（呼び出し側で従来の Data URL 読み込みにフォールバック可能）。
 */
export async function compressReceiptImageToDataUrl(
  file: File,
  options?: { maxEdgePx?: number; quality?: number },
): Promise<string | null> {
  const maxEdge = options?.maxEdgePx ?? RECEIPT_IMAGE_MAX_EDGE_PX;
  const quality = options?.quality ?? RECEIPT_IMAGE_JPEG_QUALITY;

  let source: ImageBitmap | HTMLImageElement;
  let release: () => void;

  try {
    const bmp = await createImageBitmap(file);
    source = bmp;
    release = () => bmp.close();
  } catch {
    try {
      source = await loadImageFromFile(file);
      release = () => {};
    } catch {
      return null;
    }
  }

  const w =
    source instanceof ImageBitmap ? source.width : source.naturalWidth;
  const h =
    source instanceof ImageBitmap ? source.height : source.naturalHeight;
  if (!w || !h) {
    release();
    return null;
  }

  const scale = Math.min(1, maxEdge / Math.max(w, h));
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    release();
    return null;
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, tw, th);
  release();

  try {
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    return dataUrl.length > 32 ? dataUrl : null;
  } catch {
    return null;
  }
}
