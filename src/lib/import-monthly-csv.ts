import type { ExpenseItem } from "@/db/schema";
import type { ExpenseRecord } from "@/lib/expense-types";
import {
  GENERAL_CSV_HEADERS,
  TRAVEL_CSV_HEADERS,
} from "@/lib/csv-monthly-headers";
import {
  CONSUMPTION_TAX_OPTIONS,
  type ConsumptionTaxRateKey,
} from "@/lib/consumption-tax";
import { parseSettlementMonthJa } from "@/lib/export-monthly-general";
import { EXPENSE_CATEGORIES } from "@/lib/demo-expenses";
import {
  createGeneralExpensePayload,
  createTravelExpensePayload,
} from "@/lib/expenses-storage";
import { parseQualifiedInvoiceNumber } from "@/lib/expense-item-fields";
import {
  buildHeaderIndex,
  csvCell,
  parseCsvText,
} from "@/lib/parse-csv-text";

export type CsvImportFormat = "general" | "travel";

export type CsvImportResult = {
  format: CsvImportFormat;
  expenses: ExpenseRecord[];
  warnings: string[];
};

function headersMatch(row: string[], expected: readonly string[]): boolean {
  if (row.length < expected.length) return false;
  return expected.every((h, i) => row[i]?.trim() === h);
}

export function detectCsvImportFormat(headerRow: string[]): CsvImportFormat | null {
  if (headersMatch(headerRow, GENERAL_CSV_HEADERS)) return "general";
  if (headersMatch(headerRow, TRAVEL_CSV_HEADERS)) return "travel";
  if (headerRow.includes("精算月") && !headerRow.includes("出張開始日")) {
    return "general";
  }
  if (headerRow.includes("出張開始日")) return "travel";
  return null;
}

