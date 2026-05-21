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
const ROW_H = "7.2mm";
const BLOCK_H = "14.4mm";

export const settlementPdfPageStyle: CSSProperties = {
  width: "210mm",
  minHeight: "297mm",
  boxSizing: "border-box",
  padding: "10mm 12mm 12mm",
  backgroundColor: "#ffffff",
  color: "#000000",
  fontSize: "9pt",
  lineHeight: 1.25,
};

const cell: CSSProperties = {
  border: BORDER,
  padding: "1mm 1.5mm",
  verticalAlign: "middle",
  overflow: "hidden",
  boxSizing: "border-box",
};

const line1: CSSProperties = {
  ...cell,
  height: ROW_H,
  maxHeight: ROW_H,
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
};

const line2: CSSProperties = {
  ...cell,
  height: ROW_H,
  maxHeight: ROW_H,
  fontSize: "8pt",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
};

const span2: CSSProperties = {
  ...cell,
  height: BLOCK_H,
  maxHeight: BLOCK_H,
  verticalAlign: "middle",
};

const th: CSSProperties = {
  ...cell,
  backgroundColor: "#f0f0f0",
  fontWeight: 700,
  textAlign: "center",
  fontSize: "8pt",
  whiteSpace: "nowrap",
};

const thTall: CSSProperties = { ...th, height: BLOCK_H };
const thShort: CSSProperties = { ...th, height: ROW_H };

const yen: CSSProperties = {
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
};

const footLine: CSSProperties = { borderTop: "2px solid #000000" };

const line2Spacer: CSSProperties = {
  ...line2,
  backgroundColor: "#fafafa",
  borderTop: "none",
};

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
    <header style={{ marginBottom: "5mm" }}>
      <div style={{ position: "relative", minHeight: "16mm", marginBottom: "2mm" }}>
        {PDF_COMPANY_NAME ? (
          <p
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              margin: 0,
              fontSize: "10pt",
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            {PDF_COMPANY_NAME}
          </p>
        ) : null}
        <div style={{ textAlign: "center", padding: "0 28mm" }}>
          <p
            style={{
              margin: 0,
              fontSize: "13pt",
              fontWeight: 700,
              letterSpacing: "0.04em",
            }}
          >
            {title}
          </p>
          <p style={{ margin: "2.5mm 0 0", fontSize: "9.5pt" }}>
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
 * 9列: 日付 | 区分 | 摘要 | 税込 | 税抜 | 消費税 | インボイス | 番号 | 領収
 * 1行目: 日付・区分・摘要・税込・領収（縦結合）
 * 2行目: 税抜・消費税・インボイス・番号
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
          <col style={{ width: "9%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "26%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "17%" }} />
          <col style={{ width: "5%" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={thTall} rowSpan={2}>
              日付
            </th>
            <th style={thTall} rowSpan={2}>
              区分
            </th>
            <th style={thShort}>摘要</th>
            <th style={thShort}>金額（税込）</th>
            <th colSpan={4} style={thShort} />
            <th style={thTall} rowSpan={2}>
              領収
            </th>
          </tr>
          <tr>
            <th colSpan={2} style={{ ...thShort, backgroundColor: "#f0f0f0" }} />
            <th style={thShort}>税抜金額</th>
            <th style={thShort}>消費税額</th>
            <th style={thShort}>インボイス</th>
            <th style={thShort}>登録番号</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td
                colSpan={9}
                style={{
                  ...cell,
                  height: BLOCK_H,
                  textAlign: "center",
                  color: "#666666",
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
                    <td
                      style={{ ...span2, textAlign: "center", fontSize: "8.5pt" }}
                      rowSpan={2}
                    >
                      {it.date}
                    </td>
                    <td style={{ ...span2, fontSize: "8.5pt" }} rowSpan={2}>
                      {it.category}
                    </td>
                    <td style={line1} title={it.description}>
                      {it.description}
                    </td>
                    <td style={{ ...line1, ...yen, fontWeight: 600 }}>
                      {formatPdfYen(it.amount)}
                    </td>
                    <td colSpan={4} style={line1} />
                    <td
                      style={{ ...span2, textAlign: "center", fontSize: "8.5pt" }}
                      rowSpan={2}
                    >
                      {it.hasReceipt ? "有" : "無"}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2} style={line2Spacer} />
                    <td style={{ ...line2, ...yen }}>
                      {formatPdfYen(exclusiveYen)}
                    </td>
                    <td style={{ ...line2, ...yen }}>{formatPdfYen(taxYen)}</td>
                    <td style={{ ...line2, textAlign: "center" }}>{invLabel}</td>
                    <td style={line2} title={invNo}>
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
              rowSpan={2}
              style={{
                ...span2,
                textAlign: "right",
                fontWeight: 700,
                ...footLine,
              }}
            >
              合計
            </td>
            <td style={{ ...line1, ...footLine }} />
            <td
              style={{
                ...line1,
                ...yen,
                fontWeight: 700,
                ...footLine,
              }}
            >
              {formatPdfYen(totals.inclusive || sumInclusive)}
            </td>
            <td colSpan={4} style={{ ...line1, ...footLine }} />
            <td rowSpan={2} style={{ ...span2, ...footLine }} />
          </tr>
          <tr>
            <td colSpan={2} style={{ ...line2Spacer, ...footLine }} />
            <td style={{ ...line2, ...yen, fontWeight: 700, ...footLine }}>
              {formatPdfYen(totals.exclusive)}
            </td>
            <td style={{ ...line2, ...yen, fontWeight: 700, ...footLine }}>
              {formatPdfYen(totals.tax)}
            </td>
            <td style={{ ...line2, ...footLine }} />
            <td style={{ ...line2, ...footLine }} />
          </tr>
        </tfoot>
      </table>
      {footer}
    </div>
  );
}
