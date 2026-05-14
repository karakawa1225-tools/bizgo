"use client";

import * as React from "react";

import type { ExpenseItem } from "@/db/schema";
import type { ExpenseRecord } from "@/lib/expense-types";
import {
  createGeneralExpensePayload,
  createTravelExpensePayload,
  loadExpenses,
  saveExpenses,
  type ExpenseTypeLabel,
} from "@/lib/expenses-storage";
import { syncPerDiemItems } from "@/lib/per-diem-sync";
import { monthBounds } from "@/lib/travel-calculations";

type PatchExpense = Partial<
  Pick<
    ExpenseRecord,
    | "title"
    | "type"
    | "startDate"
    | "endDate"
    | "status"
    | "syncedAt"
    | "settlementMonth"
    | "distanceKmOneWay"
    | "hasOvernight"
    | "executivePerDiem"
    | "perDiemLineItemId"
    | "perDiemAutoDisabled"
  >
>;

type Ctx = {
  expenses: ExpenseRecord[];
  hydrated: boolean;
  getExpense: (id: string) => ExpenseRecord | undefined;
  createGeneralExpense: (input: {
    title: string;
    settlementMonth: string;
    idempotentId?: string;
  }) => string;
  createTravelExpense: (input: {
    title: string;
    startDate: string;
    endDate: string;
    distanceKmOneWay: number;
    hasOvernight: boolean;
    idempotentId?: string;
  }) => string;
  patchExpense: (id: string, patch: PatchExpense) => void;
  deleteExpense: (id: string) => void;
  addItem: (expenseId: string, item: ExpenseItem) => void;
  updateItem: (
    expenseId: string,
    itemId: string,
    patch: Partial<
      Pick<
        ExpenseItem,
        | "date"
        | "category"
        | "amount"
        | "description"
        | "hasReceipt"
        | "hasInvoice"
        | "invoiceNumber"
        | "receiptImageDataUrl"
        | "consumptionTaxRate"
      >
    >,
  ) => void;
  removeItem: (expenseId: string, itemId: string) => void;
};

const ExpensesContext = React.createContext<Ctx | null>(null);

function applyPatch(prev: ExpenseRecord, patch: PatchExpense): ExpenseRecord {
  const travelTouched =
    patch.startDate !== undefined ||
    patch.endDate !== undefined ||
    patch.distanceKmOneWay !== undefined ||
    patch.hasOvernight !== undefined ||
    patch.executivePerDiem !== undefined;

  let next: ExpenseRecord = { ...prev, ...patch };
  if (travelTouched && next.type === "出張") {
    next = { ...next, perDiemAutoDisabled: false };
  }
  if (patch.settlementMonth && next.type === "一般経費") {
    const { start, end } = monthBounds(patch.settlementMonth);
    next = {
      ...next,
      startDate: start,
      endDate: end,
      settlementMonth: patch.settlementMonth,
    };
  }
  if (next.type === "出張") {
    const synced = syncPerDiemItems(next, next.items);
    next = {
      ...next,
      items: synced.items,
      perDiemLineItemId: synced.perDiemLineItemId,
    };
  }
  return next;
}