function parseYen(raw: string): number {
  const n = Number.parseInt(String(raw).replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function parseYesNo(raw: string): boolean {
  const t = raw.trim();
  return t === "あり" || t === "有" || t === "true" || t === "1";
}

function taxRateFromLabel(label: string): ConsumptionTaxRateKey {
  const t = label.trim();
  const hit = CONSUMPTION_TAX_OPTIONS.find((o) => o.label === t);
  if (hit) return hit.value;
  if (t.includes("８") || t.includes("8")) return "8";
  if (t.includes("１０") || t.includes("10")) return "10";
  return "0";
}

function normalizeCategory(cat: string): string {
  const t = cat.trim();
  if ((EXPENSE_CATEGORIES as readonly string[]).includes(t)) return t;
  return t || "その他";
}

function rowToLineItem(
  row: string[],
  idx: Record<string, number>,
  expenseId: string,
): ExpenseItem | null {
  const date = csvCell(row, idx, "明細日付");
  const amount = parseYen(csvCell(row, idx, "金額（税込）"));
  if (!date || amount <= 0) return null;

  const hasReceipt = parseYesNo(csvCell(row, idx, "領収書"));
  const hasInvoice = parseYesNo(csvCell(row, idx, "インボイス"));
  const invRaw = csvCell(row, idx, "登録番号");
  const invoiceNumber = hasInvoice ? parseQualifiedInvoiceNumber(invRaw) : null;

  return {
    id: crypto.randomUUID(),
    expenseId,
    date,
    category: normalizeCategory(csvCell(row, idx, "区分")),
    amount,
    description: csvCell(row, idx, "摘要"),
    hasReceipt,
    hasInvoice: hasInvoice && Boolean(invoiceNumber),
    invoiceNumber: hasInvoice && invoiceNumber ? invoiceNumber : null,
    receiptImageDataUrl: null,
    consumptionTaxRate: taxRateFromLabel(csvCell(row, idx, "消費税区分")),
  };
}

export function expenseImportMatchKey(e: ExpenseRecord): string {
  if (e.type === "一般経費") {
    return `一般|${e.title.trim()}|${e.settlementMonth ?? ""}`;
  }
  return `出張|${e.title.trim()}|${e.startDate}|${e.endDate}`;
}

/** 取込データを既存一覧へマージ（同一キーは明細を差し替え、IDは維持） */
export function mergeImportedExpenses(
  existing: ExpenseRecord[],
  imported: ExpenseRecord[],
): ExpenseRecord[] {
  const map = new Map<string, ExpenseRecord>();
  for (const e of existing) {
    map.set(expenseImportMatchKey(e), e);
  }
  for (const inc of imported) {
    const key = expenseImportMatchKey(inc);
    const prev = map.get(key);
    if (prev) {
      const items = inc.items.map((it) => ({
        ...it,
        expenseId: prev.id,
      }));
      let perDiemLineItemId: string | null = null;
      let perDiemAutoDisabled = prev.perDiemAutoDisabled ?? false;
      for (const it of items) {
        if (it.description.startsWith("日当（")) {
          perDiemLineItemId = it.id;
          perDiemAutoDisabled = true;
          break;
        }
      }
      map.set(key, {
        ...prev,
        ...inc,
        id: prev.id,
        items,
        status: prev.status,
        syncedAt: prev.syncedAt,
        perDiemLineItemId: perDiemLineItemId ?? inc.perDiemLineItemId,
        perDiemAutoDisabled,
      });
    } else {
      map.set(key, inc);
    }
  }
  return [...map.values()];
}

function importGeneralRows(
  dataRows: string[][],
  header: Record<string, number>,
): ExpenseRecord[] {
  const groups = new Map<
    string,
    { title: string; settlementMonth: string; items: ExpenseItem[] }
  >();

  for (const row of dataRows) {
    const title = csvCell(row, header, "件名");
    if (!title) continue;
    const ym =
      parseSettlementMonthJa(csvCell(row, header, "精算月")) ??
      csvCell(row, header, "明細日付").slice(0, 7);
    if (!ym) continue;
    const gKey = `${title}|||${ym}`;
    if (!groups.has(gKey)) {
      groups.set(gKey, { title, settlementMonth: ym, items: [] });
    }
    const expenseId = gKey;
    const item = rowToLineItem(row, header, expenseId);
    if (item) groups.get(gKey)!.items.push({ ...item, expenseId: "pending" });
  }

  const out: ExpenseRecord[] = [];
  for (const g of groups.values()) {
    const id = crypto.randomUUID();
    const base = createGeneralExpensePayload({
      id,
      title: g.title,
      settlementMonth: g.settlementMonth,
    });
    base.items = g.items.map((it) => ({ ...it, expenseId: id }));
    if (base.items.length > 0) out.push(base);
  }
  return out;
}

function importTravelRows(
  dataRows: string[][],
  header: Record<string, number>,
): ExpenseRecord[] {
  const groups = new Map<
    string,
    {
      title: string;
      startDate: string;
      endDate: string;
      km: number;
      overnight: boolean;
      items: ExpenseItem[];
    }
  >();

  for (const row of dataRows) {
    const title = csvCell(row, header, "件名");
    if (!title) continue;
    if (!groups.has(title)) {
      groups.set(title, {
        title,
        startDate: "",
        endDate: "",
        km: 0,
        overnight: false,
        items: [],
      });
    }
    const g = groups.get(title)!;

    const tripStart = csvCell(row, header, "出張開始日");
    if (tripStart) {
      g.startDate = tripStart;
      g.endDate = csvCell(row, header, "出張終了日") || tripStart;
      g.km = parseYen(csvCell(row, header, "片道距離（km）"));
      g.overnight = parseYesNo(csvCell(row, header, "宿泊"));
    }

    const item = rowToLineItem(row, header, title);
    if (item) g.items.push(item);
  }

  const out: ExpenseRecord[] = [];
  for (const g of groups.values()) {
    if (!g.startDate || g.items.length === 0) continue;
    const id = crypto.randomUUID();
    let base = createTravelExpensePayload({
      id,
      title: g.title,
      startDate: g.startDate,
      endDate: g.endDate || g.startDate,
      distanceKmOneWay: g.km,
      hasOvernight: g.overnight,
    });
    base.items = g.items.map((it) => ({ ...it, expenseId: id }));
    let perDiemLineItemId: string | null = null;
    for (const it of base.items) {
      if (it.description.startsWith("日当（")) {
        perDiemLineItemId = it.id;
        break;
      }
    }
    if (perDiemLineItemId) {
      base = {
        ...base,
        perDiemLineItemId,
        perDiemAutoDisabled: true,
      };
    } else {
      base = { ...base, items: base.items };
    }
    out.push(base);
  }
  return out;
}

export function importMonthlyCsvText(text: string): CsvImportResult {
  const rows = parseCsvText(text);
  if (rows.length < 2) {
    throw new Error("CSV にヘッダーとデータ行がありません。");
  }
  const headerRow = rows[0];
  const format = detectCsvImportFormat(headerRow);
  if (!format) {
    throw new Error(
      "この CSV は BizGo の月次出力形式ではありません（経費精算または出張経費精算の CSV を選んでください）。",
    );
  }
  const header = buildHeaderIndex(headerRow);
  const dataRows = rows.slice(1);
  const warnings: string[] = [];

  const expenses =
    format === "general"
      ? importGeneralRows(dataRows, header)
      : importTravelRows(dataRows, header);

  if (expenses.length === 0) {
    warnings.push("取り込める申請がありませんでした。件名・明細日付・金額を確認してください。");
  }

  return { format, expenses, warnings };
}

export async function readCsvFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました。"));
    reader.readAsText(file);
  });
}
