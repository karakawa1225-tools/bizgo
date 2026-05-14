"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { BizGoMark } from "@/components/bizgo-mark";
import { useExpenses } from "@/contexts/expenses-context";
import { deriveTravelAmounts, countTravelDaysInclusive } from "@/lib/travel-calculations";
import { cn } from "@/lib/utils";

export function NewExpenseForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const { createGeneralExpense, createTravelExpense, hydrated } = useExpenses();
  const draftId = React.useMemo(() => crypto.randomUUID(), []);

  const kind = sp.get("type");
  const valid = kind === "出張" || kind === "一般経費";

  const [title, setTitle] = React.useState("");
  const [settlementMonth, setSettlementMonth] = React.useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  const [startDate, setStartDate] = React.useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = React.useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [distanceKm, setDistanceKm] = React.useState("80");
  const [hasOvernight, setHasOvernight] = React.useState(false);

  const travelPreview =
    kind === "出張"
      ? deriveTravelAmounts(
          startDate,
          endDate,
          Number.parseFloat(distanceKm) || 0,
          hasOvernight,
          true,
        )
      : null;

  const daysPreview =
    kind === "出張"
      ? countTravelDaysInclusive(startDate, endDate)
      : 0;

  function submitGeneral(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !hydrated) return;
    const id = createGeneralExpense({
      title: title.trim(),
      settlementMonth,
      idempotentId: draftId,
    });
    router.replace(`/expenses/${id}`);
  }

  function submitTravel(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !hydrated) return;
    const km = Number.parseFloat(distanceKm);
    if (!Number.isFinite(km) || km < 0) return;
    const id = createTravelExpense({
      title: title.trim(),
      startDate,
      endDate,
      distanceKmOneWay: km,
      hasOvernight,
      idempotentId: draftId,
    });
    router.replace(`/expenses/${id}`);
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-svh items-center justify-center px-4">
        <p className="text-base text-muted-foreground">読み込み中…</p>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-12">
        <p className="text-base text-muted-foreground">不正なリンクです。</p>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
          TOPへ
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-border/60 bg-card/25 px-4 py-5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon-sm" }),
                "no-underline",
              )}
            >
              <ArrowLeft className="size-5" />
            </Link>
            <BizGoMark variant="inline" />
          </div>
          <h1 className="text-xl font-semibold leading-snug text-foreground sm:text-2xl">
            {kind === "一般経費"
              ? "経費精算書を新規作成"
              : "出張経費精算書を新規作成"}
          </h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
        {kind === "一般経費" ? (
          <form onSubmit={submitGeneral} className="space-y-5">
            <div className="grid gap-2">
              <Label htmlFor="g-title" className="text-base">
                件名
              </Label>
              <Input
                id="g-title"
                value={title}
                onChange={(ev) => setTitle(ev.target.value)}
                placeholder="例：3月度立替分"
                required
                className="bg-card/50 text-base"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="g-month" className="text-base">
                精算開始月
              </Label>
              <Input
                id="g-month"
                type="month"
                value={settlementMonth}
                onChange={(ev) => setSettlementMonth(ev.target.value)}
                required
                className="bg-card/50 text-base"
              />
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                その月の1日〜末日を精算期間として登録します。
              </p>
            </div>
            <Button type="submit" className="w-full rounded-full text-base" size="lg">
              作成して明細入力へ
            </Button>
          </form>
        ) : (
          <form onSubmit={submitTravel} className="space-y-5">
            <div className="grid gap-2">
              <Label htmlFor="t-title" className="text-base">
                件名（現場・案件名）
              </Label>
              <Input
                id="t-title"
                value={title}
                onChange={(ev) => setTitle(ev.target.value)}
                placeholder="例：〇〇商事 工場改善プロジェクト"
                required
                className="bg-card/50 text-base"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="t-start" className="text-base">
                  出張開始日
                </Label>
                <Input
                  id="t-start"
                  type="date"
                  value={startDate}
                  onChange={(ev) => setStartDate(ev.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="t-end" className="text-base">
                  出張終了日
                </Label>
                <Input
                  id="t-end"
                  type="date"
                  value={endDate}
                  onChange={(ev) => setEndDate(ev.target.value)}
                  required
                />
              </div>
            </div>
            <p className="text-base text-muted-foreground">
              出張日数（暦日）：{" "}
              <span className="font-mono text-lg font-medium text-foreground">
                {daysPreview}
              </span>{" "}
              日（開始・終了を含む）
            </p>
            <Separator />
            <div className="grid gap-2">
              <Label htmlFor="t-km" className="text-base">
                現場までの片道距離（km）
              </Label>
              <Input
                id="t-km"
                inputMode="decimal"
                value={distanceKm}
                onChange={(ev) => setDistanceKm(ev.target.value)}
                placeholder="例：85"
                required
                className="bg-card/50 font-mono text-base"
              />
            </div>
            <label className="flex cursor-pointer items-start gap-2 text-base">
              <Checkbox
                checked={hasOvernight}
                onCheckedChange={(v) => setHasOvernight(v === true)}
                className="mt-0.5"
              />
              <span>宿泊を伴う出張（または宿泊が必要な行程）</span>
            </label>
            <div className="rounded-xl border border-border/60 bg-card/50 p-5 text-base">
              <p className="text-lg font-medium text-foreground">日当（役員・固定）</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                片道 100km を超える、または宿泊がある場合に、役員日当 ¥3,500 ×
                出張日数を計算します（あなたは社長として役員扱い）。
              </p>
              {travelPreview ? (
                <ul className="mt-3 space-y-1.5 font-mono text-sm text-foreground">
                  <li>日当単価：¥{travelPreview.perDiemRateYen.toLocaleString("ja-JP")}</li>
                  <li>支給条件：{travelPreview.perDiemEligible ? "該当" : "非該当"}</li>
                  <li>
                    日当合計（自動）：¥
                    {travelPreview.perDiemTotalYen.toLocaleString("ja-JP")}
                  </li>
                </ul>
              ) : null}
            </div>
            <Button type="submit" className="w-full rounded-full text-base" size="lg">
              作成して明細入力へ
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}
