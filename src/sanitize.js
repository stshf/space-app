const NAMED_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  deg: "°",
  times: "×",
};

function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, body) => {
    if (body[0] === "#") {
      const code = body[1].toLowerCase() === "x"
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : "";
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? entity;
  });
}

// NASA から届く HTML をタグなしの文字列にする。
// 画面には textContent で入れるので、ここで残った記号がスクリプトとして動くことはない。
export function toPlainText(html) {
  if (typeof html !== "string") {
    return "";
  }
  const withoutBlocks = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ");
  // 改行にあたるタグは空白に、<a> や <b> のような文中のタグは何も残さずに消す
  const withoutTags = withoutBlocks
    .replace(/<(br|\/?p|\/?div|\/?li|\/?h\d)\b[^>]*>/gi, " ")
    .replace(/<[^>]*>/g, "");
  return decodeEntities(withoutTags)
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?)])/g, "$1")
    .trim();
}

// 古い APOD の alt は「See Explanation. Clicking on the picture...」という定型文なので使わない
export function cleanAlt(html) {
  const text = toPlainText(html);
  return /^see explanation/i.test(text) ? "" : text;
}

export function cleanExplanation(html) {
  return toPlainText(html).replace(/^Explanation:\s*/i, "");
}

export function cleanCredit(html) {
  return toPlainText(html)
    .replace(/^(image|video|illustration|animation)?\s*credits?\s*(&|and)?\s*(copyright)?\s*:\s*/i, "")
    .replace(/^copyright\s*:\s*/i, "");
}

const IMAGE_HOSTS = ["assets.science.nasa.gov", "science.nasa.gov", "apod.nasa.gov"];
const PAGE_HOSTS = ["science.nasa.gov", "apod.nasa.gov"];

function parseUrl(value) {
  if (typeof value !== "string" || value === "") {
    return null;
  }
  try {
    const url = new URL(value.startsWith("//") ? `https:${value}` : value);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function hostIn(url, hosts) {
  return hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
}

export function safeImageUrl(value) {
  const url = parseUrl(value);
  return url && hostIn(url, IMAGE_HOSTS) ? url.href : null;
}

export function safePageUrl(value) {
  const url = parseUrl(value);
  return url && hostIn(url, PAGE_HOSTS) ? url.href : null;
}

// 埋め込みを許すのは YouTube と Vimeo のプレーヤーだけ
export function safeVideoUrl(value) {
  const url = parseUrl(typeof value === "string" ? value.replaceAll("&#038;", "&") : value);
  if (!url) {
    return null;
  }
  const youtube = url.pathname.match(/^\/embed\/([\w-]{6,})/);
  if (youtube && /(^|\.)youtube(-nocookie)?\.com$/.test(url.hostname)) {
    return `https://www.youtube-nocookie.com/embed/${youtube[1]}`;
  }
  const vimeo = url.pathname.match(/^\/video\/(\d+)/);
  if (vimeo && url.hostname === "player.vimeo.com") {
    return `https://player.vimeo.com/video/${vimeo[1]}`;
  }
  return null;
}
