"use client";

import * as React from "react";
import type { CSSProperties, ReactNode } from "react";

import type { ExpenseItem } from "@/db/schema";
import {
  splitTaxIncludedYen,
  toConsumptionTaxRateKey,
} from "@/lib/consumption-tax";
import { formatPdfYen } from "@/lib/pdf-format";
import { PDF_APPLICANT_NAME, PDF_COMPANY_NAME } from "@/lib/pdf-report-meta";

const BORDER = "1px solid #000000";
const AMOUNT_ROW_H = "7.5mm";

export const settlementPdfPageStyle: CSSProperties = {
  width: "210mm",
  minHeight: "297mm",
  boxSizing: "border-box",
  padding: "10mm 12mm 12mm",
  backgroundColor: "#ffffff",
  color: "#000000",
  fontSize: "9pt",
  lineHeight: 1.35,
  breakInside: "avoid",
};

const cell: CSSProperties = {
  border: BORDER,
  padding: "1.5mm 2mm",
  boxSizing: "border-box",
  verticalAlign: "top",
};

const th: CSSProperties = {
  ...cell,
  backgroundColor: "#f0f0f0",
  fontWeight: 700,
  textAlign: "center",
  fontSize: "8pt",
  verticalAlign: "middle",
  whiteSpace: "nowrap",
};

/** 摘要・登録番号など — 省略・切り詰めなし */
const textFull: CSSProperties = {
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  overflow: "visible",
  overflowWrap: "anywhere",
  lineHeight: 1.4,
};

const amountRow: CSSProperties = {
  ...cell,
  height: AMOUNT_ROW_H,
  minHeight: AMOUNT_ROW_H,
  verticalAlign: "middle",
  fontSize: "8pt",
  whiteSpace: "nowrap",
};

const sideSpan: CSSProperties = {
  ...cell,
  verticalAlign: "top",
  textAlign: "center",
  fontSize: "8.5pt",
};

const yen: CSSProperties = {
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
};

const footLine: CSSProperties = { borderTop: "2px solid #000000" };

function lineTax(it: ExpenseItem) {
  const rate = toConsumptionTaxRateKey(it.consumptionTaxRate);
  return splitTaxIncludedYen(it.amount, rate);
}

function sumLines(items: ExpenseItem[]) {
  let inclusive = 0;
  let exclusive = 0;
  let tax = 0;
  for (const it of items) {
    inclusive += it.amount;
    const s = lineTax(it);
    exclusive += s.exclusiveYen;
    tax += s.taxYen;
  }
  return { inclusive, exclusive, tax };
}

type HeaderProps = {
  documentLabel: string;
  title: string;
  metaLines?: string[];
};

export function SettlementPdfHeader({
  documentLabel,
  title,
  metaLines = [],
}: HeaderProps) {
  return (
    <header
      style={{
        marginBottom: "5mm",
        breakInside: "avoid",
        pageBreakInside: "avoid",
      }}
    >
      <div style={{ position: "relative", marginBottom: "2mm" }}>
        {PDF_COMPANY_NAME ? (
          <p
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              margin: 0,
              maxWidth: "38mm",
              fontSize: "10pt",
              fontWeight: 700,
              textAlign: "right",
              ...textFull,
            }}
          >
            {PDF_COMPANY_NAME}
          </p>
        ) : null}
        <div style={{ textAlign: "center", padding: "0 32mm 0 8mm" }}>
          <p
            style={{
              margin: 0,
              fontSize: "13pt",
              fontWeight: 700,
              letterSpacing: "0.02em",
              ...textFull,
            }}
          >
            {title}
          </p>
          <p
            style={{
              margin: "2.5mm 0 0",
              fontSize: "9.5pt",
              ...textFull,
            }}
          >
            氏名　{PDF_APPLICANT_NAME}
          </p>
        </div>
      </div>
      <p
        style={{
          margin: "0 0 2mm",
          textAlign: "center",
          fontSize: "8.5pt",
          color: "#333333",
          ...textFull,
        }}
      >
        {documentLabel}
      </p>
      {metaLines.map((line) => (
        <p
          key={line}
          style={{
            margin: "0 0 1mm",
            fontSize: "8.5pt",
            color: "#333333",
            ...textFull,
          }}
        >
          {line}
        </p>
      ))}
    </header>
  );
}

type TableProps = {
  items: ExpenseItem[];
  totalYen: number;
  footer?: ReactNode;
};

