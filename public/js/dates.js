export const FIRST_APOD_DATE = "1995-06-16";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value) {
  return typeof value === "string" && ISO_DATE.test(value) && !Number.isNaN(Date.parse(value));
}

export function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function formatJapaneseDate(isoDate) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  return `${date.getUTCFullYear()}年${date.getUTCMonth() + 1}月${date.getUTCDate()}日（${WEEKDAYS[date.getUTCDay()]}）`;
}

export function randomDateBetween(start, end) {
  const from = Date.parse(start);
  const to = Date.parse(end);
  return new Date(from + Math.random() * (to - from)).toISOString().slice(0, 10);
}
