import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/** A4 1ページに収める（長文は縮小） */
export async function downloadElementAsPdf(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    logging: false,
    useCORS: true,
    backgroundColor: "#ffffff",
  });
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
  const cw = canvas.width;
  const ch = canvas.height;
  const ratio = Math.min(maxW / cw, maxH / ch);
  const w = cw * ratio;
  const h = ch * ratio;
  const x = margin + (maxW - w) / 2;
  const y = margin + (maxH - h) / 2;
  pdf.addImage(imgData, "PNG", x, y, w, h);
  pdf.save(filename);
}
