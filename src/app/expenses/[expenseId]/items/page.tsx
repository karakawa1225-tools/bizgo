"use client";

import { useParams } from "next/navigation";

import { ExpenseItemsListClient } from "@/components/expense-items-list-client";

export default function ExpenseItemsListPage() {
  const params = useParams();
  const expenseId =
    typeof params.expenseId === "string"
      ? params.expenseId
      : Array.isArray(params.expenseId)
        ? params.expenseId[0]
        : "";

  if (!expenseId) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">不正な URL です。</p>
      </div>
    );
  }

  return <ExpenseItemsListClient expenseId={expenseId} />;
}
