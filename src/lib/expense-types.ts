import type { ExpenseItem } from "@/db/schema";

export type ExpenseTypeLabel = "出張" | "一般経費";

export type ExpenseRecord = {
  id: string;
  title: string;
  type: ExpenseTypeLabel;
  startDate: string;
  endDate: string;
  settlementMonth: string | null;
  status: "入力中" | "送信済";
  syncedAt: number | null;
  items: ExpenseItem[];
  distanceKmOneWay: number | null;
  hasOvernight: boolean | null;
  executivePerDiem: boolean | null;
  perDiemLineItemId: string | null;
  /** true のとき自動日当の再計算で行を付けない（ユーザーが日当行を削除した場合など） */
  perDiemAutoDisabled?: boolean | null;
};
