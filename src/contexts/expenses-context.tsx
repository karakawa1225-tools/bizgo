"use client";

import * as React from "react";

import type { ExpenseItem } from "@/db/schema";
import type { ExpenseRecord } from "@/lib/expense-types";
import { CLOUD_SYNC_ENABLED_KEY } from "@/lib/cloud-sync-flags";
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

export type TursoServerSetup = {
  turso: boolean;
  sessionSecret: boolean;
  masterPassword: boolean;
};

export type CloudSyncControls = {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  authReady: boolean | null;
  /** Turso / セッション秘密鍵 / マスターパスワードのサーバー側設定状況（null は未取得） */
  serverSetup: TursoServerSetup | null;
  busy: boolean;
  lastError: string | null;
  login: (password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  pullNow: () => Promise<void>;
};

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
  cloud: CloudSyncControls;
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

  const [cloudEnabled, setCloudEnabledState] = React.useState(false);
  const [cloudAuthReady, setCloudAuthReady] = React.useState<boolean | null>(null);
  const [cloudServerSetup, setCloudServerSetup] =
    React.useState<TursoServerSetup | null>(null);
  const [cloudBusy, setCloudBusy] = React.useState(false);
  const [cloudLastError, setCloudLastError] = React.useState<string | null>(null);

  const expensesRef = React.useRef(expenses);
  React.useEffect(() => {
    expensesRef.current = expenses;
  }, [expenses]);

  const pushTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setExpenses(loadExpenses());
    setHydrated(true);
    if (typeof window !== "undefined") {
      setCloudEnabledState(
        window.localStorage.getItem(CLOUD_SYNC_ENABLED_KEY) === "1",
      );
    }
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    void (async () => {
      try {
        const r = await fetch("/api/cloud/status");
        const j = (await r.json()) as {
          authReady?: boolean;
          turso?: boolean;
          sessionSecret?: boolean;
          masterPassword?: boolean;
        };
        setCloudAuthReady(Boolean(j.authReady));
        if (
          typeof j.turso === "boolean" &&
          typeof j.sessionSecret === "boolean" &&
          typeof j.masterPassword === "boolean"
        ) {
          setCloudServerSetup({
            turso: j.turso,
            sessionSecret: j.sessionSecret,
            masterPassword: j.masterPassword,
          });
        } else {
          setCloudServerSetup(null);
        }
      } catch {
        setCloudAuthReady(false);
        setCloudServerSetup(null);
      }
    })();
  }, [hydrated]);

  const pushLocalToCloud = React.useCallback(async (list: ExpenseRecord[]) => {
    const r = await fetch("/api/cloud-expenses", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expenses: list }),
    });
    if (!r.ok) throw new Error("put_failed");
  }, []);

  const pullFromCloud = React.useCallback(async () => {
    if (cloudAuthReady !== true) return;
    setCloudBusy(true);
    setCloudLastError(null);
    try {
      const r = await fetch("/api/cloud-expenses", { credentials: "include" });
      if (r.status === 401) {
        setCloudLastError(
          "Turso に接続するにはログインが必要です（セッション切れの可能性があります）。",
        );
        return;
      }
      if (!r.ok) {
        setCloudLastError("Turso からの取得に失敗しました。");
        return;
      }
      const j = (await r.json()) as { expenses?: ExpenseRecord[] };
      if (!Array.isArray(j.expenses)) return;

      const local = expensesRef.current;
      if (j.expenses.length === 0 && local.length > 0) {
        await pushLocalToCloud(local);
        return;
      }
      setExpenses(j.expenses);
      saveExpenses(j.expenses);
    } catch {
      setCloudLastError("ネットワークエラーで Turso と通信できませんでした。");
    } finally {
      setCloudBusy(false);
    }
  }, [cloudAuthReady, pushLocalToCloud]);

  React.useEffect(() => {
    if (!hydrated || !cloudEnabled || cloudAuthReady !== true) return;
    void pullFromCloud();
  }, [hydrated, cloudEnabled, cloudAuthReady, pullFromCloud]);

  React.useEffect(() => {
    if (!hydrated) return;
    saveExpenses(expenses);
  }, [expenses, hydrated]);

  React.useEffect(() => {
    if (!hydrated || !cloudEnabled || cloudAuthReady !== true) return;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      void (async () => {
        try {
          const r = await fetch("/api/cloud-expenses", {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ expenses: expensesRef.current }),
          });
          if (r.status === 401) {
            setCloudLastError(
              "Turso への保存はログインが必要です（セッション切れの可能性があります）。",
            );
          } else if (!r.ok) {
            setCloudLastError(
              "Turso への保存に失敗しました。領収書画像が大きすぎる場合はサイズを下げてください。",
            );
          } else {
            setCloudLastError(null);
          }
        } catch {
          setCloudLastError("ネットワークエラーで Turso に保存できませんでした。");
        }
      })();
    }, 2000);
    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, [expenses, hydrated, cloudEnabled, cloudAuthReady]);

  const setCloudEnabled = React.useCallback((v: boolean) => {
    if (typeof window === "undefined") return;
    if (v) {
      window.localStorage.setItem(CLOUD_SYNC_ENABLED_KEY, "1");
    } else {
      window.localStorage.setItem(CLOUD_SYNC_ENABLED_KEY, "0");
      void fetch("/api/auth/cloud-logout", {
        method: "POST",
        credentials: "include",
      });
    }
    setCloudEnabledState(v);
  }, []);

  const loginCloud = React.useCallback(
    async (password: string): Promise<string | null> => {
      setCloudBusy(true);
      setCloudLastError(null);
      try {
        const r = await fetch("/api/auth/cloud-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ password }),
        });
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        if (r.status === 401) return "パスワードが違います。";
        if (!r.ok) {
          if (r.status === 503)
            return "サーバー側の Turso／パスワード設定が未完了です（Vercel の環境変数を確認してください）。";
          return j.error ?? "ログインに失敗しました。";
        }
        window.localStorage.setItem(CLOUD_SYNC_ENABLED_KEY, "1");
        setCloudEnabledState(true);
        await pullFromCloud();
        return null;
      } catch {
        return "ネットワークエラーです。";
      } finally {
        setCloudBusy(false);
      }
    },
    [pullFromCloud],
  );

  const logoutCloud = React.useCallback(async () => {
    setCloudBusy(true);
    try {
      await fetch("/api/auth/cloud-logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setCloudBusy(false);
    }
    setCloudEnabled(false);
    setCloudLastError(null);
  }, [setCloudEnabled]);

  const pullNow = React.useCallback(async () => {
    await pullFromCloud();
  }, [pullFromCloud]);

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

  const cloud = React.useMemo<CloudSyncControls>(
    () => ({
      enabled: cloudEnabled,
      setEnabled: setCloudEnabled,
      authReady: cloudAuthReady,
      serverSetup: cloudServerSetup,
      busy: cloudBusy,
      lastError: cloudLastError,
      login: loginCloud,
      logout: logoutCloud,
      pullNow,
    }),
    [
      cloudEnabled,
      setCloudEnabled,
      cloudAuthReady,
      cloudServerSetup,
      cloudBusy,
      cloudLastError,
      loginCloud,
      logoutCloud,
      pullNow,
    ],
  );

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
      cloud,
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
      cloud,
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
