import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/** html2canvas 1.x は Tailwind v4 の lab()/oklch() を解釈できない */
const PDF_CAPTURE_SAFE_CSS = `
  html, body {
    margin: 0;
    padding: 0;
    background: #ffffff !important;
    color: #000000 !important;
  }
  *, *::before, *::after {
    color: #000000 !important;
    background-color: transparent !important;
    border-color: #000000 !important;
    outline-color: #000000 !important;
    box-shadow: none !important;
    text-shadow: none !important;
  }
  table {
    border-collapse: collapse !important;
  }
  th {
    background-color: #f0f0f0 !important;
  }
`;

/** グローバル CSS（lab/oklch）を読ませず、印刷 DOM だけをキャプチャ */
async function renderPrintElementToCanvas(
  element: HTMLElement,
): Promise<HTMLCanvasElement> {
  const fontFamily = getComputedStyle(element).fontFamily;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;left:0;top:0;width:0;height:0;border:0;opacity:0;pointer-events:none;z-index:-1";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    throw new Error("PDF用の描画領域を用意できませんでした。");
  }

  try {
    doc.open();
    doc.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${PDF_CAPTURE_SAFE_CSS}</style></head><body></body></html>`,
    );
    doc.close();

    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.backgroundColor = "#ffffff";
    clone.style.color = "#000000";
    clone.style.fontFamily = fontFamily;
    doc.body.appendChild(clone);

    if (doc.fonts?.ready) {
      await doc.fonts.ready;
    }

    return await html2canvas(clone, {
      scale: 2,
      logging: false,
      useCORS: true,
      backgroundColor: "#ffffff",
      width: clone.scrollWidth,
      height: clone.scrollHeight,
      windowWidth: clone.scrollWidth,
      windowHeight: clone.scrollHeight,
      scrollX: 0,
      scrollY: 0,
    });
  } finally {
    iframe.remove();
  }
}

/** 幅を A4 に合わせ、高さは必要なら複数ページに分割 */
function addCanvasToPdf(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  margin: number,
): void {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const maxW = pageW - 2 * margin;
  const maxH = pageH - 2 * margin;
  const pxToMm = 25.4 / 96;
  const imgWmm = canvas.width * pxToMm;
  const imgHmm = canvas.height * pxToMm;
  const w = maxW;
  const h = (imgHmm * maxW) / imgWmm;

  const imgData = canvas.toDataURL("image/png", 1);
  let offset = 0;
  let pageIndex = 0;

  while (offset < h - 0.01) {
    if (pageIndex > 0) {
      pdf.addPage();
    }
    pdf.addImage(imgData, "PNG", margin, margin - offset, w, h);
    offset += maxH;
    pageIndex += 1;
    if (pageIndex > 40) break;
  }
}

/** A4 に出力（長い帳票は複数ページ） */
export async function downloadElementAsPdf(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  try {
    if (typeof document !== "undefined" && document.fonts?.ready) {
      await document.fonts.ready;
    }

    const canvas = await renderPrintElementToCanvas(element);

    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error("PDF用の画面が描画できませんでした。");
    }

    const pdf = new jsPDF({
      unit: "mm",
      format: "a4",
      orientation: "portrait",
    });
    const margin = 8;
    addCanvasToPdf(pdf, canvas, margin);
    pdf.save(filename);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "PDFの作成に失敗しました。";
    throw new Error(msg);
  }
}
