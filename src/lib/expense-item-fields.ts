import type { ExpenseItem } from "@/db/schema";
import {
  type ConsumptionTaxRateKey,
  isConsumptionTaxRateKey,
} from "@/lib/consumption-tax";

/** 適格請求書登録番号: T の直後に数字13桁（ハイフンは入力時のみ許容） */
export const QUALIFIED_INVOICE_PATTERN = /^T-?(\d{13})$/i;

export function parseQualifiedInvoiceNumber(input: string): string | null {
  const s = input.trim().toUpperCase();
  const m = s.match(QUALIFIED_INVOICE_PATTERN);
  if (!m) return null;
  return `T${m[1]}`;
}

export function isValidQualifiedInvoiceNumber(input: string): boolean {
  return parseQualifiedInvoiceNumber(input) !== null;
}

/** localStorage / 旧データ向けに明細行を正規化 */
export function normalizeExpenseItem(raw: unknown): ExpenseItem {
  const o = (raw ?? {}) as Record<string, unknown>;
  const id = String(o.id ?? crypto.randomUUID());
  const expenseId = String(o.expenseId ?? o.expense_id ?? "");
  const date = String(o.date ?? new Date().toISOString().slice(0, 10));
  const category = String(o.category ?? "その他");
  const amount = Number(o.amount);
  const description = String(o.description ?? "");
  const hasReceipt = o.hasReceipt === true || o.has_receipt === true;
  const invoiceRaw = o.invoiceNumber ?? o.invoice_number;
  let invoiceNumber =
    typeof invoiceRaw === "string" && invoiceRaw.trim()
      ? parseQualifiedInvoiceNumber(invoiceRaw)
      : null;
  let hasInvoice = o.hasInvoice === true || o.has_invoice === true;
  if (hasInvoice && !invoiceNumber) {
    hasInvoice = false;
    invoiceNumber = null;
  }
  const imgRaw = o.receiptImageDataUrl ?? o.receipt_image_data_url;
  let receiptImageDataUrl =
    typeof imgRaw === "string" && imgRaw.startsWith("data:") ? imgRaw : null;
  if (!hasReceipt) {
    receiptImageDataUrl = null;
  }

  const rateRaw = o.consumptionTaxRate ?? o.consumption_tax_rate;
  const consumptionTaxRate: ConsumptionTaxRateKey = isConsumptionTaxRateKey(
    rateRaw,
  )
    ? rateRaw
    : "0";

  return {
    id,
    expenseId,
    date,
    category,
    amount: Number.isFinite(amount) ? Math.trunc(amount) : 0,
    description,
    hasReceipt,
    hasInvoice,
    invoiceNumber: hasInvoice ? invoiceNumber : null,
    receiptImageDataUrl,
    consumptionTaxRate,
  };
}
