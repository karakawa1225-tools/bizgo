/** DB / localStorage 用。金額は税込（円・整数）とみなす */
export type ConsumptionTaxRateKey = "0" | "8" | "10";

export const CONSUMPTION_TAX_OPTIONS: {
  value: ConsumptionTaxRateKey;
  label: string;
}[] = [
  { value: "0", label: "消費税０％（非課税）" },
  { value: "8", label: "８％（軽減税率）" },
  { value: "10", label: "１０％" },
];

export function isConsumptionTaxRateKey(
  v: unknown,
): v is ConsumptionTaxRateKey {
  return v === "0" || v === "8" || v === "10";
}

/** DB 文字列を区分キーに正規化 */
export function toConsumptionTaxRateKey(
  v: string | null | undefined,
): ConsumptionTaxRateKey {
  return isConsumptionTaxRateKey(v) ? v : "0";
}

export function consumptionTaxRateLabel(
  key: ConsumptionTaxRateKey,
): string {
  const o = CONSUMPTION_TAX_OPTIONS.find((x) => x.value === key);
  return o?.label ?? CONSUMPTION_TAX_OPTIONS[0].label;
}

/**
 * 税込金額から税抜金額と消費税額を求める（端数は税抜側を切り捨て、税額は差し引き）。
 * 10%: 税抜 = floor(税込 × 10 / 11)、8%: 税抜 = floor(税込 × 100 / 108)
 */
export function splitTaxIncludedYen(
  taxIncludedYen: number,
  rate: ConsumptionTaxRateKey,
): { exclusiveYen: number; taxYen: number } {
  const t = Math.trunc(taxIncludedYen);
  if (!Number.isFinite(t) || t < 0) return { exclusiveYen: 0, taxYen: 0 };
  if (rate === "0") return { exclusiveYen: t, taxYen: 0 };
  if (rate === "10") {
    const exclusiveYen = Math.floor((t * 10) / 11);
    return { exclusiveYen, taxYen: t - exclusiveYen };
  }
  const exclusiveYen = Math.floor((t * 100) / 108);
  return { exclusiveYen, taxYen: t - exclusiveYen };
}
