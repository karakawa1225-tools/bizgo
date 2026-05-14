/** 一覧の日付表示（改行しにくい短い形） */
export function formatLineDateYmd(iso: string): string {
  const m = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[1]}/${m[2]}/${m[3]}`;
}
