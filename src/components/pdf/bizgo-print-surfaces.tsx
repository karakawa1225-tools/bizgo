"use client";

import * as React from "react";
import { Noto_Sans_JP } from "next/font/google";

import type { ExpenseRecord } from "@/lib/expense-types";
import { deriveTravelAmounts } from "@/lib/travel-calculations";
import { totalYen } from "@/lib/expenses-storage";
import {
  buildMonthlyGeneralRows,
  formatSettlementMonthJa,
} from "@/lib/export-monthly-general";

const noto = Noto_Sans_JP({
  weight: ["400", "700"],
  subsets: ["latin"],
});

const box = "border border-black/80 px-2 py-1 text-sm";
const th = `${box} bg-black/5 font-semibold`;

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
    <div
      ref={ref}
      className={`${noto.className} w-[210mm] bg-white p-8 text-black`}
    >
      <h1 className="text-center text-lg font-bold">出張旅費定義書</h1>
      <p className="mt-2 text-center text-xs text-black/70">
        BizGo — 社内用様式（経理連携前の下書き）
      </p>
      <table className="mt-6 w-full border-collapse border border-black/80 text-sm">
        <tbody>
          <tr>
            <td className={th}>件名（現場・案件）</td>
            <td className={box} colSpan={3}>
              {expense.title}
            </td>
          </tr>
          <tr>
            <td className={th}>出張期間</td>
            <td className={box}>
              {expense.startDate} 〜 {expense.endDate}
            </td>
            <td className={th}>出張日数（暦日）</td>
            <td className={box}>{d.travelDays} 日</td>
          </tr>
          <tr>
            <td className={th}>現場までの片道距離</td>
            <td className={box}>{expense.distanceKmOneWay ?? 0} km</td>
            <td className={th}>宿泊の有無</td>
            <td className={box}>
              {expense.hasOvernight ? "あり" : "なし"}
            </td>
          </tr>
          <tr>
            <td className={th}>日当の要件</td>
            <td className={box} colSpan={3}>
              片道 100km 超 または 宿泊あり のとき支給（会社規程に準ずる）
            </td>
          </tr>
          <tr>
            <td className={th}>日当区分</td>
            <td className={box}>役員（¥3,500／日）</td>
            <td className={th}>要件該当</td>
            <td className={box}>{d.perDiemEligible ? "該当" : "非該当"}</td>
          </tr>
          <tr>
            <td className={th}>日当合計（自動計算）</td>
            <td className={box} colSpan={3}>
              ¥{d.perDiemTotalYen.toLocaleString("ja-JP")}{" "}
              {d.perDiemEligible
                ? `（${d.travelDays} 日 × ¥${d.perDiemRateYen.toLocaleString("ja-JP")}）`
                : ""}
            </td>
          </tr>
        </tbody>
      </table>
      <p className="mt-8 text-xs leading-relaxed text-black/80">
        備考：本書は出張の目的・条件を定義するためのものです。交通宿泊等の実費は別途明細に計上します。
      </p>
      <div className="mt-12 flex justify-end gap-8 text-sm">
        <span>申請者署名：＿＿＿＿＿＿＿＿</span>
        <span>日付：＿＿＿＿＿＿</span>
      </div>
    </div>
  );
});

export const TravelSiteSettlementSurface = React.forwardRef<
  HTMLDivElement,
  { expense: ExpenseRecord }
>(function TravelSiteSettlementSurface({ expense }, ref) {
  const sum = totalYen(expense.items);
  return (
    <div
      ref={ref}
      className={`${noto.className} w-[210mm] bg-white p-8 text-black`}
    >
      <h1 className="text-lg font-bold">出張経費精算（現場単位）</h1>
      <p className="mt-1 text-sm">件名：{expense.title}</p>
      <p className="text-xs text-black/70">
        期間：{expense.startDate} — {expense.endDate}
      </p>
      <table className="mt-4 w-full border-collapse border border-black/80 text-sm">
        <thead>
          <tr>
            <th className={th}>日付</th>
            <th className={th}>区分</th>
            <th className={th}>金額</th>
            <th className={th}>摘要</th>
            <th className={th}>領収</th>
          </tr>
        </thead>
        <tbody>
          {expense.items.map((it) => (
            <tr key={it.id}>
              <td className={box}>{it.date}</td>
              <td className={box}>{it.category}</td>
              <td className={`${box} text-right`}>
                ¥{it.amount.toLocaleString("ja-JP")}
              </td>
              <td className={box}>{it.description}</td>
              <td className={box}>{it.hasReceipt ? "有" : "無"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-right text-base font-bold">
        合計：¥{sum.toLocaleString("ja-JP")}
      </p>
    </div>
  );
});

export const MonthlyGeneralSurface = React.forwardRef<
  HTMLDivElement,
  { expenses: ExpenseRecord[]; ym: string }
>(function MonthlyGeneralSurface({ expenses, ym }, ref) {
  const rows = buildMonthlyGeneralRows(expenses, ym);
  return (
    <div
      ref={ref}
      className={`${noto.className} w-[210mm] bg-white p-8 text-black`}
    >
      <h1 className="text-lg font-bold">経費精算書（月次集計）</h1>
      <p className="text-sm">対象月：{formatSettlementMonthJa(ym)}</p>
      <table className="mt-4 w-full border-collapse border border-black/80 text-xs">
        <thead>
          <tr>
            {rows[0].map((h, i) => (
              <th key={i} className={th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(1).map((r, ri) => (
            <tr key={ri}>
              {r.map((c, ci) => (
                <td key={ci} className={box}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length <= 1 ? (
        <p className="mt-4 text-sm text-black/60">この月の一般経費はありません。</p>
      ) : null}
    </div>
  );
});
