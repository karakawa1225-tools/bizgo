"use client";

import * as React from "react";
import { Noto_Sans_JP } from "next/font/google";

import {
  SettlementLineItemsTable,
  SettlementPdfHeader,
  settlementPdfPageStyle,
} from "@/components/pdf/settlement-pdf-layout";
import type { ExpenseItem } from "@/db/schema";
import type { ExpenseRecord } from "@/lib/expense-types";
import { normalizeExpenseItem } from "@/lib/expense-item-fields";
import { formatPdfYen } from "@/lib/pdf-format";
import {
  buildMonthlyGeneralRows,
  formatSettlementMonthJa,
} from "@/lib/export-monthly-general";
import { filterTravelExpensesForMonth } from "@/lib/export-monthly-travel";
import { deriveTravelAmounts } from "@/lib/travel-calculations";
import { totalYen } from "@/lib/expenses-storage";

const noto = Noto_Sans_JP({
  weight: ["400", "700"],
  subsets: ["latin"],
});

const BORDER = "1px solid #000000";
const cell: React.CSSProperties = {
  border: BORDER,
  padding: "1.5mm 2mm",
  height: "7.5mm",
  verticalAlign: "middle",
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
};
const thCell: React.CSSProperties = {
  ...cell,
  backgroundColor: "#f0f0f0",
  fontWeight: 700,
  textAlign: "center",
  fontSize: "9pt",
};

function PdfPage({
  children,
  refProp,
  pageBreakAfter = true,
}: {
  children: React.ReactNode;
  refProp?: React.Ref<HTMLDivElement>;
  pageBreakAfter?: boolean;
}) {
  return (
    <div
      ref={refProp}
      style={{
        ...settlementPdfPageStyle,
        fontFamily: noto.style.fontFamily,
        ...(pageBreakAfter
          ? { pageBreakAfter: "always", breakAfter: "page" as const }
          : {}),
      }}
    >
      {children}
    </div>
  );
}

/** 画面外に置くプリント用ルート（白背景） */
export const TravelDefinitionSurface = React.forwardRef<
  HTMLDivElement,
  { expense: ExpenseRecord }
>(function TravelDefinitionSurface({ expense }, ref) {
  const d = deriveTravelAmounts(
    expense.startDate,
    expense.endDate,
    expense.distanceKmOneWay,
    expense.hasOvernight,
    expense.executivePerDiem,
  );
  return (
    <PdfPage refProp={ref}>
      <SettlementPdfHeader
        documentLabel="出張旅費定義書"
        title={expense.title}
        metaLines={[
          `出張期間：${expense.startDate} 〜 ${expense.endDate}（${d.travelDays} 日）`,
          `片道 ${expense.distanceKmOneWay ?? 0} km · 宿泊 ${expense.hasOvernight ? "あり" : "なし"}`,
        ]}
      />
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
          border: BORDER,
          fontSize: "9pt",
        }}
      >
        <tbody>
          <tr>
            <td style={{ ...thCell, width: "28%" }}>日当区分</td>
            <td style={cell}>役員（¥3,500／日）</td>
          </tr>
          <tr>
            <td style={thCell}>日当の要件</td>
            <td style={cell}>片道 100km 超 または 宿泊あり</td>
          </tr>
          <tr>
            <td style={thCell}>要件該当</td>
            <td style={cell}>{d.perDiemEligible ? "該当" : "非該当"}</td>
          </tr>
          <tr>
            <td style={thCell}>日当合計</td>
            <td style={{ ...cell, fontWeight: 700 }}>
              {formatPdfYen(d.perDiemTotalYen)}
              {d.perDiemEligible
                ? `（${d.travelDays} 日 × ${formatPdfYen(d.perDiemRateYen)}）`
                : ""}
            </td>
          </tr>
        </tbody>
      </table>
      <p style={{ marginTop: "8mm", fontSize: "8pt", color: "#444444" }}>
        備考：本書は出張の目的・条件を定義するものです。交通宿泊等の実費は別途明細に計上します。
      </p>
    </PdfPage>
  );
});

export const TravelSiteSettlementSurface = React.forwardRef<
  HTMLDivElement,
  { expense: ExpenseRecord }
