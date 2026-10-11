import { formatJapaneseDate } from "./dates.js";
import { h } from "./dom.js";

function media(apod, { priority = false } = {}) {
  if (apod.mediaType === "image" && apod.image) {
    return h(
      "a",
      {
        href: apod.image.full,
        target: "_blank",
        rel: "noopener noreferrer",
        class: "block bg-black/40",
        "aria-label": "高解像度の画像を新しいタブで開く",
      },
      h("img", {
        src: apod.image.large,
        srcset: `${apod.image.thumb} 640w, ${apod.image.large} 1280w, ${apod.image.full} 2048w`,
        sizes: "(min-width: 1024px) 1024px, 100vw",
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
      { class: "aspect-video w-full bg-black" },
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
    { class: "grid aspect-video place-items-center bg-gradient-to-br from-space-800 to-space-900 p-8 text-center" },
    h(
      "div",
      { class: "space-y-3" },
      h("p", { class: "text-sm text-star/70" }, "この日の APOD は、ここでは表示できない形式です。"),
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
    h(
      "div",
      { class: "grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_16rem]" },
      h(
        "div",
        { class: "min-w-0" },
        h("p", { class: "meta-label" }, formatJapaneseDate(apod.date)),
        h("h2", { id: headingId, class: "mt-2 text-2xl font-bold leading-tight sm:text-3xl" }, apod.title),
        apod.credit ? h("p", { class: "mt-2 text-sm text-star/60" }, `Credit: ${apod.credit}`) : null,
        h(
          "div",
          { class: "mt-6 border-t border-white/10 pt-6" },
          h("p", { class: "mb-2 text-xs text-star/50" }, "解説（英語・NASA より）"),
          h("p", { class: "leading-relaxed text-star/85", lang: "en" }, apod.explanation),
        ),
      ),
      h(
        "aside",
        { class: "flex flex-col gap-2 lg:pt-7", "aria-label": "この写真について" },
        ...actions,
        apod.image
          ? h("a", { href: apod.image.full, target: "_blank", rel: "noopener noreferrer", class: "btn" }, "高解像度で見る")
          : null,
        apod.pageUrl
          ? h("a", { href: apod.pageUrl, target: "_blank", rel: "noopener noreferrer", class: "btn" }, "NASA のページで見る")
          : null,
      ),
    ),
  );
}

export function renderDetailSkeleton() {
  return h(
    "div",
    {},
    h("div", { class: "skeleton aspect-video rounded-none" }),
    h(
      "div",
      { class: "space-y-4 p-6 sm:p-8" },
      h("div", { class: "skeleton h-3 w-40" }),
      h("div", { class: "skeleton h-8 w-3/4" }),
      h("div", { class: "skeleton h-4 w-full" }),
      h("div", { class: "skeleton h-4 w-5/6" }),
      h("div", { class: "skeleton h-4 w-2/3" }),
    ),
  );
}

export function renderError(message, { onRetry, onLatest } = {}) {
  return h(
    "div",
    { class: "grid min-h-80 place-items-center p-8 text-center", role: "alert" },
    h(
      "div",
      { class: "max-w-md space-y-5" },
      h("p", { class: "text-4xl", "aria-hidden": "true" }, "🔭"),
      h("p", { class: "leading-relaxed text-star/80" }, message),
      h(
        "div",
        { class: "flex flex-wrap justify-center gap-2" },
        onRetry ? h("button", { type: "button", class: "btn btn-primary", onclick: onRetry }, "もう一度試す") : null,
        onLatest ? h("button", { type: "button", class: "btn", onclick: onLatest }, "最新の写真を見る") : null,
      ),
    ),
  );
}

export function renderCard(apod, onOpen) {
  const thumbnail = apod.mediaType === "image" && apod.image
    ? h("img", {
        src: apod.image.thumb,
        alt: apod.alt || apod.title,
        class: "aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105",
        loading: "lazy",
        decoding: "async",
      })
    : h(
        "div",
        { class: "grid aspect-[4/3] place-items-center bg-gradient-to-br from-nebula/30 to-space-800" },
        h("span", { class: "rounded-full bg-black/40 px-4 py-2 text-sm" }, apod.mediaType === "video" ? "▶ 動画" : "インタラクティブ"),
      );

  return h(
    "button",
    { type: "button", class: "card group", onclick: () => onOpen(apod) },
    h("div", { class: "overflow-hidden" }, thumbnail),
    h(
      "div",
      { class: "space-y-1 p-4" },
      h("p", { class: "text-xs text-accent" }, formatJapaneseDate(apod.date)),
      h("p", { class: "line-clamp-2 font-semibold leading-snug" }, apod.title),
    ),
  );
}

export function renderCardSkeleton() {
  return h(
    "div",
    { class: "overflow-hidden rounded-2xl border border-white/10" },
    h("div", { class: "skeleton aspect-[4/3] rounded-none" }),
    h("div", { class: "space-y-2 p-4" }, h("div", { class: "skeleton h-3 w-24" }), h("div", { class: "skeleton h-4 w-full" })),
  );
}
