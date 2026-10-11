import { getApodByDate, getLatestApod, NotFoundError } from "./apod.js";
import { isInApodRange, parseDate, randomIsoDates, todayIso } from "./dates.js";
import { json, jsonError, withSecurityHeaders } from "./http.js";

const GALLERY_COUNT = 8;
// 取得に失敗する日があるので、多めに取りに行って成功した分から使う
const GALLERY_FETCH_COUNT = 12;
const ONE_DAY = 24 * 60 * 60;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method !== "GET" && request.method !== "HEAD") {
      return jsonError(405, "method_not_allowed", "GET only");
    }

    try {
      if (url.pathname === "/api/apod") {
        return await handleApod(url, env, ctx);
      }
      if (url.pathname === "/api/apods/random") {
        return await handleRandom(env, ctx);
      }
      if (url.pathname.startsWith("/api/")) {
        return jsonError(404, "not_found", "Unknown API endpoint");
      }
      if (url.pathname === "/" && env.ASSETS) {
        return await handleIndex(request, url, env, ctx);
      }
    } catch (err) {
      console.error("Unhandled error", err);
      return jsonError(500, "internal_error", "Something went wrong");
    }

    return env.ASSETS ? env.ASSETS.fetch(request) : jsonError(404, "not_found", "Not found");
  },
};

async function handleApod(url, env, ctx) {
  const dateParam = url.searchParams.get("date");

  if (!dateParam) {
    return respondWithApod(() => getLatestApod(env, ctx), 5 * 60);
  }

  const date = parseDate(dateParam);
  if (!date) {
    return jsonError(400, "invalid_date", "date must be YYYY-MM-DD");
  }
  if (!isInApodRange(date)) {
    return jsonError(404, "out_of_range", "APOD exists from 1995-06-16 to today");
  }
  const cacheSeconds = date < todayIso() ? ONE_DAY : 5 * 60;
  return respondWithApod(() => getApodByDate(date, env, ctx), cacheSeconds);
}

async function respondWithApod(load, cacheSeconds) {
  try {
    return json({ apod: await load() }, { cacheSeconds });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return jsonError(404, "not_found", "No APOD for this date");
    }
    console.error("Error fetching APOD", err);
    return jsonError(502, "upstream_error", "NASA API is not responding");
  }
}

async function handleRandom(env, ctx) {
  const dates = randomIsoDates(GALLERY_FETCH_COUNT);
  const results = await Promise.allSettled(
    dates.map((date) => getApodByDate(date, env, ctx, { retryDelayMs: 500 })),
  );
  const apods = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);

  // ギャラリーは写真を優先し、足りなければ動画などで埋める
  const images = apods.filter((apod) => apod.mediaType === "image");
  const others = apods.filter((apod) => apod.mediaType !== "image");
  const picked = [...images, ...others].slice(0, GALLERY_COUNT);

  if (picked.length === 0) {
    return jsonError(502, "upstream_error", "NASA API is not responding");
  }
  return json({ apods: picked });
}

// 共有された /?date=YYYY-MM-DD のリンクに、その日の写真のプレビュー（OGP）を付ける
async function handleIndex(request, url, env, ctx) {
  const page = await env.ASSETS.fetch(request);
  const date = parseDate(url.searchParams.get("date") ?? "");
  if (!date || !isInApodRange(date) || typeof HTMLRewriter === "undefined") {
    return withSecurityHeaders(page, { html: true });
  }

  let apod;
  try {
    apod = await getApodByDate(date, env, ctx);
  } catch {
    return withSecurityHeaders(page, { html: true });
  }

  const title = `${apod.title} — SPACE APP`;
  const description = apod.explanation.length > 120
    ? `${apod.explanation.slice(0, 120)}…`
    : apod.explanation;
  const meta = {
    "og:title": title,
    "og:description": description,
    "og:url": `${url.origin}/?date=${date}`,
    "og:image": apod.image?.large,
    "twitter:title": title,
    "twitter:description": description,
    "twitter:image": apod.image?.large,
    description,
  };

  const rewritten = new HTMLRewriter()
    .on("title", {
      element(element) {
        element.setInnerContent(title);
      },
    })
    .on("meta", {
      element(element) {
        const key = element.getAttribute("property") ?? element.getAttribute("name");
        if (key && meta[key]) {
          element.setAttribute("content", meta[key]);
        }
      },
    })
    .transform(page);

  return withSecurityHeaders(rewritten, { html: true });
}