>(function TravelSiteSettlementSurface({ expense }, ref) {
  const sum = totalYen(expense.items);
  return (
    <PdfPage refProp={ref}>
      <SettlementPdfHeader
        documentLabel="出張経費精算書"
        title={expense.title}
        metaLines={[`出張期間：${expense.startDate} 〜 ${expense.endDate}`]}
      />
      <SettlementLineItemsTable items={expense.items} totalYen={sum} />
    </PdfPage>
  );
});

export const MonthlyTravelSurface = React.forwardRef<
  HTMLDivElement,
  { expenses: ExpenseRecord[]; ym: string }
>(function MonthlyTravelSurface({ expenses, ym }, ref) {
  const list = filterTravelExpensesForMonth(expenses, ym);
  const monthLabel = formatSettlementMonthJa(ym);

  if (list.length === 0) {
    return (
      <PdfPage refProp={ref}>
        <SettlementPdfHeader
          documentLabel={`出張経費精算書（月次）　対象月：${monthLabel}`}
          title="（該当なし）"
        />
        <p style={{ fontSize: "9pt", color: "#666666" }}>
          この月に重なる出張経費はありません。
        </p>
      </PdfPage>
    );
  }

  return (
    <div ref={ref} style={{ fontFamily: noto.style.fontFamily }}>
      {list.map((e, i) => (
        <PdfPage key={e.id} pageBreakAfter={i < list.length - 1}>
          <SettlementPdfHeader
            documentLabel={`出張経費精算書（月次）　対象月：${monthLabel}${list.length > 1 ? `　${i + 1}/${list.length}` : ""}`}
            title={e.title}
            metaLines={[`出張期間：${e.startDate} 〜 ${e.endDate}`]}
          />
          <SettlementLineItemsTable
            items={e.items}
            totalYen={totalYen(e.items)}
          />
        </PdfPage>
      ))}
    </div>
  );
});

export const MonthlyGeneralSurface = React.forwardRef<
  HTMLDivElement,
  { expenses: ExpenseRecord[]; ym: string }
>(function MonthlyGeneralSurface({ expenses, ym }, ref) {
  const rows = buildMonthlyGeneralRows(expenses, ym);
  const monthLabel = formatSettlementMonthJa(ym);
  const dataRows = rows.slice(1);

  if (dataRows.length === 0) {
    return (
      <PdfPage refProp={ref}>
        <SettlementPdfHeader
          documentLabel={`経費精算書（月次）　精算月：${monthLabel}`}
          title="（該当なし）"
        />
        <p style={{ fontSize: "9pt", color: "#666666" }}>
          この月の一般経費はありません。
        </p>
      </PdfPage>
    );
  }

  const byTitle = new Map<string, (string | number)[][]>();
  for (const row of dataRows) {
    const title = String(row[1] ?? "");
    if (!byTitle.has(title)) byTitle.set(title, []);
    byTitle.get(title)!.push(row);
  }

  const groups = [...byTitle.entries()];

  return (
    <div ref={ref} style={{ fontFamily: noto.style.fontFamily }}>
      {groups.map(([title, groupRows], i) => {
        let sum = 0;
        const items: ExpenseItem[] = groupRows.map((row, ri) => {
          const amount = Number(row[4]) || 0;
          sum += amount;
          return normalizeExpenseItem({
            id: `${title}-${ri}-${row[2]}`,
            expenseId: title,
            date: String(row[2] ?? ""),
            category: String(row[3] ?? ""),
            amount,
            description: String(row[8] ?? ""),
            hasReceipt: row[9] === "あり",
            hasInvoice: row[10] === "あり",
            invoiceNumber: row[11] ? String(row[11]) : null,
            consumptionTaxRate: "0",
          });
        });

        return (
          <PdfPage
            key={title}
            pageBreakAfter={i < groups.length - 1}
          >
            <SettlementPdfHeader
              documentLabel={`経費精算書（月次）　精算月：${monthLabel}${groups.length > 1 ? `　${i + 1}/${groups.length}` : ""}`}
              title={title}
            />
            <SettlementLineItemsTable items={items} totalYen={sum} />
          </PdfPage>
        );
      })}
    </div>
  );
});
