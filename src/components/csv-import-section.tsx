"use client";

import * as React from "react";
import { FileUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useExpenses } from "@/contexts/expenses-context";

export function CsvImportSection() {
  const { importExpensesFromCsv } = useExpenses();
  const generalInputRef = React.useRef<HTMLInputElement>(null);
  const travelInputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function handleFile(file: File | undefined, expected: "general" | "travel") {
    if (!file) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const result = await importExpensesFromCsv(file, {
        expectedFormat: expected,
      });
      const label = expected === "general" ? "経費精算書" : "出張経費精算書";
      setMessage(
        `${label}を ${result.applicationCount} 件・明細 ${result.lineCount} 行取り込みました。${
          result.warnings.length > 0 ? ` ${result.warnings.join(" ")}` : ""
        }`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "取り込みに失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-border/60 bg-card/50 p-5">
      <h2 className="text-lg font-semibold">CSV 取り込み</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Home で出力した BizGo 形式の CSV を読み戻せます。Excel
        で編集した内容も、同じ列構成なら取り込めます。領収書画像は CSV
        に含まれないため取り込まれません。
      </p>
      <p className="text-xs text-muted-foreground">
        同じ件名・精算条件の申請が既にある場合は明細を差し替え、なければ新規追加します。
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          ref={generalInputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          aria-hidden
          tabIndex={-1}
          onChange={(ev) => {
            void handleFile(ev.target.files?.[0], "general");
            ev.target.value = "";
          }}
        />
        <input
          ref={travelInputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          aria-hidden
          tabIndex={-1}
          onChange={(ev) => {
            void handleFile(ev.target.files?.[0], "travel");
            ev.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="gap-1.5"
          disabled={busy}
          onClick={() => generalInputRef.current?.click()}
        >
          <FileUp className="size-3.5" />
          経費精算 CSV
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="gap-1.5"
          disabled={busy}
          onClick={() => travelInputRef.current?.click()}
        >
          <FileUp className="size-3.5" />
          出張経費 CSV
        </Button>
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-primary" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
