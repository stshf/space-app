import { describeError, fetchApod, fetchRandomApods } from "./api.js";
import { addDays, FIRST_APOD_DATE, formatJapaneseDate, isIsoDate, randomDateBetween } from "./dates.js";
import { h } from "./dom.js";
import { mountObservatory } from "./observatory.js";
import { serialOf } from "./observatory-model.js";
import { renderCard, renderCardSkeleton, renderDetail, renderDetailSkeleton, renderError } from "./render.js";

const $ = (id) => document.getElementById(id);

const elements = {
  todayView: $("today-view"),
  galleryView: $("gallery-view"),
  detail: $("apod-detail"),
  gallery: $("gallery"),
  dateInput: $("date-input"),
  prev: $("prev-day"),
  next: $("next-day"),
  latest: $("latest-day"),
  random: $("random-day"),
  shuffle: $("shuffle"),
  dialog: $("detail-dialog"),
  dialogBody: $("dialog-body"),
  dialogClose: $("dialog-close"),
  status: $("status"),
  crumb: $("crumb-current"),
  metaLine: $("meta-line"),
  requestLine: $("request-line"),
  copyRequest: $("copy-request"),
};

const state = {
  view: "today",
  date: null, // null は「最新」
  latestDate: null,
  shownDate: null,
};

let detailRequest = null;
let galleryRequest = null;

const observatory = mountObservatory(document.getElementById("observatory"), {
  readout: document.querySelector("[data-readout]"),
  onPick: (date) => goToDate(date),
});

function setRequest(path) {
  elements.requestLine.textContent = `GET ${path}`;
}

function announce(message) {
  elements.status.textContent = message;
}

// ---- URL と状態 ----------------------------------------------------------

function readUrl() {
  const params = new URLSearchParams(location.search);
  const date = params.get("date");
  state.view = params.get("view") === "gallery" ? "gallery" : "today";
  state.date = isIsoDate(date) ? date : null;
}

function writeUrl({ replace = false } = {}) {
  const params = new URLSearchParams();
  if (state.view === "gallery") {
    params.set("view", "gallery");
  } else if (state.date) {
    params.set("date", state.date);
  }
  const query = params.toString();
  const url = query ? `/?${query}` : "/";
  if (url !== `${location.pathname}${location.search}`) {
    history[replace ? "replaceState" : "pushState"](null, "", url);
  }
}

function navigate(changes) {
  Object.assign(state, changes);
  writeUrl();
  render();
}

// ---- 一枚ビュー ----------------------------------------------------------

function updateDateControls() {
  const current = state.shownDate ?? state.date;
  const max = state.latestDate;
  if (max) {
    elements.dateInput.max = max;
  }
  elements.dateInput.value = current ?? "";
  elements.prev.disabled = !current || current <= FIRST_APOD_DATE;
  elements.next.disabled = !current || !max || current >= max;
  elements.latest.disabled = !state.date;
}

function shareAction(apod, { primary = true } = {}) {
  const url = `${location.origin}/?date=${apod.date}`;
  const button = h("button", { type: "button", class: primary ? "btn btn-primary" : "btn" }, "この日を共有");
  button.addEventListener("click", async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: apod.title, url });
        return;
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      button.textContent = "リンクをコピーしました";
      setTimeout(() => (button.textContent = "この日を共有"), 2000);
    } catch {
      prompt("このリンクをコピーしてください", url);
    }
  });
  return button;
}

async function loadDetail() {
  detailRequest?.abort();
  const controller = new AbortController();
  detailRequest = controller;

  elements.detail.setAttribute("aria-busy", "true");
  elements.detail.replaceChildren(renderDetailSkeleton());
  updateDateControls();

  setRequest(state.date ? `/api/apod?date=${state.date}` : "/api/apod");
  try {
    const apod = await fetchApod(state.date, { signal: controller.signal });
    if (!state.date) {
      state.latestDate = apod.date;
    }
    state.shownDate = apod.date;
    observatory.show(apod.date, state.latestDate);
    elements.metaLine.textContent = `No. ${serialOf(apod.date).toLocaleString("en-US")} · NASA APOD · Observatory`;
    elements.detail.replaceChildren(
      renderDetail(apod, { priority: true, actions: [shareAction(apod)] }),
    );
    document.title = `${apod.title} — SPACE APP`;
    announce(`${formatJapaneseDate(apod.date)}の写真「${apod.title}」を表示しました`);
  } catch (err) {
    if (err.name === "AbortError") {
      return;
    }
    state.shownDate = state.date;
    const message = describeError(err);
    const canRetry = err.status >= 500 || err.status === 0;
    const showLatest = state.date ? () => navigate({ view: "today", date: null, shownDate: null }) : null;
    elements.detail.replaceChildren(
      renderError(message, { onRetry: canRetry ? loadDetail : null, onLatest: showLatest }),
    );
    announce(message);
  } finally {
    if (detailRequest === controller) {
      elements.detail.setAttribute("aria-busy", "false");
      updateDateControls();
    }
  }
}

function goToDate(date) {
  if (!date) {
    return;
  }
  const latest = state.latestDate;
  const isLatest = latest && date >= latest;
  navigate({ view: "today", date: isLatest ? null : date, shownDate: null });
}

// ---- ギャラリー ----------------------------------------------------------

