"use client";

import { useParams } from "next/navigation";

import { ExpenseDetailClient } from "@/components/expense-detail-client";

export default function ExpenseDetailPage() {
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

  return <ExpenseDetailClient expenseId={expenseId} />;
}
