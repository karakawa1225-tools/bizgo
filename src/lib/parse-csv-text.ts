/** UTF-8 BOM 付き BizGo 出力 CSV をパース */
export function parseCsvText(text: string): string[][] {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i++) {
    const c = normalized[i];
    if (inQuotes) {
      if (c === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  }
  return rows;
}

export function buildHeaderIndex(headerRow: string[]): Record<string, number> {
  const idx: Record<string, number> = {};
  headerRow.forEach((h, i) => {
    idx[h.trim()] = i;
  });
  return idx;
}

export function csvCell(
  row: string[],
  idx: Record<string, number>,
  name: string,
): string {
  const i = idx[name];
  if (i === undefined) return "";
  return String(row[i] ?? "").trim();
}
