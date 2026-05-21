"use client";

import * as React from "react";

import type { ExpenseItem } from "@/db/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildCopyLineFormPatch } from "@/lib/copy-line-fields";
import {
  consumptionTaxRateLabel,
  toConsumptionTaxRateKey,
} from "@/lib/consumption-tax";
import type { ExpenseRecord } from "@/lib/expense-types";
import { cn } from "@/lib/utils";

const yen = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

type Row = {
  key: string;
  source: ExpenseItem;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenses: ExpenseRecord[];
  currentExpenseId: string;
  onApply: (patch: ReturnType<typeof buildCopyLineFormPatch>) => void;
};

export function CopyLineDialog({
  open,
  onOpenChange,
  expenses,
  currentExpenseId,
  onApply,
}: Props) {
  const rows = React.useMemo(() => {
    const list: Row[] = [];
    for (const ex of expenses) {
      for (const it of ex.items) {
        if (ex.id === currentExpenseId && it.id === ex.perDiemLineItemId) continue;
        list.push({ key: `${ex.id}:${it.id}`, source: it });
      }
    }
    list.sort((a, b) =>
      a.source.date < b.source.date ? 1 : a.source.date > b.source.date ? -1 : 0,
    );
    return list;
  }, [expenses, currentExpenseId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-lg flex-col gap-3 p-0 sm:max-w-lg">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>過去の明細からコピー</DialogTitle>
          <p className="text-sm leading-relaxed text-muted-foreground">
            区分・消費税区分・インボイス・摘要だけをコピーします。日付・金額・領収書は反映しません。
          </p>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto px-4">
          {rows.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              コピーできる他の明細がありません。
            </p>
          ) : (
            <table className="w-full min-w-[28rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                  <th className="px-2 py-2 font-medium">日付</th>
                  <th className="px-2 py-2 font-medium">区分</th>
                  <th className="px-2 py-2 font-medium text-right">金額</th>
                  <th className="px-2 py-2 font-medium">摘要</th>
                  <th className="w-16 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.key}
                    className={cn(
                      "border-b border-border/70 transition-colors hover:bg-muted/30",
                      i % 2 === 1 && "bg-card/40",
                    )}
                  >
                    <td className="px-2 py-2.5 tabular-nums whitespace-nowrap">
                      {row.source.date}
                    </td>
                    <td className="px-2 py-2.5">{row.source.category}</td>
                    <td className="px-2 py-2.5 text-right font-mono tabular-nums">
                      {yen.format(row.source.amount)}
                    </td>
                    <td className="max-w-[9rem] truncate px-2 py-2.5 text-muted-foreground">
                      {row.source.description || "—"}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-8"
                        onClick={() => {
                          onApply(buildCopyLineFormPatch(row.source));
                          onOpenChange(false);
                        }}
                      >
                        コピー
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="px-4 text-xs text-muted-foreground">
          コピー後の項目: 区分 /{" "}
          {consumptionTaxRateLabel(toConsumptionTaxRateKey("10"))} など / インボイス / 摘要
        </p>
        <DialogFooter className="px-4 pb-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            閉じる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
