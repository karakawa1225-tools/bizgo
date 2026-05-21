"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  Copy,
  FileText,
  FileUp,
  ImageIcon,
  Pencil,
  Table2,
  Trash2,
} from "lucide-react";

import {
  TravelDefinitionSurface,
  TravelSiteSettlementSurface,
} from "@/components/pdf/bizgo-print-surfaces";
import { downloadElementAsPdf } from "@/lib/export-pdf";
import { normalizeExpenseItem, parseQualifiedInvoiceNumber } from "@/lib/expense-item-fields";
import { deriveTravelAmounts } from "@/lib/travel-calculations";

import type { ExpenseItem } from "@/db/schema";
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
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardDescription,
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
import { BizGoMark } from "@/components/bizgo-mark";
import { CopyLineDialog } from "@/components/copy-line-dialog";
import type { CopyLineFormPatch } from "@/lib/copy-line-fields";
import { ReceiptAttachmentPreview } from "@/components/receipt-attachment-preview";
import { useExpenses } from "@/contexts/expenses-context";
import {
  SCROLL_DIALOG_BODY,
  SCROLL_DIALOG_CONTENT,
  SCROLL_DIALOG_FOOTER,
  SCROLL_DIALOG_HEADER,
} from "@/lib/dialog-scroll-classes";
import { EXPENSE_CATEGORIES } from "@/lib/demo-expenses";
import {
  isReceiptPdfDataUrl,
  processReceiptAttachmentFile,
  RECEIPT_CAMERA_ACCEPT,
  RECEIPT_FILE_ACCEPT,
} from "@/lib/receipt-file-import";
import { RECEIPT_IMAGE_MAX_EDGE_PX } from "@/lib/receipt-image-compress";
import {
  CONSUMPTION_TAX_OPTIONS,
  type ConsumptionTaxRateKey,
  isConsumptionTaxRateKey,
  splitTaxIncludedYen,
  toConsumptionTaxRateKey,
} from "@/lib/consumption-tax";
import type { ExpenseTypeLabel } from "@/lib/expenses-storage";
import { formatLineDateYmd } from "@/lib/format-line-date";
import { cn } from "@/lib/utils";

const yen = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

