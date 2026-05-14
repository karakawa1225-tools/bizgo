"use client";

import { ExpensesProvider } from "@/contexts/expenses-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return <ExpensesProvider>{children}</ExpensesProvider>;
}
