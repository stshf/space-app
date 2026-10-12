import { formatJapaneseDate } from "./dates.js";
import { h } from "./dom.js";
import { serialOf } from "./observatory-model.js";

const kindOf = (apod) => (apod.mediaType === "image" ? "Image" : apod.mediaType === "video" ? "Video" : "Other");

export function metaLine(apod) {
  return `No. ${serialOf(apod.date).toLocaleString("en-US")} · ${kindOf(apod)} · ${apod.date}`;
}

function media(apod, { priority = false } = {}) {
  if (apod.mediaType === "image" && apod.image) {
    return h(
      "a",
      {
        href: apod.image.full,
        target: "_blank",
        rel: "noopener noreferrer",
        class: "media block",
        "aria-label": "高解像度の画像を新しいタブで開く",
      },
      h("img", {
        src: apod.image.large,
        srcset: `${apod.image.thumb} 640w, ${apod.image.large} 1280w, ${apod.image.full} 2048w`,
        sizes: "(min-width: 760px) 720px, 100vw",
        alt: apod.alt || apod.title,
        class: "mx-auto max-h-[75vh] w-full object-contain",
        decoding: "async",
        fetchpriority: priority ? "high" : null,
        loading: priority ? null : "lazy",
      }),
    );
  }

  if (apod.mediaType === "video" && apod.videoUrl) {
    return h(
      "div",
      { class: "media aspect-video w-full" },
      h("iframe", {
        src: apod.videoUrl,
        title: apod.title,
        class: "size-full",
        loading: "lazy",
        allow: "fullscreen; picture-in-picture",
        referrerpolicy: "strict-origin-when-cross-origin",
      }),
    );
  }

  return h(
    "div",
    { class: "media grid aspect-video place-items-center p-8 text-center" },
    h(
      "div",
      { class: "space-y-3" },
      h("p", { class: "text-sm text-muted" }, "この日の APOD は、ここでは表示できない形式です。"),
      apod.pageUrl
        ? h("a", { href: apod.pageUrl, target: "_blank", rel: "noopener noreferrer", class: "btn" }, "NASA のページで見る")
        : null,
    ),
  );
}

export function renderDetail(apod, { priority = false, headingId, actions = [] } = {}) {
  return h(
    "div",
    {},
    media(apod, { priority }),
    apod.credit ? h("p", { class: "mt-2.5 text-[13px] text-muted" }, `Credit: ${apod.credit}`) : null,
    h("h2", { id: headingId, class: "mt-6 text-[18px] font-medium leading-snug" }, apod.title),
    h("p", { class: "meta text-[15px]" }, `${metaLine(apod)} · ${formatJapaneseDate(apod.date)}`),
    h("p", { class: "mt-6 text-[17px] leading-[1.65]", lang: "en" }, apod.explanation),
    h("p", { class: "mt-2 text-[13px] text-muted" }, "解説（英語・NASA より）"),
    h(
      "div",
      { class: "mt-6 flex flex-wrap gap-2", "aria-label": "この写真について" },
      ...actions,
      apod.image
        ? h("a", { href: apod.image.full, target: "_blank", rel: "noopener noreferrer", class: "btn" }, "高解像度で見る")
        : null,
      apod.pageUrl
        ? h("a", { href: apod.pageUrl, target: "_blank", rel: "noopener noreferrer", class: "btn" }, "NASA のページで見る")
        : null,
    ),
  );
}

export function renderDetailSkeleton() {
  return h(
    "div",
    {},
    h("div", { class: "skeleton aspect-video" }),
    h(
      "div",
      { class: "mt-6 space-y-4" },
      h("div", { class: "skeleton h-5 w-3/4" }),
      h("div", { class: "skeleton h-3 w-40" }),
      h("div", { class: "skeleton h-4 w-full" }),
      h("div", { class: "skeleton h-4 w-5/6" }),
      h("div", { class: "skeleton h-4 w-2/3" }),
    ),
  );
}

export function renderError(message, { onRetry, onLatest } = {}) {
  return h(
    "div",
    { class: "grid min-h-60 place-items-center rounded-xl border border-line bg-card p-8 text-center", role: "alert" },
    h(
      "div",
      { class: "max-w-md space-y-5" },
      h("p", { class: "leading-relaxed text-alert" }, message),
      h(
        "div",
        { class: "flex flex-wrap justify-center gap-2" },
        onRetry ? h("button", { type: "button", class: "btn btn-primary", onclick: onRetry }, "もう一度試す") : null,
        onLatest ? h("button", { type: "button", class: "btn", onclick: onLatest }, "最新の写真を見る") : null,
      ),
    ),
  );
}

export function renderCard(apod, onOpen, onAim) {
  const thumbnail = apod.mediaType === "image" && apod.image
    ? h("img", {
        src: apod.image.thumb,
        alt: apod.alt || apod.title,
        class: "aspect-video w-full object-cover",
        loading: "lazy",
        decoding: "async",
      })
    : h(
        "div",
        { class: "grid aspect-video place-items-center" },
        h("span", { class: "text-sm text-muted" }, apod.mediaType === "video" ? "▶ 動画" : "インタラクティブ"),
      );

  const aim = onAim ? () => onAim(apod) : null;
  return h(
    "button",
    { type: "button", class: "card", onclick: () => onOpen(apod), onpointerenter: aim, onfocus: aim },
    h("div", { class: "media" }, thumbnail),
    h("p", { class: "mt-3 text-[13px] text-muted" }, metaLine(apod)),
    h("h3", { class: "mt-0.5 line-clamp-2 text-[15px] font-medium leading-snug" }, apod.title),
  );
}

export function renderCardSkeleton() {
  return h(
    "div",
    {},
    h("div", { class: "skeleton aspect-video" }),
    h("div", { class: "mt-3 space-y-2" }, h("div", { class: "skeleton h-3 w-32" }), h("div", { class: "skeleton h-4 w-full" })),
  );
}
