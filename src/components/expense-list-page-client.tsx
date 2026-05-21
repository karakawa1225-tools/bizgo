"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";

import { AppPageShell } from "@/components/app-page-shell";
import { BizGoMark } from "@/components/bizgo-mark";
import { ExpenseListByType } from "@/components/expense-list-by-type";
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
import { Button, buttonVariants } from "@/components/ui/button";
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
import {
  SCROLL_DIALOG_BODY,
  SCROLL_DIALOG_CONTENT,
  SCROLL_DIALOG_FOOTER,
  SCROLL_DIALOG_HEADER,
} from "@/lib/dialog-scroll-classes";
import type { ExpenseTypeLabel } from "@/lib/expenses-storage";
import { cn } from "@/lib/utils";

export function ExpenseListPageClient() {
  const { expenses, hydrated, patchExpense, deleteExpense } = useExpenses();
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [activeId, setActiveId] = React.useState<string | null>(null);

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

  function confirmDelete() {
    if (!activeId) return;
    deleteExpense(activeId);
    setDeleteOpen(false);
    setActiveId(null);
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <p className="text-muted-foreground">読み込み中…</p>
      </div>
    );
  }

  return (
    <AppPageShell>
      <header className="border-b border-border/60 bg-card/30 px-4 py-5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Link
            href="/home"
            aria-label="Homeへ"
            className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold tracking-tight">申請一覧</h1>
            <p className="text-sm text-muted-foreground">
              経費精算書と出張経費精算書を分けて表示
            </p>
          </div>
          <BizGoMark variant="inline" />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-4 py-6 pb-28">
        <Link
          href="/create"
          className={cn(buttonVariants({ size: "lg" }), "gap-2 no-underline")}
        >
          <Plus className="size-4" />
          新規作成へ
        </Link>

        <ExpenseListByType
          expenses={expenses}
          type="一般経費"
          title="経費精算書"
          emptyHint="経費精算書の申請はまだありません。"
          onEdit={(id) => {
            setActiveId(id);
            setEditOpen(true);
          }}
          onDelete={(id) => {
            setActiveId(id);
            setDeleteOpen(true);
          }}
        />

        <Separator />

        <ExpenseListByType
          expenses={expenses}
          type="出張"
          title="出張経費精算書"
          emptyHint="出張経費精算書の申請はまだありません。"
          onEdit={(id) => {
            setActiveId(id);
            setEditOpen(true);
          }}
          onDelete={(id) => {
            setActiveId(id);
            setDeleteOpen(true);
          }}
        />
      </main>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className={cn("sm:max-w-md", SCROLL_DIALOG_CONTENT)}>
          <DialogHeader className={SCROLL_DIALOG_HEADER}>
            <DialogTitle>精算書を編集</DialogTitle>
          </DialogHeader>
          <div className={cn("grid gap-3", SCROLL_DIALOG_BODY)}>
            <div className="grid gap-2">
              <Label htmlFor="list-edit-title">件名</Label>
              <Input
                id="list-edit-title"
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
                <Label htmlFor="list-edit-sm">精算開始月</Label>
                <Input
                  id="list-edit-sm"
                  type="month"
                  value={formSettlementMonth}
                  onChange={(ev) => setFormSettlementMonth(ev.target.value)}
                />
              </div>
            ) : (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="list-edit-start">出張開始日</Label>
                    <Input
                      id="list-edit-start"
                      type="date"
                      value={formStart}
                      onChange={(ev) => setFormStart(ev.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="list-edit-end">出張終了日</Label>
                    <Input
                      id="list-edit-end"
                      type="date"
                      value={formEnd}
                      onChange={(ev) => setFormEnd(ev.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="list-edit-km">片道距離（km）</Label>
                  <Input
                    id="list-edit-km"
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
          <DialogFooter className={SCROLL_DIALOG_FOOTER}>
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
              を削除すると、紐づく明細もまとめて消えます。
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
    </AppPageShell>
  );
}
