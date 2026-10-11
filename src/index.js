const APOD_URL = "https://science.nasa.gov/wp-json/wp/v2/apod-basic";
const DEFAULT_APOD_COUNT = 8;
const FIRST_APOD_DATE = new Date("1995-06-16");
const PLACEHOLDER_IMAGE = "news-thumbnail.png";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/apod") {
      return handleApod(url);
    }
    if (url.pathname === "/api/apods/random") {
      return handleApods();
    }
    return new Response("Not Found", { status: 404 });
  },
};

// "10/01/2025" (MM/DD/YYYY) → "251001" (YYMMDD)
function convertDate(input) {
  const match = input.match(/^(\d{2})\/(\d{2})\/\d{2}(\d{2})$/);
  if (!match) {
    return null;
  }
  const [, month, day, year] = match;
  return `${year}${month}${day}`;
}

// Date → "251001" (YYMMDD)
function toApodId(date) {
  return date.toISOString().slice(2, 10).replaceAll("-", "");
}

function randomApodIds(count) {
  const start = FIRST_APOD_DATE.getTime();
  const end = Date.now();
  const ids = [];
  for (let i = 0; i < count; i++) {
    const time = start + Math.random() * (end - start);
    ids.push(toApodId(new Date(time)));
  }
  return ids;
}

// basic_html の中から <tag src="..."> の src を取り出す
function findSrc(html, tag) {
  const match = html.match(new RegExp(`<${tag}[^>]+src="([^"]+)"`, "i"));
  if (!match) {
    return null;
  }
  const src = match[1].replaceAll("&#038;", "&");
  return src.startsWith("//") ? `https:${src}` : src;
}

// 移行で壊れたデータを、basic_html に残っている本物のURLで補正する
function normalizeApod(apod) {
  const html = apod.basic_html ?? "";

  const videoUrl = findSrc(html, "iframe");
  if (videoUrl) {
    return { ...apod, url: videoUrl, hdurl: "" };
  }

  if (apod.hdurl?.includes(PLACEHOLDER_IMAGE)) {
    const imageUrl = findSrc(html, "img");
    if (imageUrl) {
      return { ...apod, url: imageUrl, hdurl: imageUrl };
    }
  }
  return apod;
}

async function fetchApod(path = "") {
  const res = await fetch(APOD_URL + path);
  if (!res.ok) {
    throw new Error(`NASA API returns non 200 status: ${res.status}`);
  }
  return res.json();
}

async function handleApod(url) {
  const date = url.searchParams.get("date");

  try {
    if (!date) {
      const latest = await fetchApod();
      return Response.json({ apod: normalizeApod(latest[0]) });
    }

    const id = convertDate(date);
    if (!id) {
      return new Response("Bad Request", { status: 400 });
    }
    const apod = await fetchApod(`/${id}`);
    return Response.json({ apod: normalizeApod(apod) });
  } catch (err) {
    console.error("Error fetching APOD data", err);
    return new Response("Service Unavailable", { status: 503 });
  }
}

async function handleApods() {
  const ids = randomApodIds(DEFAULT_APOD_COUNT);
  const results = await Promise.allSettled(ids.map((id) => fetchApod(`/${id}`)));
  const apods = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => normalizeApod(result.value));

  if (apods.length === 0) {
    return new Response("Service Unavailable", { status: 503 });
  }
  return Response.json({ apods });
}
