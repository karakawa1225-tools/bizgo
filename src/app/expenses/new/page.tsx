import { Suspense } from "react";

import { NewExpenseClient } from "./new-expense-client";

export default function NewExpensePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center bg-background">
          <p className="text-sm text-muted-foreground">読み込み中…</p>
        </div>
      }
    >
      <NewExpenseClient />
    </Suspense>
  );
}
