"use client";

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ExpenseRecord } from "@/lib/expense-types";
import { settlementDateLabel } from "@/lib/expense-list-utils";
import { totalYen } from "@/lib/expenses-storage";

const yen = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

type Props = {
  expense: ExpenseRecord;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

export function ExpenseApplicationCard({ expense, onEdit, onDelete }: Props) {
  const typeLabel =
    expense.type === "出張" ? "出張経費精算書" : "経費精算書";

  return (
    <Card className="border-border/50 bg-card/70 backdrop-blur-sm">
      <CardHeader className="gap-2 pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-md font-normal">
              {typeLabel}
            </Badge>
            <Badge
              variant={expense.status === "送信済" ? "outline" : "default"}
              className="rounded-md"
            >
              {expense.status}
            </Badge>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              aria-label="申請を編集"
              onClick={() => onEdit(expense.id)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-destructive"
              aria-label="申請を削除"
              onClick={() => onDelete(expense.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
        <Link
          href={`/expenses/${expense.id}`}
          className="block rounded-md outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CardTitle className="text-lg leading-snug text-foreground hover:underline sm:text-xl">
            {expense.title}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground sm:text-base">
            {settlementDateLabel(expense)}
          </CardDescription>
        </Link>
      </CardHeader>
      <CardFooter className="flex items-baseline justify-between border-t border-border/50 px-4 pt-3 text-base">
        <span className="text-muted-foreground">合計</span>
        <span className="font-mono text-lg font-semibold tabular-nums tracking-tight text-foreground">
          {yen.format(totalYen(expense.items))}
        </span>
      </CardFooter>
    </Card>
  );
}
