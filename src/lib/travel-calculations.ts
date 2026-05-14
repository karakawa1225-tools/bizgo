/** 役員日当（1日） */
export const PER_DIEM_EXECUTIVE_YEN = 3500;
/** 一般社員日当（1日） — 定義として保持 */
export const PER_DIEM_STAFF_YEN = 2000;

/** 出張日数（暦日・当日を含む） */
export function countTravelDaysInclusive(startIso: string, endIso: string): number {
  const a = parseLocalDate(startIso);
  const b = parseLocalDate(endIso);
  if (Number.isNaN(+a) || Number.isNaN(+b)) return 1;
  const start = a <= b ? a : b;
  const end = a <= b ? b : a;
  const diffMs = end.getTime() - start.getTime();
  return Math.max(1, Math.floor(diffMs / 86400000) + 1);
}

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** 片道100km超 OR 宿泊あり → 日当を支給 */
export function isPerDiemEligible(
  distanceKmOneWay: number,
  hasOvernight: boolean,
): boolean {
  return distanceKmOneWay > 100 || hasOvernight === true;
}

export function perDiemRateYen(executive: boolean): number {
  return executive ? PER_DIEM_EXECUTIVE_YEN : PER_DIEM_STAFF_YEN;
}

export type TravelDerived = {
  travelDays: number;
  perDiemRateYen: number;
  perDiemEligible: boolean;
  perDiemTotalYen: number;
};

export function deriveTravelAmounts(
  startDate: string,
  endDate: string,
  distanceKmOneWay: number | null | undefined,
  hasOvernight: boolean | null | undefined,
  executivePerDiem: boolean | null | undefined,
): TravelDerived {
  const travelDays = countTravelDaysInclusive(startDate, endDate);
  const dist = Number(distanceKmOneWay) || 0;
  const overnight = hasOvernight === true;
  const executive = executivePerDiem !== false;
  const rate = perDiemRateYen(executive);
  const eligible = isPerDiemEligible(dist, overnight);
  const perDiemTotalYen = eligible ? travelDays * rate : 0;
  return {
    travelDays,
    perDiemRateYen: rate,
    perDiemEligible: eligible,
    perDiemTotalYen,
  };
}

/** YYYY-MM から当月の初日・末日 */
export function monthBounds(ym: string): { start: string; end: string } {
  const [ys, ms] = ym.split("-");
  const y = Number(ys);
  const m = Number(ms);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    const t = new Date();
    return monthBounds(
      `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  const last = new Date(y, m, 0).getDate();
  return {
    start: `${y}-${String(m).padStart(2, "0")}-01`,
    end: `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`,
  };
}
