"use client";

import * as React from "react";

import { ExpenseApplicationCard } from "@/components/expense-application-card";
import type { ExpenseRecord } from "@/lib/expense-types";
import {
  collectTabMonths,
  filterExpensesByType,
  formatTabMonthLabel,
  getExpenseTabYm,
  pickDefaultTabYm,
  sortExpensesBySettlementAsc,
} from "@/lib/expense-list-utils";
import type { ExpenseTypeLabel } from "@/lib/expenses-storage";
import { cn } from "@/lib/utils";

type Props = {
  expenses: ExpenseRecord[];
  type: ExpenseTypeLabel;
  title: string;
  emptyHint: string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

export function ExpenseListByType({
  expenses,
  type,
  title,
  emptyHint,
  onEdit,
  onDelete,
}: Props) {
  const months = React.useMemo(
    () => collectTabMonths(expenses, type),
    [expenses, type],
  );
  const [tabYm, setTabYm] = React.useState(() => pickDefaultTabYm(months));

  React.useEffect(() => {
    if (months.length === 0) return;
    if (!months.includes(tabYm)) setTabYm(pickDefaultTabYm(months));
  }, [months, tabYm]);

  const visible = React.useMemo(() => {
    const filtered = filterExpensesByType(expenses, type).filter(
      (e) => getExpenseTabYm(e) === tabYm,
    );
    return sortExpensesBySettlementAsc(filtered);
  }, [expenses, type, tabYm]);

  const years = React.useMemo(() => {
    const set = new Set(months.map((m) => m.slice(0, 4)));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [months]);

  const [year, setYear] = React.useState(() => tabYm.slice(0, 4));

  React.useEffect(() => {
    if (years.includes(year)) return;
    if (years[0]) setYear(years[0]);
  }, [years, year]);

  const monthsInYear = months.filter((m) => m.startsWith(`${year}-`));

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
        {title}
      </h2>
      {months.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyHint}</p>
      ) : (
        <>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              件数が増えても見やすいよう、年・月で絞り込めます（精算日の昇順）。
            </p>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => {
                    setYear(y);
                    const first = months.find((m) => m.startsWith(`${y}-`));
                    if (first) setTabYm(first);
                  }}
                  className={cn(
                    "shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                    year === y
                      ? "border-primary/50 bg-primary/15 text-foreground"
                      : "border-border/60 bg-card/50 text-muted-foreground hover:bg-muted/40",
                  )}
                >
                  {y}年
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {monthsInYear.map((ym) => (
                <button
                  key={ym}
                  type="button"
                  onClick={() => setTabYm(ym)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors sm:text-sm",
                    tabYm === ym
                      ? "border-primary/50 bg-primary/10 text-foreground"
                      : "border-border/50 text-muted-foreground hover:bg-muted/30",
                  )}
                >
                  {formatTabMonthLabel(ym)}
                </button>
              ))}
            </div>
          </div>
          {visible.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {formatTabMonthLabel(tabYm)} の申請はありません。
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {visible.map((e) => (
                <li key={e.id}>
                  <ExpenseApplicationCard
                    expense={e}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
