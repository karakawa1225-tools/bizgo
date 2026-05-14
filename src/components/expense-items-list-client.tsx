"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { BizGoMark } from "@/components/bizgo-mark";
import { useExpenses } from "@/contexts/expenses-context";
import {
  consumptionTaxRateLabel,
  splitTaxIncludedYen,
  toConsumptionTaxRateKey,
} from "@/lib/consumption-tax";
import { formatSettlementMonthJa } from "@/lib/export-monthly-general";
import { formatLineDateYmd } from "@/lib/format-line-date";
import { cn } from "@/lib/utils";

const yen = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

const th =
  "border border-black/70 bg-black/5 px-2 py-2 text-left text-xs font-semibold text-black";
const td = "border border-black/60 px-2 py-2 text-xs text-black align-top";

type Props = { expenseId: string };

export function ExpenseItemsListClient({ expenseId }: Props) {
  const router = useRouter();
  const { getExpense, hydrated } = useExpenses();
  const expense = getExpense(expenseId);

  if (!hydrated) {
    return (
      <div className="flex min-h-svh items-center justify-center px-4">
        <p className="text-base text-muted-foreground">読み込み中…</p>
      </div>
    );
  }

  if (!expense) {
    notFound();
  }

  const metaLine =
    expense.type === "一般経費" && expense.settlementMonth
      ? `精算月：${formatSettlementMonthJa(expense.settlementMonth)}（${expense.startDate} — ${expense.endDate}）`
      : `期間：${expense.startDate} — ${expense.endDate}`;

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-card/40 px-3 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center gap-2">
          <button
            type="button"
            aria-label="申請画面へ戻る"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
              "shrink-0",
            )}
            onClick={() => router.push(`/expenses/${expenseId}`)}
          >
            <ArrowLeft className="size-5" />
          </button>
          <BizGoMark variant="inline" />
          <span className="text-sm font-medium text-foreground">
            登録済み明細一覧表
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 space-y-4 px-3 py-4 pb-10">
        <div className="rounded-xl border border-border/50 bg-card/50 p-4 ring-1 ring-foreground/5">
          <p className="text-xs text-muted-foreground">件名</p>
          <h1 className="text-lg font-semibold leading-snug text-foreground">
            {expense.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{metaLine}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary" className="rounded-md text-[0.65rem]">
              {expense.type === "出張" ? "出張経費精算書" : "経費精算書"}
            </Badge>
            <Badge
              variant={expense.status === "送信済" ? "outline" : "default"}
              className="rounded-md text-[0.65rem]"
            >
              {expense.status}
            </Badge>
          </div>
        </div>

        {expense.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            明細がありません。申請画面から行を追加してください。
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/50 bg-white shadow-sm">
            <table className="w-full min-w-[760px] border-collapse text-black">
              <thead>
                <tr className="bg-black/[0.04]">
                  <th className={th}>日付</th>
                  <th className={th}>区分</th>
                  <th className={cn(th, "text-right whitespace-nowrap")}>
                    金額（税込）
                  </th>
                  <th className={th}>消費税区分</th>
                  <th className={cn(th, "text-right whitespace-nowrap")}>
                    税抜
                  </th>
                  <th className={cn(th, "text-right whitespace-nowrap")}>
                    消費税額
                  </th>
                  <th className={th}>摘要</th>
                  <th className={th}>領収書</th>
                  <th className={th}>インボイス</th>
                  <th className={th}>登録番号</th>
                </tr>
              </thead>
              <tbody>
                {expense.items.map((it) => {
                  const rate = toConsumptionTaxRateKey(it.consumptionTaxRate);
                  const split = splitTaxIncludedYen(it.amount, rate);
                  const isPerDiem = it.id === expense.perDiemLineItemId;
                  return (
                    <tr key={it.id} className="odd:bg-black/[0.02]">
                      <td className={cn(td, "whitespace-nowrap tabular-nums")}>
                        {formatLineDateYmd(it.date)}
                      </td>
                      <td className={td}>
                        <span className="inline-flex flex-wrap items-center gap-1">
                          {it.category}
                          {isPerDiem ? (
                            <Badge
                              variant="outline"
                              className="rounded-sm text-[0.55rem] font-normal text-black"
                            >
                              自動日当
                            </Badge>
                          ) : null}
                        </span>
                      </td>
                      <td className={cn(td, "text-right font-mono tabular-nums")}>
                        {yen.format(it.amount)}
                      </td>
                      <td className={td}>{consumptionTaxRateLabel(rate)}</td>
                      <td className={cn(td, "text-right font-mono tabular-nums")}>
                        {yen.format(split.exclusiveYen)}
                      </td>
                      <td className={cn(td, "text-right font-mono tabular-nums")}>
                        {yen.format(split.taxYen)}
                      </td>
                      <td className={cn(td, "max-w-[220px] whitespace-pre-wrap break-words")}>
                        {it.description || "—"}
                      </td>
                      <td className={td}>{it.hasReceipt ? "あり" : "なし"}</td>
                      <td className={td}>{it.hasInvoice ? "あり" : "なし"}</td>
                      <td className={cn(td, "font-mono text-[0.65rem]")}>
                        {it.invoiceNumber ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-center pt-2">
          <Link
            href={`/expenses/${expenseId}`}
            className={cn(
              buttonVariants({ variant: "secondary", size: "sm" }),
              "inline-flex items-center justify-center no-underline",
            )}
          >
            申請画面に戻る
          </Link>
        </div>
      </main>
    </div>
  );
}
