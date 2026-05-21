import type { ExpenseRecord } from "@/lib/expense-types";
import { GENERAL_CSV_HEADERS } from "@/lib/csv-monthly-headers";
import { downloadCsv } from "@/lib/export-csv";
import { totalYen } from "@/lib/expenses-storage";
import {
  consumptionTaxRateLabel,
  splitTaxIncludedYen,
  toConsumptionTaxRateKey,
} from "@/lib/consumption-tax";

/** `YYYY-MM` を CSV・帳票用の「2026年3月」表記に（Excel の日付誤認識を避ける） */
export function formatSettlementMonthJa(ym: string): string {
  const m = ym.trim().match(/^(\d{4})-(\d{1,2})$/);
  if (!m) return ym;
  const y = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isFinite(y) || month < 1 || month > 12) return ym;
  return `${y}年${month}月`;
}

/** CSV の「2026年3月」または `YYYY-MM` を精算月キーに戻す */
export function parseSettlementMonthJa(label: string): string | null {
  const t = label.trim();
  const ja = t.match(/^(\d{4})年(\d{1,2})月$/);
  if (ja) {
    const month = Number(ja[2]);
    if (month < 1 || month > 12) return null;
    return `${ja[1]}-${String(month).padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}$/.test(t)) return t;
  return null;
}

/** 指定月の一般経費をまとめた行（CSV） */
export function buildMonthlyGeneralRows(
  expenses: ExpenseRecord[],
  ym: string,
): (string | number)[][] {
  const monthLabel = formatSettlementMonthJa(ym);
  const header = [...GENERAL_CSV_HEADERS];
  const rows: (string | number)[][] = [header];
  const list = filterGeneralExpensesForMonth(expenses, ym);
  for (const e of list) {
    for (const it of e.items) {
      const rate = toConsumptionTaxRateKey(it.consumptionTaxRate);
      const split = splitTaxIncludedYen(it.amount, rate);
      rows.push([
        monthLabel,
        e.title,
        it.date,
        it.category,
        it.amount,
        consumptionTaxRateLabel(rate),
        split.exclusiveYen,
        split.taxYen,
        it.description,
        it.hasReceipt ? "あり" : "なし",
        it.hasInvoice ? "あり" : "なし",
        it.invoiceNumber ?? "",
      ]);
    }
  }
  return rows;
}

export function exportMonthlyGeneralCsv(
  expenses: ExpenseRecord[],
  ym: string,
) {
  const rows = buildMonthlyGeneralRows(expenses, ym);
  downloadCsv(`経費精算_${ym}.csv`, rows);
}

/** 精算月（YYYY-MM）の一般経費申請一覧 */
export function filterGeneralExpensesForMonth(
  expenses: ExpenseRecord[],
  ym: string,
): ExpenseRecord[] {
  return expenses.filter(
    (e) => e.type === "一般経費" && e.settlementMonth === ym,
  );
}

export function monthlyGeneralTotals(
  expenses: ExpenseRecord[],
  ym: string,
): { count: number; sum: number } {
  const list = filterGeneralExpensesForMonth(expenses, ym);
  let sum = 0;
  for (const e of list) sum += totalYen(e.items);
  return { count: list.length, sum };
}
