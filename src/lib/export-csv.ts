export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const esc = (s: string | number) => {
    const t = String(s);
    return `"${t.replace(/"/g, '""')}"`;
  };
  const body = rows.map((r) => r.map(esc).join(",")).join("\r\n");
  const bom = "\ufeff";
  const blob = new Blob([bom + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
