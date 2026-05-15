import type { ExpenseRecord } from "@/lib/expense-types";
import { downloadCsv } from "@/lib/export-csv";
import { formatSettlementMonthJa } from "@/lib/export-monthly-general";
import { totalYen } from "@/lib/expenses-storage";
import {
  consumptionTaxRateLabel,
  splitTaxIncludedYen,
  toConsumptionTaxRateKey,
} from "@/lib/consumption-tax";
import {
  countTravelDaysInclusive,
  deriveTravelAmounts,
  monthBounds,
} from "@/lib/travel-calculations";

/** 出張期間が対象月（YYYY-MM）と重なる申請 */
export function filterTravelExpensesForMonth(
  expenses: ExpenseRecord[],
  ym: string,
): ExpenseRecord[] {
  const { start: monthStart, end: monthEnd } = monthBounds(ym);
  return expenses.filter(
    (e) =>
      e.type === "出張" &&
      e.startDate <= monthEnd &&
      e.endDate >= monthStart,
  );
}

/** 指定月に重なる出張の明細行（CSV） */
export function buildMonthlyTravelRows(
  expenses: ExpenseRecord[],
  ym: string,
): (string | number)[][] {
  const monthLabel = formatSettlementMonthJa(ym);
  const header = [
    "対象月",
    "件名",
    "出張開始日",
    "出張終了日",
    "出張日数",
    "片道距離（km）",
    "宿泊",
    "日当合計",
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
  const list = filterTravelExpensesForMonth(expenses, ym);

  for (const e of list) {
    const travelDays = countTravelDaysInclusive(e.startDate, e.endDate);
    const derived = deriveTravelAmounts(
      e.startDate,
      e.endDate,
      e.distanceKmOneWay,
      e.hasOvernight,
      e.executivePerDiem,
    );
    const tripMeta = {
      monthLabel,
      title: e.title,
      start: e.startDate,
      end: e.endDate,
      days: travelDays,
      km: e.distanceKmOneWay ?? 0,
      overnight: e.hasOvernight ? "あり" : "なし",
      perDiemTotal: derived.perDiemTotalYen,
    };

    if (e.items.length === 0) {
      rows.push([
        tripMeta.monthLabel,
        tripMeta.title,
        tripMeta.start,
        tripMeta.end,
        tripMeta.days,
        tripMeta.km,
        tripMeta.overnight,
        tripMeta.perDiemTotal,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ]);
      continue;
    }

    for (const it of e.items) {
      const rate = toConsumptionTaxRateKey(it.consumptionTaxRate);
      const split = splitTaxIncludedYen(it.amount, rate);
      rows.push([
        tripMeta.monthLabel,
        tripMeta.title,
        tripMeta.start,
        tripMeta.end,
        tripMeta.days,
        tripMeta.km,
        tripMeta.overnight,
        tripMeta.perDiemTotal,
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

export function exportMonthlyTravelCsv(
  expenses: ExpenseRecord[],
  ym: string,
) {
  const rows = buildMonthlyTravelRows(expenses, ym);
  downloadCsv(`出張経費精算_${ym}.csv`, rows);
}

export function monthlyTravelTotals(
  expenses: ExpenseRecord[],
  ym: string,
): { count: number; sum: number } {
  const list = filterTravelExpensesForMonth(expenses, ym);
  let sum = 0;
  for (const e of list) sum += totalYen(e.items);
  return { count: list.length, sum };
}
