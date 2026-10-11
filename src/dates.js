export const FIRST_APOD_DATE = "1995-06-16";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
// 旧フロントエンドとの互換用
const US_DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

// "2015-07-14" か "07/14/2015" を受け取り、実在する日付なら "2015-07-14" を返す
export function parseDate(input) {
  if (typeof input !== "string") {
    return null;
  }

  let year;
  let month;
  let day;
  const iso = input.match(ISO_DATE);
  const us = input.match(US_DATE);
  if (iso) {
    [, year, month, day] = iso;
  } else if (us) {
    [, month, day, year] = us;
  } else {
    return null;
  }

  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  // 13月や2月30日のような存在しない日付は、Date が繰り上げるので一致しなくなる
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return null;
  }
  return `${year}-${month}-${day}`;
}

// "2015-07-14" → "150714"（NASA の apod-basic が使う形式）
export function toApodId(isoDate) {
  return isoDate.slice(2).replaceAll("-", "");
}

export function todayIso(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function isInApodRange(isoDate, now = new Date()) {
  return isoDate >= FIRST_APOD_DATE && isoDate <= todayIso(now);
}

export function randomIsoDates(count, now = new Date(), random = Math.random) {
  const start = Date.parse(FIRST_APOD_DATE);
  const end = now.getTime();
  const dates = new Set();
  // 同じ日付が重ならないように、必要な数がそろうまで引く
  while (dates.size < count) {
    const time = start + random() * (end - start);
    dates.add(new Date(time).toISOString().slice(0, 10));
  }
  return [...dates];
}