function openDialog(apod) {
  const openDay = h("button", { type: "button", class: "btn btn-primary" }, "この日のページへ");
  openDay.addEventListener("click", () => {
    elements.dialog.close();
    goToDate(apod.date);
    window.scrollTo({ top: 0 });
  });
  elements.dialogBody.replaceChildren(
    renderDetail(apod, { headingId: "dialog-title", actions: [openDay, shareAction(apod, { primary: false })] }),
  );
  elements.dialog.showModal();
}

async function loadGallery() {
  galleryRequest?.abort();
  const controller = new AbortController();
  galleryRequest = controller;

  elements.gallery.setAttribute("aria-busy", "true");
  elements.shuffle.disabled = true;
  elements.gallery.replaceChildren(...Array.from({ length: 8 }, renderCardSkeleton));
  setRequest("/api/apods/random");

  try {
    const apods = await fetchRandomApods({ signal: controller.signal });
    elements.gallery.replaceChildren(...apods.map((apod) => renderCard(apod, openDialog, (picked) => observatory.preview(picked.date))));
    announce(`${apods.length}枚の写真を表示しました`);
  } catch (err) {
    if (err.name === "AbortError") {
      return;
    }
    const message = describeError(err);
    const error = renderError(message, { onRetry: loadGallery });
    error.classList.add("col-span-full");
    elements.gallery.replaceChildren(error);
    announce(message);
  } finally {
    if (galleryRequest === controller) {
      elements.gallery.setAttribute("aria-busy", "false");
      elements.shuffle.disabled = false;
    }
  }
}

// ---- 表示の切り替え ------------------------------------------------------

let galleryLoaded = false;

function render() {
  const isGallery = state.view === "gallery";
  elements.crumb.textContent = isGallery ? "ギャラリー" : "一枚";
  elements.todayView.hidden = isGallery;
  elements.galleryView.hidden = !isGallery;
  for (const tab of document.querySelectorAll(".tab[data-nav]")) {
    if (tab.dataset.nav === state.view) {
      tab.setAttribute("aria-current", "page");
    } else {
      tab.removeAttribute("aria-current");
    }
  }

  if (isGallery) {
    document.title = "ギャラリー — SPACE APP";
    if (!galleryLoaded) {
      galleryLoaded = true;
      loadGallery();
    }
  } else {
    loadDetail();
  }
}

// ---- イベント ------------------------------------------------------------

elements.dateInput.addEventListener("change", () => {
  if (isIsoDate(elements.dateInput.value)) {
    goToDate(elements.dateInput.value);
  }
});
elements.prev.addEventListener("click", () => goToDate(addDays(state.shownDate, -1)));
elements.next.addEventListener("click", () => goToDate(addDays(state.shownDate, 1)));
elements.latest.addEventListener("click", () => navigate({ view: "today", date: null, shownDate: null }));
elements.random.addEventListener("click", () => {
  goToDate(randomDateBetween(FIRST_APOD_DATE, state.latestDate ?? new Date().toISOString().slice(0, 10)));
});
elements.shuffle.addEventListener("click", loadGallery);
for (const button of document.querySelectorAll("[data-step]")) {
  button.addEventListener("click", () => {
    const by = Number(button.dataset.by);
    if (button.dataset.step === "year") {
      observatory.stepYear(by);
    } else if (button.dataset.step === "random") {
      elements.random.click();
    } else if (state.shownDate) {
      const target = by < 0 ? elements.prev : elements.next;
      if (!target.disabled) target.click();
    }
  });
}
elements.gallery.addEventListener("pointerleave", () => observatory.rest());
elements.copyRequest.addEventListener("click", async () => {
  const path = elements.requestLine.textContent.replace(/^GET /, "");
  try {
    await navigator.clipboard.writeText(new URL(path, location.origin).href);
    elements.copyRequest.dataset.copied = "";
    setTimeout(() => delete elements.copyRequest.dataset.copied, 1200);
  } catch {
    // クリップボードが使えない環境では何もしない
  }
});
document.getElementById("date-form").addEventListener("submit", (event) => event.preventDefault());

for (const link of document.querySelectorAll("[data-nav]")) {
  link.addEventListener("click", (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey) {
      return;
    }
    event.preventDefault();
    navigate({ view: link.dataset.nav, date: link.dataset.nav === "today" ? null : state.date, shownDate: null });
  });
}

elements.dialogClose.addEventListener("click", () => elements.dialog.close());
elements.dialog.addEventListener("click", (event) => {
  // ダイアログの外側（背景）をクリックしたら閉じる
  if (event.target === elements.dialog) {
    elements.dialog.close();
  }
});
elements.dialog.addEventListener("close", () => elements.dialogBody.replaceChildren());

document.addEventListener("keydown", (event) => {
  const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
  if (typing || state.view !== "today" || elements.dialog.open || event.altKey || event.metaKey || event.ctrlKey) {
    return;
  }
  if (event.key.toLowerCase() === "r" && !event.shiftKey) {
    elements.random.click();
  } else if (event.key === "ArrowLeft" && !elements.prev.disabled) {
    elements.prev.click();
  } else if (event.key === "ArrowRight" && !elements.next.disabled) {
    elements.next.click();
  }
});

window.addEventListener("popstate", () => {
  readUrl();
  state.shownDate = null;
  render();
});

// ---- 起動 ----------------------------------------------------------------

readUrl();
writeUrl({ replace: true });
render();

// 「次の日」ボタンの上限を決めるため、日付指定で開いたときも最新の日付を取っておく
if (state.date) {
  fetchApod(null)
    .then((apod) => {
      state.latestDate = apod.date;
      observatory.setLatest(apod.date);
      updateDateControls();
    })
    .catch(() => {});
}
