"use client";

import Link from "next/link";
import { ArrowRight, ClipboardList, FileSpreadsheet, Receipt, Smartphone } from "lucide-react";

import { AppPageShell } from "@/components/app-page-shell";
import { BizGoHeroIllustration } from "@/components/bizgo-hero-illustration";
import { BizGoMark } from "@/components/bizgo-mark";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const steps = [
  {
    icon: Receipt,
    title: "精算書を作成",
    body: "Home または「新規作成」から、一般経費・出張のどちらかの精算書を作ります。",
  },
  {
    icon: ClipboardList,
    title: "明細を入力",
    body: "日付・区分・金額・領収書（写真や PDF）を登録。過去明細から区分だけコピーもできます。",
  },
  {
    icon: Smartphone,
    title: "端末で共有（任意）",
    body: "Turso 同期をオンにすると、PC・スマホ・タブレットで同じデータを参照できます。",
  },
  {
    icon: FileSpreadsheet,
    title: "月次出力",
    body: "Home で CSV / PDF を出力し、経理提出用にまとめます。一覧は年・月タブで整理。",
  },
] as const;

export function TopLandingClient() {
  return (
    <AppPageShell withNav>
      <div className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,oklch(0.55_0.14_175/0.25),transparent)]"
          aria-hidden
        />
        <header className="relative px-4 pb-6 pt-10 sm:pt-14">
          <div className="mx-auto max-w-lg space-y-6">
            <BizGoMark variant="hero" className="drop-shadow-sm" />
            <BizGoHeroIllustration className="mx-auto" />
            <div className="space-y-3 text-center sm:text-left">
              <p className="text-sm font-medium uppercase tracking-widest text-primary/90">
                立替経費・出張旅費の精算
              </p>
              <h1 className="text-2xl font-semibold leading-tight tracking-tight sm:text-4xl">
                社内精算を、ひとつの Web アプリで。
              </h1>
              <p className="text-base leading-relaxed text-muted-foreground">
                Biz!Go! は経費精算書と出張経費精算書を分けて管理し、明細・領収書・月次 CSV
                までをスマホ入力前提でまとめるアプリです。
              </p>
            </div>
            <Link
              href="/home"
              className={cn(
                buttonVariants({ size: "lg" }),
                "inline-flex w-full gap-2 sm:w-auto",
              )}
            >
              Home ではじめる
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </header>
      </div>

      <main className="mx-auto max-w-lg flex-1 space-y-8 px-4 py-8 pb-28">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">使い方の流れ</h2>
          <ol className="space-y-3">
            {steps.map((step, i) => (
              <li
                key={step.title}
                className="flex gap-4 rounded-xl border border-border/60 bg-card/60 p-4"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                  {i + 1}
                </span>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <step.icon className="size-4 text-primary" aria-hidden />
                    {step.title}
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-xl border border-border/60 bg-muted/20 p-5 text-sm leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">ページ構成</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              <strong className="font-normal text-foreground">TOP</strong> — この説明画面
            </li>
            <li>
              <strong className="font-normal text-foreground">Home</strong> — 同期・月次出力・ショートカット
            </li>
            <li>
              <strong className="font-normal text-foreground">新規作成</strong> — 精算書の種別選択
            </li>
            <li>
              <strong className="font-normal text-foreground">申請一覧</strong> — 経費と出張を分け、月別タブ表示
            </li>
          </ul>
        </section>
      </main>
    </AppPageShell>
  );
}
