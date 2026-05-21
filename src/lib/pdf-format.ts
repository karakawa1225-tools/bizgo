/** 帳票の金額（3桁区切り・￥は右端） */
export function formatPdfYen(amount: number): string {
  return `${amount.toLocaleString("ja-JP")}￥`;
}
