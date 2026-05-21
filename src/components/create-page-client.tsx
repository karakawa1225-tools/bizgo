"use client";

import Link from "next/link";
import { ArrowLeft, Building2, Plane } from "lucide-react";

import { AppPageShell } from "@/components/app-page-shell";
import { BizGoMark } from "@/components/bizgo-mark";
import { cn } from "@/lib/utils";

export function CreatePageClient() {
  return (
    <AppPageShell>
      <header className="border-b border-border/60 bg-card/30 px-4 py-5">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Link
            href="/home"
            aria-label="Homeへ"
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted/50"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="flex-1 text-xl font-semibold">新規作成</h1>
          <BizGoMark variant="inline" />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-8 pb-28">
        <p className="text-sm leading-relaxed text-muted-foreground">
          作成する精算書の種類を選びます。作成後は明細画面で領収書・金額を入力してください。
        </p>
        <div className="flex flex-col gap-4">
          <Link
            href="/expenses/new?type=一般経費"
            className={cn(
              "flex min-h-[4rem] flex-col items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card/90 px-4 py-6 text-center text-lg font-semibold text-foreground shadow-md ring-1 ring-primary/20 transition-transform active:scale-[0.99] hover:bg-muted/50 no-underline",
            )}
          >
            <Building2 className="size-8 text-primary" aria-hidden />
            経費精算書（一般）
          </Link>
          <Link
            href="/expenses/new?type=出張"
            className={cn(
              "flex min-h-[4rem] flex-col items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card/90 px-4 py-6 text-center text-lg font-semibold text-foreground shadow-md ring-1 ring-primary/20 transition-transform active:scale-[0.99] hover:bg-muted/50 no-underline",
            )}
          >
            <Plane className="size-8 text-primary" aria-hidden />
            出張経費精算書
          </Link>
        </div>
      </main>
    </AppPageShell>
  );
}