/**
 * 8列: 日付 | 区分 | 明細5列分 | 領収
 * 1行目: 摘要のみ（5列結合・折り返し全文）
 * 2行目: 税込 | 税抜 | 消費税 | インボイス | 登録番号
 */
export function SettlementLineItemsTable({
  items,
  totalYen: sumInclusive,
  footer,
}: TableProps) {
  const totals = sumLines(items);

  return (
    <div style={{ width: "100%" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
          border: BORDER,
        }}
      >
        <colgroup>
          <col style={{ width: "8%" }} />
          <col style={{ width: "9%" }} />
          <col style={{ width: "14.5%" }} />
          <col style={{ width: "14.5%" }} />
          <col style={{ width: "14.5%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "16.5%" }} />
          <col style={{ width: "5%" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ ...th, height: AMOUNT_ROW_H }} rowSpan={2}>
              日付
            </th>
            <th style={{ ...th, height: AMOUNT_ROW_H }} rowSpan={2}>
              区分
            </th>
            <th colSpan={5} style={{ ...th, height: AMOUNT_ROW_H }}>
              摘要
            </th>
            <th style={{ ...th, height: AMOUNT_ROW_H }} rowSpan={2}>
              領収
            </th>
          </tr>
          <tr>
            <th style={{ ...th, height: AMOUNT_ROW_H }}>金額（税込）</th>
            <th style={{ ...th, height: AMOUNT_ROW_H }}>税抜金額</th>
            <th style={{ ...th, height: AMOUNT_ROW_H }}>消費税額</th>
            <th style={{ ...th, height: AMOUNT_ROW_H }}>インボイス</th>
            <th style={{ ...th, height: AMOUNT_ROW_H }}>登録番号</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td
                colSpan={8}
                style={{
                  ...cell,
                  textAlign: "center",
                  color: "#666666",
                  padding: "4mm",
                }}
              >
                明細がありません
              </td>
            </tr>
          ) : (
            items.map((it) => {
              const { exclusiveYen, taxYen } = lineTax(it);
              const invLabel = it.hasInvoice ? "有" : "無";
              const invNo =
                it.hasInvoice && it.invoiceNumber
                  ? it.invoiceNumber
                  : "—";

              return (
                <React.Fragment key={it.id}>
                  <tr>
                    <td style={sideSpan} rowSpan={2}>
                      {it.date}
                    </td>
                    <td style={{ ...sideSpan, textAlign: "left" }} rowSpan={2}>
                      {it.category}
                    </td>
                    <td
                      colSpan={5}
                      style={{
                        ...cell,
                        ...textFull,
                        padding: "2mm 2.5mm",
                      }}
                    >
                      {it.description}
                    </td>
                    <td style={sideSpan} rowSpan={2}>
                      {it.hasReceipt ? "有" : "無"}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ ...amountRow, ...yen, fontWeight: 600 }}>
                      {formatPdfYen(it.amount)}
                    </td>
                    <td style={{ ...amountRow, ...yen }}>
                      {formatPdfYen(exclusiveYen)}
                    </td>
                    <td style={{ ...amountRow, ...yen }}>
                      {formatPdfYen(taxYen)}
                    </td>
                    <td
                      style={{
                        ...amountRow,
                        textAlign: "center",
                      }}
                    >
                      {invLabel}
                    </td>
                    <td
                      style={{
                        ...amountRow,
                        ...textFull,
                        fontSize: "7.5pt",
                      }}
                    >
                      {invNo}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })
          )}
        </tbody>
        <tfoot>
          <tr>
            <td
              colSpan={2}
              style={{
                ...sideSpan,
                textAlign: "right",
                fontWeight: 700,
                verticalAlign: "middle",
                ...footLine,
              }}
            >
              合計
            </td>
            <td
              style={{
                ...amountRow,
                ...yen,
                fontWeight: 700,
                ...footLine,
              }}
            >
              {formatPdfYen(totals.inclusive || sumInclusive)}
            </td>
            <td
              style={{
                ...amountRow,
                ...yen,
                fontWeight: 700,
                ...footLine,
              }}
            >
              {formatPdfYen(totals.exclusive)}
            </td>
            <td
              style={{
                ...amountRow,
                ...yen,
                fontWeight: 700,
                ...footLine,
              }}
            >
              {formatPdfYen(totals.tax)}
            </td>
            <td style={{ ...amountRow, ...footLine }} />
            <td style={{ ...amountRow, ...footLine }} />
            <td style={{ ...sideSpan, ...footLine }} />
          </tr>
        </tfoot>
      </table>
      {footer}
    </div>
  );
}
