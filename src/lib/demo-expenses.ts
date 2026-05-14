import type { Expense, ExpenseItem } from "@/db/schema";

/** デモ用（DB 接続前のプレースホルダ） */
export const DEMO_EXPENSES: Array<
  Expense & { items: ExpenseItem[]; totalYen: number }
> = [
  {
    id: "550e8400-e29b-41d4-a716-446655440001",
    title: "〇〇商事 商談出張",
    type: "出張",
    startDate: "2026-05-08",
    endDate: "2026-05-09",
    status: "入力中",
    syncedAt: null,
    totalYen: 47_200,
    items: [
      {
        id: "660e8400-e29b-41d4-a716-446655440001",
        expenseId: "550e8400-e29b-41d4-a716-446655440001",
        date: "2026-05-08",
        category: "旅費交通費",
        amount: 14_200,
        description: "新幹線 往復",
        hasReceipt: true,
        hasInvoice: false,
        invoiceNumber: null,
        receiptImageDataUrl: null,
        consumptionTaxRate: "10",
      },
      {
        id: "660e8400-e29b-41d4-a716-446655440002",
        expenseId: "550e8400-e29b-41d4-a716-446655440001",
        date: "2026-05-08",
        category: "宿泊費",
        amount: 28_000,
        description: "ビジネスホテル 1泊",
        hasReceipt: true,
        hasInvoice: false,
        invoiceNumber: null,
        receiptImageDataUrl: null,
        consumptionTaxRate: "10",
      },
      {
        id: "660e8400-e29b-41d4-a716-446655440003",
        expenseId: "550e8400-e29b-41d4-a716-446655440001",
        date: "2026-05-09",
        category: "その他",
        amount: 5_000,
        description: "タクシー 駅〜顧客先",
        hasReceipt: false,
        hasInvoice: false,
        invoiceNumber: null,
        receiptImageDataUrl: null,
        consumptionTaxRate: "10",
      },
    ],
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440002",
    title: "3月度立替分",
    type: "一般経費",
    startDate: "2026-03-01",
    endDate: "2026-03-31",
    status: "送信済",
    syncedAt: new Date("2026-04-02T10:15:00.000Z"),
    totalYen: 12_400,
    items: [
      {
        id: "660e8400-e29b-41d4-a716-446655440010",
        expenseId: "550e8400-e29b-41d4-a716-446655440002",
        date: "2026-03-18",
        category: "会議費",
        amount: 12_400,
        description: "会議室・飲み物",
        hasReceipt: true,
        hasInvoice: false,
        invoiceNumber: null,
        receiptImageDataUrl: null,
        consumptionTaxRate: "10",
      },
    ],
  },
];

export function getDemoExpense(id: string) {
  return DEMO_EXPENSES.find((e) => e.id === id);
}

export const EXPENSE_CATEGORIES = [
  "旅費交通費",
  "宿泊費",
  "荷造運賃",
  "預り金",
  "雑費",
  "消耗品費",
  "交際費",
  "会議費",
  "通信費",
  "その他",
] as const;
