/** 日付を YYYY-MM-DD に正規化（未対応形式は null） */
export function normalizeIsoDateString(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;

  const slash = t.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (slash) {
    return `${slash[1]}-${pad2(slash[2])}-${pad2(slash[3])}`;
  }

  const ja = t.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
  if (ja) {
    return `${ja[1]}-${pad2(ja[2])}-${pad2(ja[3])}`;
  }

  const jaShort = t.match(/^(\d{4})年(\d{1,2})月(\d{1,2})$/);
  if (jaShort) {
    return `${jaShort[1]}-${pad2(jaShort[2])}-${pad2(jaShort[3])}`;
  }

  const d = new Date(t);
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return null;
}

function pad2(n: string): string {
  return String(Number(n)).padStart(2, "0");
}

/** 比較・タブ用に日付を正規化（失敗時は元文字列） */
export function coerceIsoDateString(raw: string): string {
  return normalizeIsoDateString(raw) ?? raw.trim();
}
