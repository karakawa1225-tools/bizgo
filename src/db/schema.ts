import { relations } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

/**
 * 経費・出張の親データ（1件 = 申請バッチ）
 * 金額の合計は明細 `expense_items` の整数金額を足し合わせて算出する。
 */
export const expenses = sqliteTable("expenses", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  /** "出張" | "一般経費" */
  type: text("type").notNull(),
  /** ISO 8601 日付文字列 (YYYY-MM-DD) */
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  /** "入力中" | "送信済" */
  status: text("status").notNull().default("入力中"),
  /** 経理システム API へ送信完了した日時（未送信は null） */
  syncedAt: integer("synced_at", { mode: "timestamp_ms" }),
});

/**
 * 経費明細（1 親に複数行）
 * category: アプリの区分マスタ（`EXPENSE_CATEGORIES`）に合わせた文字列
 */
export const expenseItems = sqliteTable(
  "expense_items",
  {
    id: text("id").primaryKey(),
    expenseId: text("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    /** ISO 8601 日付文字列 (YYYY-MM-DD) */
    date: text("date").notNull(),
    category: text("category").notNull(),
    /** 円単位の整数（端数処理はアプリ側ポリシーに従う） */
    amount: integer("amount").notNull(),
    description: text("description").notNull().default(""),
    hasReceipt: integer("has_receipt", { mode: "boolean" })
      .notNull()
      .default(false),
    /** 適格請求書（インボイス）の有無 */
    hasInvoice: integer("has_invoice", { mode: "boolean" })
      .notNull()
      .default(false),
    /** 登録番号（T + 13桁数字。DB では正規化形 T1234567890123 を推奨） */
    invoiceNumber: text("invoice_number"),
    /** 領収書写真（data URL。ローカル保存用。本番はオブジェクトストレージ等へ） */
    receiptImageDataUrl: text("receipt_image_data_url"),
  },
  (table) => ({
    expenseIdIdx: index("expense_items_expense_id_idx").on(table.expenseId),
  }),
);

export const expensesRelations = relations(expenses, ({ many }) => ({
  items: many(expenseItems),
}));

export const expenseItemsRelations = relations(expenseItems, ({ one }) => ({
  expense: one(expenses, {
    fields: [expenseItems.expenseId],
    references: [expenses.id],
  }),
}));

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type ExpenseItem = typeof expenseItems.$inferSelect;
export type NewExpenseItem = typeof expenseItems.$inferInsert;
