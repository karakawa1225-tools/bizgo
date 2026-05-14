"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, FileText, Pencil, Plane, Trash2 } from "lucide-react";

import { MonthlyGeneralSurface } from "@/components/pdf/bizgo-print-surfaces";
import { downloadElementAsPdf } from "@/lib/export-pdf";
import {
  exportMonthlyGeneralCsv,
  monthlyGeneralTotals,
} from "@/lib/export-monthly-general";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useExpenses } from "@/contexts/expenses-context";
import type { ExpenseTypeLabel } from "@/lib/expenses-storage";
import { totalYen } from "@/lib/expenses-storage";
import { BizGoMark } from "@/components/bizgo-mark";
import { cn } from "@/lib/utils";

const yen = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

export function TopPageClient() {
  const { expenses, hydrated, patchExpense, deleteExpense } = useExpenses();
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const monthPdfRef = React.useRef<HTMLDivElement>(null);

  const [exportYm, setExportYm] = React.useState(() =>
    new Date().toISOString().slice(0, 7),
  );

  const active = activeId
    ? expenses.find((e) => e.id === activeId)
    : undefined;

  const [formTitle, setFormTitle] = React.useState("");
  const [formType, setFormType] = React.useState<ExpenseTypeLabel>("一般経費");
  const [formSettlementMonth, setFormSettlementMonth] = React.useState("");
  const [formStart, setFormStart] = React.useState("");
  const [formEnd, setFormEnd] = React.useState("");
  const [formKm, setFormKm] = React.useState("");
  const [formOvernight, setFormOvernight] = React.useState(false);

  React.useEffect(() => {
    if (!active || !editOpen) return;
    setFormTitle(active.title);
    setFormType(active.type);
    setFormStart(active.startDate);
    setFormEnd(active.endDate);
    setFormSettlementMonth(active.settlementMonth ?? active.startDate.slice(0, 7));
    setFormKm(String(active.distanceKmOneWay ?? ""));
    setFormOvernight(active.hasOvernight === true);
  }, [active, editOpen]);

  function openEdit(id: string) {
    setActiveId(id);
    setEditOpen(true);
  }

  function openDelete(id: string) {
    setActiveId(id);
    setDeleteOpen(true);
  }

  function submitEdit() {
    if (!activeId || !formTitle.trim()) return;
    if (formType === "一般経費") {
      patchExpense(activeId, {
        title: formTitle.trim(),
        type: formType,
        settlementMonth: formSettlementMonth,
      });
    } else {
      const km = Number.parseFloat(formKm);
      patchExpense(activeId, {
        title: formTitle.trim(),
        type: formType,
        startDate: formStart,
        endDate: formEnd,
        distanceKmOneWay: Number.isFinite(km) ? km : 0,
        hasOvernight: formOvernight,
      });
    }
    setEditOpen(false);
    setActiveId(null);
  }

  async function handleMonthlyPdf() {
    const el = monthPdfRef.current;
    if (!el) return;
    await downloadElementAsPdf(el, `経費精算_${exportYm}.pdf`);
  }

  const monthlyStats = monthlyGeneralTotals(expenses, exportYm);

  function confirmDelete() {
    if (!activeId) return;
    deleteExpense(activeId);
    setDeleteOpen(false);
    setActiveId(null);
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center px-4">
        <p className="text-base text-muted-foreground">読み込み中…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-border/60 bg-card/30 px-4 py-10 backdrop-blur-xl">
        <div className="mx-auto max-w-lg space-y-5">
          <BizGoMark variant="hero" />
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              TOP
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
              経費・出張の精算書を作成し、明細を追加して経理へ送るまでの下書きを管理します。
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6 pb-28">
        <section aria-labelledby="create-heading" className="space-y-4">
          <h2
            id="create-heading"
            className="text-lg font-semibold tracking-tight text-foreground sm:text-xl"
          >
            新規作成
          </h2>
          <div className="flex flex-col gap-3">
            <Link
              href="/expenses/new?type=一般経費"
              className={cn(
                "flex min-h-[3.5rem] items-center justify-center gap-2 rounded-xl border border-border/70 bg-card/90 px-4 py-3.5 text-center text-lg font-semibold text-foreground shadow-sm ring-1 ring-foreground/15 transition-[transform,box-shadow] active:scale-[0.99] hover:bg-muted/60 no-underline",
              )}
            >
              <Building2 className="size-6 shrink-0 opacity-90" aria-hidden />
              経費精算書を新規作成
            </Link>
            <Link
              href="/expenses/new?type=出張"
              className={cn(
                "flex min-h-[3.5rem] items-center justify-center gap-2 rounded-xl border border-border/70 bg-card/90 px-4 py-3.5 text-center text-lg font-semibold text-foreground shadow-sm ring-1 ring-foreground/15 transition-[transform,box-shadow] active:scale-[0.99] hover:bg-muted/60 no-underline",
              )}
            >
              <Plane className="size-6 shrink-0 opacity-90" aria-hidden />
              出張経費精算書を新規作成
            </Link>
          </div>
        </section>

        <Separator className="bg-border/60" />

        <section aria-labelledby="export-heading" className="space-y-4">
          <h2
            id="export-heading"
            className="text-lg font-semibold tracking-tight text-foreground sm:text-xl"
          >
            経費精算書の月次出力（一般のみ）
          </h2>
          <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/50 p-5 backdrop-blur-sm">
            <Label htmlFor="export-month" className="text-sm text-muted-foreground">
              対象月
            </Label>
            <Input
              id="export-month"
              type="month"
              value={exportYm}
              onChange={(ev) => setExportYm(ev.target.value)}
              className="w-full bg-card/60 text-base sm:max-w-xs"
            />
            <p className="text-sm text-muted-foreground sm:text-base">
              {exportYm}：申請 {monthlyStats.count} 件・合計{" "}
              {yen.format(monthlyStats.sum)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1.5"
                onClick={() => exportMonthlyGeneralCsv(expenses, exportYm)}
              >
                <FileText className="size-3.5" />
                CSV
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1.5"
                onClick={() => void handleMonthlyPdf()}
              >
                <FileText className="size-3.5" />
                PDF
              </Button>
            </div>
          </div>
          <div className="pointer-events-none fixed top-0 left-[-12000px] z-[-1]">
            <MonthlyGeneralSurface
              ref={monthPdfRef}
              expenses={expenses}
              ym={exportYm}
            />
          </div>
        </section>

        <Separator className="bg-border/60" />

        <section aria-labelledby="list-heading" className="space-y-4">
          <h2
            id="list-heading"
            className="text-lg font-semibold tracking-tight text-foreground sm:text-xl"
          >
            申請一覧
          </h2>
          {expenses.length === 0 ? (
            <p className="text-base text-muted-foreground">
              まだ申請がありません。上のボタンから作成してください。
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {expenses.map((e) => (
                <li key={e.id}>
                  <Card className="border-border/50 bg-card/70 backdrop-blur-sm">
                    <CardHeader className="gap-2 pb-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="rounded-md font-normal"
                          >
                            {e.type === "出張"
                              ? "出張経費精算書"
                              : "経費精算書"}
                          </Badge>
                          <Badge
                            variant={
                              e.status === "送信済" ? "outline" : "default"
                            }
                            className="rounded-md"
                          >
                            {e.status}
                          </Badge>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground"
                            aria-label="申請を編集"
                            onClick={() => openEdit(e.id)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive"
                            aria-label="申請を削除"
                            onClick={() => openDelete(e.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                      <Link
                        href={`/expenses/${e.id}`}
                        className="block rounded-md outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <CardTitle className="text-lg leading-snug text-foreground hover:underline sm:text-xl">
                          {e.title}
                        </CardTitle>
                        <CardDescription className="text-sm text-muted-foreground sm:text-base">
                          {e.type === "一般経費" && e.settlementMonth
                            ? `精算月 ${e.settlementMonth}`
                            : null}
                          {e.type === "一般経費" && e.settlementMonth ? " · " : null}
                          {e.startDate} — {e.endDate}
                        </CardDescription>
                      </Link>
                    </CardHeader>
                    <CardFooter className="flex items-baseline justify-between border-t border-border/50 px-4 pt-3 text-base">
                      <span className="text-muted-foreground">合計</span>
                      <span className="font-mono text-lg font-semibold tabular-nums tracking-tight text-foreground">
                        {yen.format(totalYen(e.items))}
                      </span>
                    </CardFooter>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>精算書を編集</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label htmlFor="top-edit-title">件名</Label>
              <Input
                id="top-edit-title"
                value={formTitle}
                onChange={(ev) => setFormTitle(ev.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>種別</Label>
              <Select
                value={formType}
                onValueChange={(v) => {
                  if (v === "出張" || v === "一般経費") setFormType(v);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="一般経費">経費精算書（一般）</SelectItem>
                  <SelectItem value="出張">出張経費精算書</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formType === "一般経費" ? (
              <div className="grid gap-2">
                <Label htmlFor="top-edit-sm">精算開始月</Label>
                <Input
                  id="top-edit-sm"
                  type="month"
                  value={formSettlementMonth}
                  onChange={(ev) => setFormSettlementMonth(ev.target.value)}
                />
              </div>
            ) : (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="top-edit-start">出張開始日</Label>
                    <Input
                      id="top-edit-start"
                      type="date"
                      value={formStart}
                      onChange={(ev) => setFormStart(ev.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="top-edit-end">出張終了日</Label>
                    <Input
                      id="top-edit-end"
                      type="date"
                      value={formEnd}
                      onChange={(ev) => setFormEnd(ev.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="top-edit-km">片道距離（km）</Label>
                  <Input
                    id="top-edit-km"
                    value={formKm}
                    onChange={(ev) => setFormKm(ev.target.value)}
                    inputMode="decimal"
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-input"
                    checked={formOvernight}
                    onChange={(ev) => setFormOvernight(ev.target.checked)}
                  />
                  宿泊あり
                </label>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={submitEdit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>この精算書を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {active?.title ?? ""}{" "}
              を削除すると、紐づく明細もまとめて消えます。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
