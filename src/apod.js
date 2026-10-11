import { toApodId, todayIso } from "./dates.js";
import {
  cleanAlt,
  cleanCredit,
  cleanExplanation,
  safeImageUrl,
  safePageUrl,
  safeVideoUrl,
  toPlainText,
} from "./sanitize.js";

const APOD_URL = "https://science.nasa.gov/wp-json/wp/v2/apod-basic";
const PLACEHOLDER_IMAGE = "news-thumbnail.png";
const MAX_ATTEMPTS = 4;
const LATEST_CACHE_SECONDS = 15 * 60;

export class NotFoundError extends Error {}
export class UpstreamError extends Error {}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// NASA 側のボット判定で 403 が返ることがあるので、待ち時間を延ばしながら取り直す
async function fetchJson(path, { retryDelayMs = 1000 } = {}) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(APOD_URL + path, {
      headers: { "User-Agent": "space-app (+https://space-app.stsh.workers.dev)" },
    });
    if (res.ok) {
      return res.json();
    }
    if (res.status === 404) {
      throw new NotFoundError(`No APOD for ${path}`);
    }
    if (attempt >= MAX_ATTEMPTS) {
      throw new UpstreamError(`NASA API returned ${res.status}`);
    }
    await sleep(retryDelayMs * attempt);
  }
}

function findSrc(html, tag) {
  const match = html.match(new RegExp(`<${tag}[^>]+src="([^"]+)"`, "i"));
  return match ? match[1] : null;
}

function withWidth(url, width) {
  const parsed = new URL(url);
  parsed.search = "";
  parsed.searchParams.set("w", String(width));
  return parsed.href;
}

// NASA の生データを、フロントエンドが安全にそのまま使える形にする
export function normalizeApod(raw) {
  const html = typeof raw.basic_html === "string" ? raw.basic_html : "";

  let mediaType = "other";
  let image = null;
  let videoUrl = null;

  const iframeSrc = findSrc(html, "iframe");
  if (iframeSrc) {
    videoUrl = safeVideoUrl(iframeSrc);
    mediaType = videoUrl ? "video" : "other";
  } else {
    // 移行で画像が NASA のロゴに置き換わった回は、basic_html に残る本物の画像を使う
    const hd = typeof raw.hdurl === "string" && !raw.hdurl.includes(PLACEHOLDER_IMAGE)
      ? raw.hdurl
      : findSrc(html, "img");
    const imageUrl = safeImageUrl(hd);
    if (imageUrl) {
      mediaType = "image";
      image = {
        full: withWidth(imageUrl, 2048),
        large: withWidth(imageUrl, 1280),
        thumb: withWidth(imageUrl, 640),
      };
    }
  }

  return {
    date: raw.date,
    title: toPlainText(raw.title),
    explanation: cleanExplanation(raw.explanation),
    credit: cleanCredit(raw.credit || raw.copyright),
    alt: cleanAlt(raw.alt),
    mediaType,
    image,
    videoUrl,
    pageUrl: safePageUrl(raw.permalink),
  };
}

async function readCache(env, key) {
  if (!env.APOD_CACHE) {
    return null;
  }
  try {
    return await env.APOD_CACHE.get(key, "json");
  } catch {
    return null;
  }
}

function writeCache(env, ctx, key, value, options) {
  if (!env.APOD_CACHE) {
    return;
  }
  // 書き込みの失敗（無料枠の上限など）で応答を失敗させない
  const write = env.APOD_CACHE.put(key, JSON.stringify(value), options).catch(() => {});
  ctx?.waitUntil?.(write);
}

export async function getApodByDate(isoDate, env = {}, ctx, options) {
  const key = `apod:v1:${isoDate}`;
  const cached = await readCache(env, key);
  if (cached) {
    return cached;
  }

  const apod = normalizeApod(await fetchJson(`/${toApodId(isoDate)}`, options));
  // 過去の APOD は変わらないので期限なしで保存する。今日の分は差し替えに備えて短めに
  const isToday = isoDate >= todayIso();
  writeCache(env, ctx, key, apod, isToday ? { expirationTtl: LATEST_CACHE_SECONDS } : undefined);
  return apod;
}

export async function getLatestApod(env = {}, ctx, options) {
  const key = "apod:v1:latest";
  const cached = await readCache(env, key);
  if (cached) {
    return cached;
  }

  const list = await fetchJson("?per_page=1", options);
  if (!Array.isArray(list) || list.length === 0) {
    throw new UpstreamError("NASA API returned an empty list");
  }
  const apod = normalizeApod(list[0]);
  writeCache(env, ctx, key, apod, { expirationTtl: LATEST_CACHE_SECONDS });
  return apod;
}
