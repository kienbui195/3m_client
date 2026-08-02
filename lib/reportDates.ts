// Khoảng ngày cho báo cáo (ISO string, UTC) - dùng chung cho widget trang chủ
// và trang /reports.
export function lastNMonthsRange(n: number) {
  const now = new Date();
  const to = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59));
  const from = new Date(Date.UTC(now.getFullYear(), now.getMonth() - (n - 1), 1));
  return { from: from.toISOString(), to: to.toISOString() };
}

export function monthRange(month: number, year: number) {
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 0, 23, 59, 59));
  return { from: from.toISOString(), to: to.toISOString() };
}

// "2026-08" -> "Th8/2026", "2026" -> "2026", "2026-08-01" -> "01/08"
export function formatPeriodLabel(period: string) {
  const parts = period.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  if (parts.length === 2) return `Th${Number(parts[1])}/${parts[0]}`;
  return period;
}