export function ExpensesProvider({ children }: { children: React.ReactNode }) {
  const [expenses, setExpenses] = React.useState<ExpenseRecord[]>([]);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setExpenses(loadExpenses());
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    saveExpenses(expenses);
  }, [expenses, hydrated]);

  const getExpense = React.useCallback(
    (id: string) => expenses.find((e) => e.id === id),
    [expenses],
  );

  const createGeneralExpense = React.useCallback(
    (input: {
      title: string;
      settlementMonth: string;
      idempotentId?: string;
    }) => {
      const id = input.idempotentId ?? crypto.randomUUID();
      const row = createGeneralExpensePayload({
        id,
        title: input.title,
        settlementMonth: input.settlementMonth,
      });
      setExpenses((prev) => {
        if (prev.some((e) => e.id === id)) return prev;
        return [row, ...prev];
      });
      return id;
    },
    [],
  );

  const createTravelExpense = React.useCallback(
    (input: {
      title: string;
      startDate: string;
      endDate: string;
      distanceKmOneWay: number;
      hasOvernight: boolean;
      idempotentId?: string;
    }) => {
      const id = input.idempotentId ?? crypto.randomUUID();
      const row = createTravelExpensePayload({
        id,
        title: input.title,
        startDate: input.startDate,
        endDate: input.endDate,
        distanceKmOneWay: input.distanceKmOneWay,
        hasOvernight: input.hasOvernight,
      });
      setExpenses((prev) => {
        if (prev.some((e) => e.id === id)) return prev;
        return [row, ...prev];
      });
      return id;
    },
    [],
  );

  const patchExpense = React.useCallback((id: string, patch: PatchExpense) => {
    setExpenses((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        return applyPatch(e, patch);
      }),
    );
  }, []);

  const deleteExpense = React.useCallback((id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const addItem = React.useCallback((expenseId: string, item: ExpenseItem) => {
    setExpenses((prev) =>
      prev.map((e) => {
        if (e.id !== expenseId) return e;
        const items = [item, ...e.items];
        if (e.type === "出張") {
          const synced = syncPerDiemItems(e, items);
          return { ...e, items: synced.items, perDiemLineItemId: synced.perDiemLineItemId };
        }
        return { ...e, items };
      }),
    );
  }, []);

  const updateItem = React.useCallback(
    (
      expenseId: string,
      itemId: string,
      itemPatch: Partial<
        Pick<
          ExpenseItem,
          | "date"
          | "category"
          | "amount"
          | "description"
          | "hasReceipt"
          | "hasInvoice"
          | "invoiceNumber"
          | "receiptImageDataUrl"
          | "consumptionTaxRate"
        >
      >,
    ) => {
      setExpenses((prev) =>
        prev.map((e) => {
          if (e.id !== expenseId) return e;
          let items = e.items.map((it) =>
            it.id === itemId ? { ...it, ...itemPatch } : it,
          );
          if (itemId === e.perDiemLineItemId) {
            return { ...e, items };
          }
          if (e.type === "出張") {
            const synced = syncPerDiemItems(e, items);
            return { ...e, items: synced.items, perDiemLineItemId: synced.perDiemLineItemId };
          }
          return { ...e, items };
        }),
      );
    },
    [],
  );

  const removeItem = React.useCallback((expenseId: string, itemId: string) => {
    setExpenses((prev) =>
      prev.map((e) => {
        if (e.id !== expenseId) return e;
        const isAutoPerDiem =
          e.type === "出張" && itemId === e.perDiemLineItemId;
        const stripped = e.items.filter((it) => it.id !== itemId);
        let adj: ExpenseRecord = {
          ...e,
          items: stripped,
          perDiemLineItemId: isAutoPerDiem ? null : e.perDiemLineItemId,
          perDiemAutoDisabled: isAutoPerDiem ? true : e.perDiemAutoDisabled,
        };
        if (e.type === "出張" && !isAutoPerDiem) {
          const synced = syncPerDiemItems(adj, stripped);
          adj = {
            ...adj,
            items: synced.items,
            perDiemLineItemId: synced.perDiemLineItemId,
          };
        }
        return adj;
      }),
    );
  }, []);

  const value = React.useMemo(
    () => ({
      expenses,
      hydrated,
      getExpense,
      createGeneralExpense,
      createTravelExpense,
      patchExpense,
      deleteExpense,
      addItem,
      updateItem,
      removeItem,
    }),
    [
      expenses,
      hydrated,
      getExpense,
      createGeneralExpense,
      createTravelExpense,
      patchExpense,
      deleteExpense,
      addItem,
      updateItem,
      removeItem,
    ],
  );

  return (
    <ExpensesContext.Provider value={value}>{children}</ExpensesContext.Provider>
  );
}

export function useExpenses() {
  const ctx = React.useContext(ExpensesContext);
  if (!ctx) {
    throw new Error("useExpenses must be used within ExpensesProvider");
  }
  return ctx;
}
