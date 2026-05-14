import type { ExpenseRecord } from "@/lib/expense-types";
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

/** 指定月の一般経費をまとめた行（CSV） */
export function buildMonthlyGeneralRows(
  expenses: ExpenseRecord[],
  ym: string,
): (string | number)[][] {
  const monthLabel = formatSettlementMonthJa(ym);
  const header = [
    "精算月",
    "件名",
    "明細日付",
    "区分",
    "金額（税込）",
    "消費税区分",
    "消費税別金額",
    "消費税額",
    "摘要",
    "領収書",
    "インボイス",
    "登録番号",
  ];
  const rows: (string | number)[][] = [header];
  const list = expenses.filter(
    (e) => e.type === "一般経費" && e.settlementMonth === ym,
  );
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

export function monthlyGeneralTotals(
  expenses: ExpenseRecord[],
  ym: string,
): { count: number; sum: number } {
  const list = expenses.filter(
    (e) => e.type === "一般経費" && e.settlementMonth === ym,
  );
  let sum = 0;
  for (const e of list) sum += totalYen(e.items);
  return { count: list.length, sum };
}