function TaxInclusiveBreakdown({
  amountInput,
  rate,
}: {
  amountInput: string;
  rate: ConsumptionTaxRateKey;
}) {
  const n = Number.parseInt(amountInput.replace(/[^\d]/g, ""), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (rate === "0") return null;
  const { exclusiveYen, taxYen } = splitTaxIncludedYen(n, rate);
  return (
    <div className="space-y-1 rounded-lg border border-border/50 bg-muted/25 px-3 py-2 text-sm">
      <p className="tabular-nums">
        <span className="text-muted-foreground">消費税別金額</span>{" "}
        <span className="font-mono font-medium text-foreground">
          {yen.format(exclusiveYen)}
        </span>
      </p>
      <p className="tabular-nums">
        <span className="text-muted-foreground">消費税額</span>{" "}
        <span className="font-mono font-medium text-foreground">
          {yen.format(taxYen)}
        </span>
      </p>
      <p className="text-xs text-muted-foreground">
        入力した金額は税込。税抜・税額は端数切り捨てで算出しています。
      </p>
    </div>
  );
}

type Props = {
  expenseId: string;
};

export function ExpenseDetailClient({ expenseId }: Props) {
  const router = useRouter();
  const {
    getExpense,
    hydrated,
    expenses,
    addItem,
    updateItem,
    removeItem,
    patchExpense,
    deleteExpense,
    cloud,
  } = useExpenses();

  const expense = getExpense(expenseId);

  const [category, setCategory] = React.useState<string>(
    EXPENSE_CATEGORIES[0],
  );
  const [date, setDate] = React.useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [amount, setAmount] = React.useState("");
  const [consumptionTaxRate, setConsumptionTaxRate] =
    React.useState<ConsumptionTaxRateKey>("0");
  const [description, setDescription] = React.useState("");
  const [hasReceipt, setHasReceipt] = React.useState(true);
  const [hasInvoice, setHasInvoice] = React.useState(false);
  const [invoiceNumber, setInvoiceNumber] = React.useState("");
  const [receiptImageDataUrl, setReceiptImageDataUrl] = React.useState<
    string | null
  >(null);
  const [addLineError, setAddLineError] = React.useState<string | null>(null);
  const [copyDialogOpen, setCopyDialogOpen] = React.useState(false);
  const receiptCaptureRef = React.useRef<HTMLInputElement>(null);
  const receiptPickRef = React.useRef<HTMLInputElement>(null);
  const receiptEditCaptureRef = React.useRef<HTMLInputElement>(null);
  const receiptEditPickRef = React.useRef<HTMLInputElement>(null);

  const [editParentOpen, setEditParentOpen] = React.useState(false);
  const [deleteParentOpen, setDeleteParentOpen] = React.useState(false);
  const [formTitle, setFormTitle] = React.useState("");
  const [formType, setFormType] = React.useState<ExpenseTypeLabel>("一般経費");
  const [formSettlementMonth, setFormSettlementMonth] = React.useState("");
  const [formStart, setFormStart] = React.useState("");
  const [formEnd, setFormEnd] = React.useState("");
  const [formKm, setFormKm] = React.useState("");
  const [formOvernight, setFormOvernight] = React.useState(false);

  const defPrintRef = React.useRef<HTMLDivElement>(null);
  const sitePrintRef = React.useRef<HTMLDivElement>(null);

  const [editLineOpen, setEditLineOpen] = React.useState(false);
  const [deleteLineOpen, setDeleteLineOpen] = React.useState(false);
  const [lineForm, setLineForm] = React.useState<ExpenseItem | null>(null);
  const [editLineError, setEditLineError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!expense || !editParentOpen) return;
    setFormTitle(expense.title);
    setFormType(expense.type);
    setFormStart(expense.startDate);
    setFormEnd(expense.endDate);
    setFormSettlementMonth(
      expense.settlementMonth ?? expense.startDate.slice(0, 7),
    );
    setFormKm(String(expense.distanceKmOneWay ?? ""));
    setFormOvernight(expense.hasOvernight === true);
  }, [expense, editParentOpen]);

  const total = React.useMemo(() => {
    if (!expense) return 0;
    return expense.items.reduce((s, i) => s + i.amount, 0);
  }, [expense]);

  function preferReceiptCameraOnDevice() {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(pointer: coarse)").matches;
  }

  function openReceiptPicker(
    mode: "camera" | "pick",
    target: "add" | "edit",
  ) {
    if (target === "add") {
      if (mode === "camera") receiptCaptureRef.current?.click();
      else receiptPickRef.current?.click();
    } else if (mode === "camera") receiptEditCaptureRef.current?.click();
    else receiptEditPickRef.current?.click();
  }

  async function handleReceiptFile(
    ev: React.ChangeEvent<HTMLInputElement>,
    onData: (url: string | null) => void,
    onError?: (message: string) => void,
  ) {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;
    const result = await processReceiptAttachmentFile(file);
    if (result.error) {
      onError?.(result.error);
      return;
    }
    onData(result.dataUrl);
  }

  function applyCopyPatch(patch: CopyLineFormPatch) {
    setCategory(patch.category);
    setDescription(patch.description);
    setConsumptionTaxRate(patch.consumptionTaxRate);
    setHasInvoice(patch.hasInvoice);
    setInvoiceNumber(patch.invoiceNumber);
    setAddLineError(null);
  }

  function addLine(e: React.FormEvent) {
    e.preventDefault();
    if (!expense) return;
    const n = Number.parseInt(amount.replace(/[^\d]/g, ""), 10);
    if (!Number.isFinite(n) || n <= 0) {
      setAddLineError("金額を正しく入力してください。");
      return;
    }
    if (hasReceipt && !receiptImageDataUrl) {
      setAddLineError(
        "領収書ありの場合は撮影するか、写真・PDFを選んで登録してください。",
      );
      return;
    }
    if (hasInvoice) {
      const inv = parseQualifiedInvoiceNumber(invoiceNumber);
      if (!inv) {
        setAddLineError(
          "インボイス登録番号は T + 数字13桁です（例: T1234567890123 または T-1234567890123）。",
        );
        return;
      }
    }
    setAddLineError(null);

    const row: ExpenseItem = {
      id: crypto.randomUUID(),
      expenseId: expense.id,
      date,
      category,
      amount: n,
      description: description.trim(),
      hasReceipt,
      hasInvoice,
      invoiceNumber: hasInvoice ? parseQualifiedInvoiceNumber(invoiceNumber) : null,
      receiptImageDataUrl: hasReceipt ? receiptImageDataUrl : null,
      consumptionTaxRate,
    };
    addItem(expense.id, row);
    setAmount("");
    setConsumptionTaxRate("0");
    setDescription("");
    setHasReceipt(true);
    setHasInvoice(false);
    setInvoiceNumber("");
    setReceiptImageDataUrl(null);
  }

  function openEditLine(item: ExpenseItem) {
    setLineForm(normalizeExpenseItem(item));
    setEditLineError(null);
    setEditLineOpen(true);
  }

  function submitEditLine() {
    if (!expense || !lineForm) return;
    if (lineForm.hasReceipt && !lineForm.receiptImageDataUrl) {
      setEditLineError(
        "領収書ありの場合は撮影するか、写真・PDFを選んで登録してください。",
      );
      return;
    }
    if (lineForm.hasInvoice) {
      const inv = parseQualifiedInvoiceNumber(lineForm.invoiceNumber ?? "");
      if (!inv) {
        setEditLineError(
          "インボイス登録番号は T + 数字13桁です（例: T1234567890123）。",
        );
        return;
      }
    }
    setEditLineError(null);
    updateItem(expense.id, lineForm.id, {
      date: lineForm.date,
      category: lineForm.category,
      amount: lineForm.amount,
      consumptionTaxRate: lineForm.consumptionTaxRate,
      description: lineForm.description,
      hasReceipt: lineForm.hasReceipt,
      hasInvoice: lineForm.hasInvoice,
      invoiceNumber: lineForm.hasInvoice
        ? parseQualifiedInvoiceNumber(lineForm.invoiceNumber ?? "")
        : null,
      receiptImageDataUrl: lineForm.hasReceipt
        ? lineForm.receiptImageDataUrl
        : null,
    });
    setEditLineOpen(false);
    setLineForm(null);
  }

  function openDeleteLine(itemId: string) {
    const it = expense?.items.find((i) => i.id === itemId);
    if (it) setLineForm(it);
    setDeleteLineOpen(true);
  }

  function confirmDeleteLine() {
    if (!expense || !lineForm) return;
    removeItem(expense.id, lineForm.id);
    setDeleteLineOpen(false);
    setLineForm(null);
  }

  function submitEditParent() {
    if (!expense || !formTitle.trim()) return;
    if (formType === "一般経費") {
      patchExpense(expense.id, {
        title: formTitle.trim(),
        type: formType,
        settlementMonth: formSettlementMonth,
      });
    } else {
      const km = Number.parseFloat(formKm);
      patchExpense(expense.id, {
        title: formTitle.trim(),
        type: formType,
        startDate: formStart,
        endDate: formEnd,
        distanceKmOneWay: Number.isFinite(km) ? km : 0,
        hasOvernight: formOvernight,
      });
    }
    setEditParentOpen(false);
  }

  async function downloadDefinitionPdf() {
    const el = defPrintRef.current;
    if (!el) return;
    try {
      await downloadElementAsPdf(
        el,
        `出張旅費定義書_${expense?.title ?? "untitled"}.pdf`,
      );
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : "PDFの作成に失敗しました。",
      );
    }
  }

  async function downloadSitePdf() {
    const el = sitePrintRef.current;
    if (!el) return;
    try {
      await downloadElementAsPdf(
        el,
        `出張経費精算_${expense?.title ?? "site"}.pdf`,
      );
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : "PDFの作成に失敗しました。",
      );
    }
  }

  function confirmDeleteParent() {
    deleteExpense(expenseId);
    setDeleteParentOpen(false);
    router.push("/");
  }

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

  const syncedLabel = expense.syncedAt
    ? new Date(expense.syncedAt).toISOString()
    : null;

  const travelDerived =
    expense.type === "出張"
      ? deriveTravelAmounts(
          expense.startDate,
          expense.endDate,
          expense.distanceKmOneWay,
          expense.hasOvernight,
          expense.executivePerDiem,
        )
      : null;

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-card/35 px-3 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center gap-2">
            <Link
              href="/home"
              aria-label="TOPへ戻る"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon-sm" }),
                "shrink-0 no-underline",
              )}
            >
              <ArrowLeft className="size-5" />
            </Link>
            <BizGoMark variant="inline" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold leading-tight text-foreground sm:text-lg">
              {expense.title}
            </p>
            <p className="text-sm text-muted-foreground sm:text-base">
              {expense.type === "一般経費" && expense.settlementMonth
                ? `精算月 ${expense.settlementMonth} · `
                : null}
              {expense.startDate} — {expense.endDate}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge variant="secondary" className="rounded-md text-[0.65rem]">
              {expense.type === "出張"
                ? "出張経費精算書"
                : "経費精算書"}
            </Badge>
            <Badge
              variant={expense.status === "送信済" ? "outline" : "default"}
              className="rounded-md text-[0.65rem]"
            >
              {expense.status}
            </Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-4 pb-8">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="gap-1.5"
            onClick={() => setEditParentOpen(true)}
          >
            <Pencil className="size-3.5" />
            精算書を編集
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-destructive hover:text-destructive"
            onClick={() => setDeleteParentOpen(true)}
          >
            <Trash2 className="size-3.5" />
            精算書を削除
          </Button>
        </div>

        {expense.type === "出張" ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1.5"
                onClick={() => void downloadDefinitionPdf()}
              >
                <FileText className="size-3.5" />
                出張旅費定義書 PDF
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1.5"
                onClick={() => void downloadSitePdf()}
              >
                <FileText className="size-3.5" />
                この現場の出張経費 PDF
              </Button>
            </div>
            {travelDerived ? (
              <Card className="border-border/50 bg-muted/20">
                <CardHeader className="gap-1">
                  <CardTitle className="text-sm">出張条件・日当（役員）</CardTitle>
                  <CardDescription className="space-y-1 text-xs">
                    <span>
                      片道 {expense.distanceKmOneWay ?? 0} km · 宿泊{" "}
                      {expense.hasOvernight ? "あり" : "なし"} · 日数{" "}
                      {travelDerived.travelDays} 日
                    </span>
                    <br />
                    <span>
                      日当支給：{travelDerived.perDiemEligible ? "該当" : "非該当"}{" "}
                      · 日当合計（理論値）¥
                      {travelDerived.perDiemTotalYen.toLocaleString("ja-JP")}
                    </span>
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : null}
            <div className="pointer-events-none fixed top-0 left-0 -z-50 opacity-0">
              <TravelDefinitionSurface ref={defPrintRef} expense={expense} />
              <TravelSiteSettlementSurface ref={sitePrintRef} expense={expense} />
            </div>
          </>
        ) : null}

        <Card className="border-border/50 bg-card/75 backdrop-blur-sm">
          <CardHeader className="gap-1">
            <CardTitle className="text-base font-medium text-muted-foreground">
              この申請の合計
            </CardTitle>
            <CardDescription className="font-mono text-3xl font-semibold tabular-nums text-foreground sm:text-4xl">
              {yen.format(total)}
            </CardDescription>
            {syncedLabel && (
              <p className="text-xs text-muted-foreground">
                送信: {new Date(syncedLabel).toLocaleString("ja-JP")}
              </p>
            )}
          </CardHeader>
        </Card>

        <section aria-labelledby="line-form-heading">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2
              id="line-form-heading"
              className="text-lg font-semibold tracking-tight text-foreground"
            >
              明細を1行追加
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setCopyDialogOpen(true)}
            >
              <Copy className="size-3.5" />
              過去の明細からコピー
            </Button>
          </div>
          <form
            onSubmit={addLine}
            className="space-y-4 rounded-xl border border-border/50 bg-card/60 p-4 ring-1 ring-foreground/5"
          >
            <input
              ref={receiptCaptureRef}
              type="file"
              accept={RECEIPT_CAMERA_ACCEPT}
              capture="environment"
              className="sr-only"
              aria-hidden
              tabIndex={-1}
              onChange={(ev) =>
                handleReceiptFile(ev, setReceiptImageDataUrl, setAddLineError)
              }
            />
            <input
              ref={receiptPickRef}
              type="file"
              accept={RECEIPT_FILE_ACCEPT}
              className="sr-only"
              aria-hidden
              tabIndex={-1}
              onChange={(ev) =>
                handleReceiptFile(ev, setReceiptImageDataUrl, setAddLineError)
              }
            />
            <div className="grid gap-2">
              <Label htmlFor="line-date">日付</Label>
              <Input
                id="line-date"
                type="date"
                value={date}
                onChange={(ev) => setDate(ev.target.value)}
                className="bg-background/80"
              />
            </div>
            <div className="grid gap-2">
              <Label>区分</Label>
              <Select
                value={category}
                onValueChange={(v) => {
                  if (v != null) setCategory(v);
                }}
              >
                <SelectTrigger className="w-full bg-background/80">
                  <SelectValue placeholder="区分を選択" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="line-amount">金額（円・税込・整数）</Label>
              <Input
                id="line-amount"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="例: 1200"
                value={amount}
                onChange={(ev) => setAmount(ev.target.value)}
                className="bg-background/80 font-mono tabular-nums"
              />
            </div>
            <div className="grid gap-2">
              <Label>消費税区分</Label>
              <Select
                value={consumptionTaxRate}
                onValueChange={(v) => {
                  if (isConsumptionTaxRateKey(v)) setConsumptionTaxRate(v);
                }}
              >
                <SelectTrigger className="w-full bg-background/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONSUMPTION_TAX_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <TaxInclusiveBreakdown
                amountInput={amount}
                rate={consumptionTaxRate}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="line-desc">摘要・メモ</Label>
              <Input
                id="line-desc"
                placeholder="メモ・同行者など"
                value={description}
                onChange={(ev) => setDescription(ev.target.value)}
                className="bg-background/80"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={hasReceipt}
                onCheckedChange={(v) => {
                  const next = v === true;
                  setHasReceipt(next);
                  if (!next) {
                    setReceiptImageDataUrl(null);
                  } else {
                    setTimeout(
                      () =>
                        openReceiptPicker(
                          preferReceiptCameraOnDevice() ? "camera" : "pick",
                          "add",
                        ),
                      80,
                    );
                  }
                }}
              />
              領収書あり（スマホはカメラ、PCは写真・PDFを選べます。画像は長辺最大
              {RECEIPT_IMAGE_MAX_EDGE_PX}px の JPEG に圧縮）
            </label>
            {hasReceipt ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => openReceiptPicker("camera", "add")}
                >
                  <Camera className="size-4" />
                  撮影
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => openReceiptPicker("pick", "add")}
                >
                  <FileUp className="size-4" />
                  写真・PDF
                </Button>
                {receiptImageDataUrl ? (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    {isReceiptPdfDataUrl(receiptImageDataUrl) ? (
                      <FileText className="size-3.5" />
                    ) : (
                      <ImageIcon className="size-3.5" />
                    )}
                    登録済み
                  </span>
                ) : (
                  <span className="text-xs text-amber-200/90">
                    未登録です
                  </span>
                )}
              </div>
            ) : null}
            {hasReceipt && receiptImageDataUrl ? (
              <ReceiptAttachmentPreview dataUrl={receiptImageDataUrl} />
            ) : null}
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={hasInvoice}
                onCheckedChange={(v) => {
                  const next = v === true;
                  setHasInvoice(next);
                  if (!next) setInvoiceNumber("");
                }}
              />
              インボイス（適格請求書）あり
            </label>
            {hasInvoice ? (
              <div className="grid gap-2">
                <Label htmlFor="line-invoice">
                  登録番号（T + 数字13桁）
                </Label>
                <Input
                  id="line-invoice"
                  placeholder="例: T1234567890123"
                  value={invoiceNumber}
                  onChange={(ev) => setInvoiceNumber(ev.target.value)}
                  className="bg-background/80 font-mono uppercase"
                  autoCapitalize="characters"
                />
                <p className="text-xs text-muted-foreground">
                  「T」のあとに数字が13桁続く形式です（ハイフンは T-123…
                  でも可）。
                </p>
              </div>
            ) : null}
            {addLineError ? (
              <p className="text-sm text-amber-200">{addLineError}</p>
            ) : null}
            <Button type="submit" className="h-11 w-full rounded-full">
              この内容で追加
            </Button>
          </form>
        </section>

        <section aria-labelledby="registered-lines-heading">
          <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2
                id="registered-lines-heading"
                className="text-lg font-semibold tracking-tight text-foreground"
              >
                登録済みの明細
              </h2>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                日付・摘要・金額のみ表示しています。区分・消費税・領収書などの詳細は
                「登録済み明細一覧表」でご確認ください。
              </p>
            </div>
            <Link
              href={`/expenses/${expense.id}/items`}
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
                "inline-flex h-10 w-full shrink-0 items-center justify-center gap-1.5 no-underline sm:h-9 sm:w-auto",
              )}
            >
              <Table2 className="size-3.5 shrink-0" aria-hidden />
              登録済み明細一覧表
            </Link>
          </div>
          {expense.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              まだ明細がありません。上のフォームから追加してください。
            </p>
          ) : (
            <ul className="flex max-h-[min(70vh,28rem)] flex-col gap-1.5 overflow-y-auto pr-0.5">
              {expense.items.map((item) => (
                <li key={item.id}>
                  <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/70 px-2.5 py-2 sm:gap-3 sm:px-3">
                    <time
                      dateTime={item.date}
                      className="w-[4.5rem] shrink-0 text-left text-[0.8125rem] tabular-nums leading-none text-muted-foreground sm:w-[5.25rem] sm:text-sm"
                    >
                      {formatLineDateYmd(item.date)}
                    </time>
                    <p
                      className="min-w-0 flex-1 truncate text-sm leading-tight text-foreground"
                      title={
                        item.description?.trim()
                          ? item.description
                          : "（摘要なし）"
                      }
                    >
                      {item.description?.trim()
                        ? item.description
                        : "（摘要なし）"}
                    </p>
                    <span className="shrink-0 font-mono text-sm font-semibold tabular-nums leading-none text-foreground sm:text-base">
                      {yen.format(item.amount)}
                    </span>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-8 sm:size-9"
                        aria-label="明細を編集"
                        onClick={() => openEditLine(item)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-8 text-destructive sm:size-9"
                        aria-label="明細を削除"
                        onClick={() => openDeleteLine(item.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Separator className="bg-border/60" />
        <p className="text-center text-xs leading-relaxed text-muted-foreground sm:text-sm">
          まずこのブラウザの localStorage に保存されます。Home の「Turso
          で共有」をオンにすると、同じ Web アプリ経由で Turso
          の共有データベースにも反映されます
          {cloud.enabled && cloud.authReady === true ? "（現在オン）" : ""}。
        </p>
      </main>

      {expense ? (
        <CopyLineDialog
          open={copyDialogOpen}
          onOpenChange={setCopyDialogOpen}
          expenses={expenses}
          currentExpenseId={expense.id}
          onApply={applyCopyPatch}
        />
      ) : null}

      <Dialog open={editParentOpen} onOpenChange={setEditParentOpen}>
        <DialogContent className={cn("sm:max-w-md", SCROLL_DIALOG_CONTENT)}>
          <DialogHeader className={SCROLL_DIALOG_HEADER}>
            <DialogTitle>精算書を編集</DialogTitle>
          </DialogHeader>
          <div className={cn("grid gap-3", SCROLL_DIALOG_BODY)}>
            <div className="grid gap-2">
              <Label htmlFor="det-title">件名</Label>
              <Input
                id="det-title"
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
                <Label htmlFor="det-sm">精算開始月</Label>
                <Input
                  id="det-sm"
                  type="month"
                  value={formSettlementMonth}
                  onChange={(ev) => setFormSettlementMonth(ev.target.value)}
                />
              </div>
            ) : (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="det-start">出張開始日</Label>
                    <Input
                      id="det-start"
                      type="date"
                      value={formStart}
                      onChange={(ev) => setFormStart(ev.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="det-end">出張終了日</Label>
                    <Input
                      id="det-end"
                      type="date"
                      value={formEnd}
                      onChange={(ev) => setFormEnd(ev.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="det-km">片道距離（km）</Label>
                  <Input
                    id="det-km"
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
            <Button
              variant="outline"
              onClick={() => setEditParentOpen(false)}
            >
              キャンセル
            </Button>
            <Button onClick={submitEditParent}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteParentOpen} onOpenChange={setDeleteParentOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>この精算書を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              明細もすべて削除され、元に戻せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeleteParent}
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={editLineOpen}
        onOpenChange={(open) => {
          setEditLineOpen(open);
          if (!open) setEditLineError(null);
        }}
      >
        <DialogContent className={cn("sm:max-w-md", SCROLL_DIALOG_CONTENT)}>
          <DialogHeader className={SCROLL_DIALOG_HEADER}>
            <DialogTitle>明細を編集</DialogTitle>
          </DialogHeader>
          {lineForm ? (
            <>
              <div className={cn("grid gap-3", SCROLL_DIALOG_BODY)}>
                <div className="grid gap-2">
                  <Label htmlFor="el-date">日付</Label>
                  <Input
                    id="el-date"
                    type="date"
                    value={lineForm.date}
                    onChange={(ev) =>
                      setLineForm({ ...lineForm, date: ev.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>区分</Label>
                  <Select
                    value={lineForm.category}
                    onValueChange={(v) => {
                      if (v != null)
                        setLineForm({ ...lineForm, category: v });
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="el-amt">金額（円・税込）</Label>
                  <Input
                    id="el-amt"
                    inputMode="numeric"
                    value={String(lineForm.amount)}
                    onChange={(ev) => {
                      const n = Number.parseInt(
                        ev.target.value.replace(/[^\d]/g, ""),
                        10,
                      );
                      setLineForm({
                        ...lineForm,
                        amount: Number.isFinite(n) ? n : 0,
                      });
                    }}
                    className="font-mono"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>消費税区分</Label>
                  <Select
                    value={lineForm.consumptionTaxRate}
                    onValueChange={(v) => {
                      if (isConsumptionTaxRateKey(v))
                        setLineForm({ ...lineForm, consumptionTaxRate: v });
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONSUMPTION_TAX_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <TaxInclusiveBreakdown
                    amountInput={String(lineForm.amount)}
                    rate={toConsumptionTaxRateKey(lineForm.consumptionTaxRate)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="el-desc">摘要</Label>
                  <Input
                    id="el-desc"
                    value={lineForm.description}
                    onChange={(ev) =>
                      setLineForm({
                        ...lineForm,
                        description: ev.target.value,
                      })
                    }
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={lineForm.hasReceipt}
                    onCheckedChange={(v) => {
                      const next = v === true;
                      setLineForm({
                        ...lineForm,
                        hasReceipt: next,
                        receiptImageDataUrl: next
                          ? lineForm.receiptImageDataUrl
                          : null,
                      });
                      if (next) {
                        setTimeout(
                          () =>
                            openReceiptPicker(
                              preferReceiptCameraOnDevice() ? "camera" : "pick",
                              "edit",
                            ),
                          80,
                        );
                      }
                    }}
                  />
                  領収書あり（スマホはカメラ、PCは写真・PDF。画像は長辺最大
                  {RECEIPT_IMAGE_MAX_EDGE_PX}px の JPEG に圧縮）
                </label>
                <input
                  ref={receiptEditCaptureRef}
                  type="file"
                  accept={RECEIPT_CAMERA_ACCEPT}
                  capture="environment"
                  className="sr-only"
                  aria-hidden
                  tabIndex={-1}
                  onChange={(ev) =>
                    handleReceiptFile(
                      ev,
                      (url) =>
                        setLineForm((prev) =>
                          prev ? { ...prev, receiptImageDataUrl: url } : prev,
                        ),
                      setEditLineError,
                    )
                  }
                />
                <input
                  ref={receiptEditPickRef}
                  type="file"
                  accept={RECEIPT_FILE_ACCEPT}
                  className="sr-only"
                  aria-hidden
                  tabIndex={-1}
                  onChange={(ev) =>
                    handleReceiptFile(
                      ev,
                      (url) =>
                        setLineForm((prev) =>
                          prev ? { ...prev, receiptImageDataUrl: url } : prev,
                        ),
                      setEditLineError,
                    )
                  }
                />
                {lineForm.hasReceipt ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => openReceiptPicker("camera", "edit")}
                    >
                      <Camera className="size-4" />
                      撮影
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => openReceiptPicker("pick", "edit")}
                    >
                      <FileUp className="size-4" />
                      写真・PDF
                    </Button>
                  </div>
                ) : null}
                {lineForm.hasReceipt && lineForm.receiptImageDataUrl ? (
                  <ReceiptAttachmentPreview
                    dataUrl={lineForm.receiptImageDataUrl}
                    imgClassName="max-h-36"
                  />
                ) : null}
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={lineForm.hasInvoice}
                    onCheckedChange={(v) => {
                      const next = v === true;
                      setLineForm({
                        ...lineForm,
                        hasInvoice: next,
                        invoiceNumber: next ? lineForm.invoiceNumber : null,
                      });
                    }}
                  />
                  インボイス（適格請求書）あり
                </label>
                {lineForm.hasInvoice ? (
                  <div className="grid gap-2">
                    <Label htmlFor="el-inv">登録番号（T + 数字13桁）</Label>
                    <Input
                      id="el-inv"
                      value={lineForm.invoiceNumber ?? ""}
                      onChange={(ev) =>
                        setLineForm({
                          ...lineForm,
                          invoiceNumber: ev.target.value,
                        })
                      }
                      className="font-mono uppercase"
                    />
                  </div>
                ) : null}
                {editLineError ? (
                  <p className="text-sm text-amber-200">{editLineError}</p>
                ) : null}
              </div>
              <DialogFooter className={SCROLL_DIALOG_FOOTER}>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditLineOpen(false);
                    setLineForm(null);
                  }}
                >
                  キャンセル
                </Button>
                <Button onClick={submitEditLine}>保存</Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteLineOpen} onOpenChange={setDeleteLineOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>この明細を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {lineForm
                ? `${lineForm.category} ${yen.format(lineForm.amount)}`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setLineForm(null);
              }}
            >
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeleteLine}
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
