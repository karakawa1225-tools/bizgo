"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, FileText, LayoutGrid, Sparkles } from "lucide-react";

import { AppPageShell } from "@/components/app-page-shell";
import { BizGoMark } from "@/components/bizgo-mark";
import { CloudSyncCard } from "@/components/cloud-sync-card";
import { MonthlyGeneralSurface } from "@/components/pdf/bizgo-print-surfaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useExpenses } from "@/contexts/expenses-context";
import { downloadElementAsPdf } from "@/lib/export-pdf";
import {
  exportMonthlyGeneralCsv,
  monthlyGeneralTotals,
} from "@/lib/export-monthly-general";
import {
  exportMonthlyTravelCsv,
  monthlyTravelTotals,
} from "@/lib/export-monthly-travel";
import { cn } from "@/lib/utils";

const yen = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

const quickLinks = [
  {
    href: "/create",
    title: "新規作成",
    desc: "経費精算書・出張精算書を作る",
    icon: Building2,
  },
  {
    href: "/expenses",
    title: "申請一覧",
    desc: "月別タブで確認・編集",
    icon: LayoutGrid,
  },
  {
    href: "/",
    title: "使い方（TOP）",
    desc: "流れと機能の説明",
    icon: Sparkles,
  },
] as const;

export function HomePageClient() {
  const { expenses, hydrated, cloud } = useExpenses();
  const monthPdfRef = React.useRef<HTMLDivElement>(null);
  const [exportYm, setExportYm] = React.useState(() =>
    new Date().toISOString().slice(0, 7),
  );

  const monthlyGeneralStats = monthlyGeneralTotals(expenses, exportYm);
  const monthlyTravelStats = monthlyTravelTotals(expenses, exportYm);

  async function handleMonthlyPdf() {
    const el = monthPdfRef.current;
    if (!el) return;
    await downloadElementAsPdf(el, `経費精算_${exportYm}.pdf`);
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-muted-foreground">読み込み中…</p>
      </div>
    );
  }

  return (
    <AppPageShell>
      <header className="border-b border-border/60 bg-gradient-to-b from-primary/10 to-card/20 px-4 py-8 backdrop-blur-xl">
        <div className="mx-auto max-w-lg space-y-3">
          <BizGoMark variant="hero" />
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Home
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            日常の操作はここから。作成 → 明細入力 → 一覧確認 → 月次 CSV/PDF の順で進めます。
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6 pb-28">
        <section className="grid gap-3 sm:grid-cols-3">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col gap-2 rounded-xl border border-border/60 bg-card/70 p-4 no-underline ring-1 ring-foreground/5 transition-colors hover:bg-muted/40",
              )}
            >
              <item.icon className="size-6 text-primary" aria-hidden />
              <span className="font-semibold text-foreground">{item.title}</span>
              <span className="text-xs leading-snug text-muted-foreground">
                {item.desc}
              </span>
            </Link>
          ))}
        </section>

        <CloudSyncCard cloud={cloud} />

        <Separator />

        <section className="space-y-4 rounded-xl border border-border/60 bg-card/50 p-5">
          <h2 className="text-lg font-semibold">月次出力（一般・出張）</h2>
          <Label htmlFor="home-export-month" className="text-sm text-muted-foreground">
            対象月
          </Label>
          <Input
            id="home-export-month"
            type="month"
            value={exportYm}
            onChange={(ev) => setExportYm(ev.target.value)}
            className="max-w-xs bg-card/60"
          />
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              一般（精算月 {exportYm}）：{monthlyGeneralStats.count} 件・
              {yen.format(monthlyGeneralStats.sum)}
            </p>
            <p>
              出張（期間重複 {exportYm}）：{monthlyTravelStats.count} 件・
              {yen.format(monthlyTravelStats.sum)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1.5"
              onClick={() => exportMonthlyGeneralCsv(expenses, exportYm)}
            >
              <FileText className="size-3.5" />
              一般 CSV
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1.5"
              onClick={() => exportMonthlyTravelCsv(expenses, exportYm)}
            >
              <FileText className="size-3.5" />
              出張 CSV
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1.5"
              onClick={() => void handleMonthlyPdf()}
            >
              <FileText className="size-3.5" />
              一般 PDF
            </Button>
          </div>
        </section>

        <div className="pointer-events-none fixed top-0 left-[-12000px] z-[-1]">
          <MonthlyGeneralSurface
            ref={monthPdfRef}
            expenses={expenses}
            ym={exportYm}
          />
        </div>

        <section className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 text-sm leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">一覧が増えたとき</p>
          <p className="mt-1">
            申請一覧では<strong className="font-normal text-foreground">年・月タブ</strong>
            で絞り込みできます。スマホ・タブレットでもスクロールしやすい構成にしています。
          </p>
        </section>
      </main>
    </AppPageShell>
  );
}
