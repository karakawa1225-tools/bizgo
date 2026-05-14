import type { ExpenseItem } from "@/db/schema";
import type { ExpenseRecord } from "@/lib/expense-types";
import { deriveTravelAmounts } from "@/lib/travel-calculations";

/** 明細の先頭に日当1行を同期（金額0なら除去） */
export function syncPerDiemItems(
  expense: ExpenseRecord,
  prevItems: ExpenseItem[],
): { items: ExpenseItem[]; perDiemLineItemId: string | null } {
  if (expense.type !== "出張") {
    return { items: prevItems, perDiemLineItemId: expense.perDiemLineItemId ?? null };
  }

  if (expense.perDiemAutoDisabled === true) {
    return { items: prevItems, perDiemLineItemId: null };
  }

  const d = deriveTravelAmounts(
    expense.startDate,
    expense.endDate,
    expense.distanceKmOneWay,
    expense.hasOvernight,
    expense.executivePerDiem,
  );

  const without = prevItems.filter((i) => i.id !== expense.perDiemLineItemId);

  if (d.perDiemTotalYen <= 0) {
    return { items: without, perDiemLineItemId: null };
  }

  const id = expense.perDiemLineItemId ?? crypto.randomUUID();
  const descReason = d.perDiemEligible
    ? `${d.travelDays}日 × ¥${d.perDiemRateYen.toLocaleString("ja-JP")}（役員）`
    : "";

  const line: ExpenseItem = {
    id,
    expenseId: expense.id,
    date: expense.startDate,
    category: "その他",
    amount: d.perDiemTotalYen,
    description: `日当（${descReason}）`.trim(),
    hasReceipt: false,
    hasInvoice: false,
    invoiceNumber: null,
    receiptImageDataUrl: null,
  };

  return { items: [line, ...without], perDiemLineItemId: id };
}
