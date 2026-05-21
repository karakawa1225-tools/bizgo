import type { ExpenseRecord } from "@/lib/expense-types";
import type { ExpenseTypeLabel } from "@/lib/expenses-storage";
import { coerceIsoDateString } from "@/lib/iso-date";
import { monthBounds } from "@/lib/travel-calculations";

function travelDateRange(e: ExpenseRecord): { start: string; end: string } | null {
  if (e.type !== "出張" || !e.startDate || !e.endDate) return null;
  return {
    start: coerceIsoDateString(e.startDate),
    end: coerceIsoDateString(e.endDate),
  };
}

/** 出張期間が YYYY-MM と重なるか（月次 CSV 出力と同じ基準） */
export function travelExpenseOverlapsMonth(
  e: ExpenseRecord,
  ym: string,
): boolean {
  const range = travelDateRange(e);
  if (!range) return false;
  const { start: monthStart, end: monthEnd } = monthBounds(ym);
  return range.start <= monthEnd && range.end >= monthStart;
}

/** 出張開始〜終了にまたがる YYYY-MM 一覧 */
export function monthsOverlappingTravelExpense(e: ExpenseRecord): string[] {
  const range = travelDateRange(e);
  if (!range) return [];
  return enumerateYmInclusive(range.start.slice(0, 7), range.end.slice(0, 7));
}

function enumerateYmInclusive(startYm: string, endYm: string): string[] {
  const sm = startYm.match(/^(\d{4})-(\d{2})$/);
  const em = endYm.match(/^(\d{4})-(\d{2})$/);
  if (!sm || !em) return startYm === endYm && sm ? [startYm] : [];
  let y = Number(sm[1]);
  let m = Number(sm[2]);
  const ey = Number(em[1]);
  const emm = Number(em[2]);
  const out: string[] = [];
  while (y < ey || (y === ey && m <= emm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

/** 一覧の並び・タブ用の精算日（昇順キー） */
export function getExpenseSettlementSortKey(e: ExpenseRecord): string {
  if (e.type === "一般経費") {
    const ym = e.settlementMonth ?? e.startDate.slice(0, 7);
    return `${ym}-01`;
  }
  return e.startDate;
}

/** 月タブ用 YYYY-MM */
export function getExpenseTabYm(e: ExpenseRecord): string {
  if (e.type === "一般経費") {
    return e.settlementMonth ?? e.startDate.slice(0, 7);
  }
  return e.startDate.slice(0, 7);
}

export function sortExpensesBySettlementAsc(list: ExpenseRecord[]): ExpenseRecord[] {
  return [...list].sort((a, b) => {
    const ka = getExpenseSettlementSortKey(a);
    const kb = getExpenseSettlementSortKey(b);
    if (ka !== kb) return ka.localeCompare(kb);
    return a.title.localeCompare(b.title, "ja");
  });
}

export function filterExpensesByType(
  expenses: ExpenseRecord[],
  type: ExpenseTypeLabel,
): ExpenseRecord[] {
  return expenses.filter((e) => e.type === type);
}

/** 種別ごとの YYYY-MM 一覧（新しい月が先） */
export function collectTabMonths(
  expenses: ExpenseRecord[],
  type: ExpenseTypeLabel,
): string[] {
  const set = new Set<string>();
  for (const e of expenses) {
    if (e.type !== type) continue;
    if (type === "出張") {
      for (const ym of monthsOverlappingTravelExpense(e)) {
        set.add(ym);
      }
    } else {
      set.add(getExpenseTabYm(e));
    }
  }
  return [...set].sort((a, b) => b.localeCompare(a));
}

export function formatTabMonthLabel(ym: string): string {
  const m = ym.match(/^(\d{4})-(\d{2})$/);
  if (!m) return ym;
  return `${Number(m[1])}年${Number(m[2])}月`;
}

export function pickDefaultTabYm(months: string[]): string {
  if (months.length === 0) return new Date().toISOString().slice(0, 7);
  const now = new Date().toISOString().slice(0, 7);
  if (months.includes(now)) return now;
  return months[0];
}

export function settlementDateLabel(e: ExpenseRecord): string {
  if (e.type === "一般経費") {
    return e.settlementMonth ? `精算月 ${e.settlementMonth}` : e.startDate;
  }
  return `${e.startDate} 〜 ${e.endDate}`;
}
