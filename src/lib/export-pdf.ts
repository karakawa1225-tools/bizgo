import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/** A4 1ページに収める（長文は縮小） */
export async function downloadElementAsPdf(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  try {
    if (typeof document !== "undefined" && document.fonts?.ready) {
      await document.fonts.ready;
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      logging: false,
      useCORS: true,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: -window.scrollY,
      width: element.scrollWidth,
      height: element.scrollHeight,
    });

    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error("PDF用の画面が描画できませんでした。");
    }

    const imgData = canvas.toDataURL("image/png", 1);
    const pdf = new jsPDF({
      unit: "mm",
      format: "a4",
      orientation: "portrait",
    });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const maxW = pageW - 2 * margin;
    const maxH = pageH - 2 * margin;
    const pxToMm = 25.4 / 96;
    const imgWmm = canvas.width * pxToMm;
    const imgHmm = canvas.height * pxToMm;
    const ratio = Math.min(maxW / imgWmm, maxH / imgHmm, 1);
    const w = imgWmm * ratio;
    const h = imgHmm * ratio;
    const x = margin + (maxW - w) / 2;
    const y = margin + (maxH - h) / 2;
    pdf.addImage(imgData, "PNG", x, y, w, h);
    pdf.save(filename);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "PDFの作成に失敗しました。";
    throw new Error(msg);
  }
}
