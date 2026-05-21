import type { ExpenseRecord } from "@/lib/expense-types";
import { TRAVEL_CSV_HEADERS } from "@/lib/csv-monthly-headers";
import { downloadCsv } from "@/lib/export-csv";
import { formatSettlementMonthJa } from "@/lib/export-monthly-general";
import { totalYen } from "@/lib/expenses-storage";
import {
  consumptionTaxRateLabel,
  splitTaxIncludedYen,
  toConsumptionTaxRateKey,
} from "@/lib/consumption-tax";
import { travelExpenseOverlapsMonth } from "@/lib/expense-list-utils";
import {
  countTravelDaysInclusive,
  deriveTravelAmounts,
} from "@/lib/travel-calculations";

/** 出張期間が対象月（YYYY-MM）と重なる申請 */
export function filterTravelExpensesForMonth(
  expenses: ExpenseRecord[],
  ym: string,
): ExpenseRecord[] {
  return expenses.filter(
    (e) => e.type === "出張" && travelExpenseOverlapsMonth(e, ym),
  );
}

const EMPTY_TRAVEL_META: (string | number)[] = ["", "", "", "", "", ""];

function isPerDiemLineItem(e: ExpenseRecord, it: { id: string; description: string }) {
  if (e.perDiemLineItemId && it.id === e.perDiemLineItemId) return true;
  return it.description.startsWith("日当（");
}

function buildTravelMetaCells(e: ExpenseRecord): (string | number)[] {
  const travelDays = countTravelDaysInclusive(e.startDate, e.endDate);
  const derived = deriveTravelAmounts(
    e.startDate,
    e.endDate,
    e.distanceKmOneWay,
    e.hasOvernight,
    e.executivePerDiem,
  );
  return [
    e.startDate,
    e.endDate,
    travelDays,
    e.distanceKmOneWay ?? 0,
    e.hasOvernight ? "あり" : "なし",
    derived.perDiemTotalYen,
  ];
}

/** 指定月に重なる出張の明細行（CSV）。出張条件・日当は日当行のみに出力。 */
export function buildMonthlyTravelRows(
  expenses: ExpenseRecord[],
  ym: string,
): (string | number)[][] {
  const monthLabel = formatSettlementMonthJa(ym);
  const header = [...TRAVEL_CSV_HEADERS];
  const rows: (string | number)[][] = [header];
  const list = filterTravelExpensesForMonth(expenses, ym);

  for (const e of list) {
    for (const it of e.items) {
      const rate = toConsumptionTaxRateKey(it.consumptionTaxRate);
      const split = splitTaxIncludedYen(it.amount, rate);
      const travelMeta = isPerDiemLineItem(e, it)
        ? buildTravelMetaCells(e)
        : EMPTY_TRAVEL_META;
      rows.push([
        monthLabel,
        e.title,
        ...travelMeta,
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
