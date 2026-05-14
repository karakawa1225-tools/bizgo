import type { ExpenseItem } from "@/db/schema";
import type { ExpenseRecord, ExpenseTypeLabel } from "@/lib/expense-types";
import { normalizeExpenseItem } from "@/lib/expense-item-fields";
import { DEMO_EXPENSES } from "@/lib/demo-expenses";
import { syncPerDiemItems } from "@/lib/per-diem-sync";
import {
  deriveTravelAmounts,
  monthBounds,
  PER_DIEM_EXECUTIVE_YEN,
} from "@/lib/travel-calculations";

export type { ExpenseRecord, ExpenseTypeLabel };
export const STORAGE_KEY_V2 = "bizgo-expenses-v2";
const STORAGE_KEY_V1 = "bizgo-expenses-v1";

type LegacyRow = Omit<
  ExpenseRecord,
  | "settlementMonth"
  | "distanceKmOneWay"
  | "hasOvernight"
  | "executivePerDiem"
  | "perDiemLineItemId"
> & {
  settlementMonth?: string | null;
  distanceKmOneWay?: number | null;
  hasOvernight?: boolean | null;
  executivePerDiem?: boolean | null;
  perDiemLineItemId?: string | null;
};

export function seedFromDemo(): ExpenseRecord[] {
  return DEMO_EXPENSES.map((e) => {
    const type = e.type as ExpenseTypeLabel;
    const settlementMonth = e.startDate.slice(0, 7);
    const base: ExpenseRecord = {
      id: e.id,
      title: e.title,
      type,
      startDate: e.startDate,
      endDate: e.endDate,
      settlementMonth: type === "一般経費" ? settlementMonth : null,
      status: e.status as "入力中" | "送信済",
      syncedAt: e.syncedAt ? e.syncedAt.getTime() : null,
      items: e.items.map((it) => normalizeExpenseItem(it)),
      distanceKmOneWay: type === "出張" ? 120 : null,
      hasOvernight: type === "出張" ? false : null,
      executivePerDiem: type === "出張" ? true : null,
      perDiemLineItemId: null,
      perDiemAutoDisabled: false,
    };

    if (type === "出張") {
      const d = deriveTravelAmounts(
        base.startDate,
        base.endDate,
        base.distanceKmOneWay,
        base.hasOvernight,
        base.executivePerDiem,
      );
      if (d.perDiemTotalYen > 0) {
        const lineId = "770e8400-e29b-41d4-a716-446655440099";
        base.perDiemLineItemId = lineId;
        base.items = [
          {
            id: lineId,
            expenseId: base.id,
            date: base.startDate,
            category: "その他",
            amount: d.perDiemTotalYen,
            description: `日当（${d.travelDays}日 × ¥${PER_DIEM_EXECUTIVE_YEN.toLocaleString("ja-JP")}・役員）`,
            hasReceipt: false,
            hasInvoice: false,
            invoiceNumber: null,
            receiptImageDataUrl: null,
          },
          ...base.items,
        ];
      }
    }

    return base;
  });
}

function migrateRow(e: LegacyRow): ExpenseRecord {
  const startDate = e.startDate ?? new Date().toISOString().slice(0, 10);
  const endDate = e.endDate ?? startDate;
  const type = e.type === "出張" || e.type === "一般経費" ? e.type : "一般経費";
  const settlementMonth =
    e.settlementMonth ??
    (type === "一般経費" ? startDate.slice(0, 7) : null);

  const rec: ExpenseRecord = {
    id: String(e.id),
    title: String(e.title ?? ""),
    type,
    startDate,
    endDate,
    settlementMonth,
    status: e.status === "送信済" ? "送信済" : "入力中",
    syncedAt: typeof e.syncedAt === "number" ? e.syncedAt : null,
    items: Array.isArray(e.items)
      ? e.items.map((it) => normalizeExpenseItem(it))
      : [],
    distanceKmOneWay:
      e.distanceKmOneWay ??
      (type === "出張" ? 0 : null),
    hasOvernight:
      e.hasOvernight ?? (type === "出張" ? false : null),
    executivePerDiem:
      e.executivePerDiem ?? (type === "出張" ? true : null),
    perDiemLineItemId:
      typeof e.perDiemLineItemId === "string" ? e.perDiemLineItemId : null,
    perDiemAutoDisabled:
      typeof (e as { perDiemAutoDisabled?: boolean }).perDiemAutoDisabled ===
      "boolean"
        ? (e as { perDiemAutoDisabled: boolean }).perDiemAutoDisabled
        : false,
  };

  if (type === "出張" && rec.distanceKmOneWay === 0) {
    rec.distanceKmOneWay = 120;
  }

  const synced = syncPerDiemItems(rec, rec.items);
  return { ...rec, items: synced.items, perDiemLineItemId: synced.perDiemLineItemId };
}

function parseList(raw: string): ExpenseRecord[] | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.map((row) => migrateRow(row as LegacyRow));
  } catch {
    return null;
  }
}

export function loadExpenses(): ExpenseRecord[] {
  if (typeof window === "undefined") return seedFromDemo();

  const v2 = window.localStorage.getItem(STORAGE_KEY_V2);
  if (v2) {
    const list = parseList(v2);
    if (list) return list;
  }

  const v1 = window.localStorage.getItem(STORAGE_KEY_V1);
  if (v1) {
    const list = parseList(v1);
    if (list) {
      window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(list));
      return list;
    }
  }

  const seed = seedFromDemo();
  window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(seed));
  return seed;
}

export function saveExpenses(list: ExpenseRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(list));
  } catch {
    /* quota */
  }
}

export function totalYen(items: ExpenseItem[]): number {
  return items.reduce((s, i) => s + i.amount, 0);
}

export function createGeneralExpensePayload(input: {
  id: string;
  title: string;
  settlementMonth: string;
}): ExpenseRecord {
  const { start, end } = monthBounds(input.settlementMonth);
  return {
    id: input.id,
    title: input.title.trim(),
    type: "一般経費",
    startDate: start,
    endDate: end,
    settlementMonth: input.settlementMonth,
    status: "入力中",
    syncedAt: null,
    items: [],
    distanceKmOneWay: null,
    hasOvernight: null,
    executivePerDiem: null,
    perDiemLineItemId: null,
    perDiemAutoDisabled: false,
  };
}

export function createTravelExpensePayload(input: {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  distanceKmOneWay: number;
  hasOvernight: boolean;
}): ExpenseRecord {
  const base: ExpenseRecord = {
    id: input.id,
    title: input.title.trim(),
    type: "出張",
    startDate: input.startDate,
    endDate: input.endDate,
    settlementMonth: null,
    status: "入力中",
    syncedAt: null,
    items: [],
    distanceKmOneWay: input.distanceKmOneWay,
    hasOvernight: input.hasOvernight,
    executivePerDiem: true,
    perDiemLineItemId: null,
    perDiemAutoDisabled: false,
  };
  const synced = syncPerDiemItems(base, []);
  return { ...base, items: synced.items, perDiemLineItemId: synced.perDiemLineItemId };
}
