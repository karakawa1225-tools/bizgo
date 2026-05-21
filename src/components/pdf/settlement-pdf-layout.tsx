"use client";

import type { CSSProperties, ReactNode } from "react";

import type { ExpenseItem } from "@/db/schema";
import { formatPdfYen } from "@/lib/pdf-format";
import { PDF_APPLICANT_NAME, PDF_COMPANY_NAME } from "@/lib/pdf-report-meta";

const BORDER = "1px solid #000000";
const ROW_HEIGHT = "7.5mm";

export const settlementPdfPageStyle: CSSProperties = {
  width: "210mm",
  minHeight: "297mm",
  boxSizing: "border-box",
  padding: "10mm 12mm 12mm",
  backgroundColor: "#ffffff",
  color: "#000000",
  fontSize: "9.5pt",
  lineHeight: 1.3,
};

const cellBase: CSSProperties = {
  border: BORDER,
  padding: "1.5mm 2mm",
  height: ROW_HEIGHT,
  maxHeight: ROW_HEIGHT,
  verticalAlign: "middle",
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  boxSizing: "border-box",
};

const thStyle: CSSProperties = {
  ...cellBase,
  backgroundColor: "#f0f0f0",
  fontWeight: 700,
  textAlign: "center",
  fontSize: "9pt",
};

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

export function SettlementLineItemsTable({
  items,
  totalYen: sum,
  footer,
}: TableProps) {
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
          <col style={{ width: "12%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "52%" }} />
          <col style={{ width: "17%" }} />
          <col style={{ width: "5%" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={thStyle}>日付</th>
            <th style={thStyle}>区分</th>
            <th style={thStyle}>摘要</th>
            <th style={thStyle}>金額</th>
            <th style={thStyle}>領収</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                style={{
                  ...cellBase,
                  textAlign: "center",
                  color: "#666666",
                }}
              >
                明細がありません
              </td>
            </tr>
          ) : (
            items.map((it) => (
              <tr key={it.id}>
                <td style={{ ...cellBase, textAlign: "center", fontSize: "9pt" }}>
                  {it.date}
                </td>
                <td style={{ ...cellBase, fontSize: "9pt" }}>{it.category}</td>
                <td
                  style={{
                    ...cellBase,
                    fontSize: "9pt",
                    whiteSpace: "nowrap",
                  }}
                  title={it.description}
                >
                  {it.description}
                </td>
                <td
                  style={{
                    ...cellBase,
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: 600,
                  }}
                >
                  {formatPdfYen(it.amount)}
                </td>
                <td style={{ ...cellBase, textAlign: "center", fontSize: "9pt" }}>
                  {it.hasReceipt ? "有" : "無"}
                </td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr>
            <td
              colSpan={3}
              style={{
                ...cellBase,
                textAlign: "right",
                fontWeight: 700,
                borderTop: "2px solid #000000",
              }}
            >
              合計
            </td>
            <td
              style={{
                ...cellBase,
                textAlign: "right",
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
                borderTop: "2px solid #000000",
                fontSize: "10pt",
              }}
            >
              {formatPdfYen(sum)}
            </td>
            <td
              style={{
                ...cellBase,
                borderTop: "2px solid #000000",
              }}
            />
          </tr>
        </tfoot>
      </table>
      {footer}
    </div>
  );
}
