// 天文台の図を動かす。ドームの向き（日付）と望遠鏡の高さ（年）を目標値へなめらかに寄せ、
// 動く部品の形だけを毎フレーム描き直す。ドラッグで日付を選べる。
import * as M from "./observatory-model.js";

const TAU_SECONDS = 0.45;
const DEG_PER_PX_AZ = 0.35;
const DEG_PER_PX_ALT = 0.3;

const format = (n) => n.toLocaleString("en-US");

export function mountObservatory(stage, { onPick = () => {}, readout } = {}) {
  const svg = stage.querySelector("svg");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const line = (name) => svg.querySelector(`[data-line="${name}"]`);
  const lines = {
    seams: line("seams"),
    clip: line("clip"),
    opening: line("opening"),
    lens: line("lens"),
    lensRing: line("lens-ring"),
    edges: line("edges"),
    rails: line("rails"),
    pointer: line("pointer"),
  };
  const scope = svg.querySelector('[data-part="telescope"]');
  const slots = Object.fromEntries([...scope.querySelectorAll("[data-slot]")].map((g) => [g.dataset.slot, g]));
  const pointerSlot = svg.querySelector('[data-slot="pointer"]');

  let latest = new Date().toISOString().slice(0, 10);
  let shown = null; // サイトが表示している日付
  const start = M.poseOf(M.FIRST, latest);
  const pose = { az: start.az, alt: start.alt };
  const target = { ...pose };
  let drawn = { az: NaN, alt: NaN };
  let order = "";
  let frame = 0;
  let last = 0;
  let visible = false;
  let drag = null;
  let keyTimer = 0;

  function draw() {
    if (Math.abs(drawn.az - pose.az) > 0.01) {
      const dome = M.domeLines(pose.az);
      const opening = M.slitOpening(pose.az);
      lines.seams.setAttribute("d", dome.seams || "M0 0");
      lines.edges.setAttribute("d", dome.edges || "M0 0");
      lines.rails.setAttribute("d", dome.rails || "M0 0");
      lines.opening.setAttribute("d", opening);
      lines.clip.setAttribute("d", opening);
      const pointer = M.pointerOf(pose.az);
      M.writeSlot(pointerSlot, pointer.solid);
      lines.pointer.setAttribute("d", pointer.line);
    }
    if (Math.abs(drawn.az - pose.az) > 0.01 || Math.abs(drawn.alt - pose.alt) > 0.01) {
      const tele = M.telescopeOf(pose.az, pose.alt);
      for (const part of tele.parts) M.writeSlot(slots[part.name], part.paths);
      const next = tele.parts.map((part) => part.name).join();
      if (next !== order) {
        // 手前と奥が入れ替わったときだけ並べ直す
        const fragment = document.createDocumentFragment();
        for (const part of tele.parts) fragment.append(slots[part.name]);
        scope.prepend(fragment);
        order = next;
      }
      lines.lens.setAttribute("d", tele.lens);
      lines.lensRing.setAttribute("d", tele.lensRing || "M0 0");
    }
    drawn = { ...pose };
    say();
  }

  // 目盛りを読むのと同じ計算で、いま部品が指している日付を出す
  function say() {
    const date = M.dateOf(pose.az, pose.alt, latest);
    const text = `${date} · No. ${format(M.serialOf(date))} of ${format(M.serialOf(latest))} · Az ${Math.round(pose.az)}° · Alt ${Math.round(pose.alt)}°`;
    if (readout && readout.textContent !== text) readout.textContent = text;
  }

  function describe(date) {
    stage.setAttribute("aria-valuetext", `${date}、APOD の ${format(M.serialOf(date))} 枚目`);
    stage.setAttribute("aria-valuenow", String(M.serialOf(date)));
  }

  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    const calm = still.matches;
    const ease = calm ? 1 : 1 - Math.exp(-dt / TAU_SECONDS);
    for (const key of ["az", "alt"]) {
      pose[key] += (target[key] - pose[key]) * ease;
      if (Math.abs(target[key] - pose[key]) < 0.02) pose[key] = target[key];
    }
    draw();
    const settled = pose.az === target.az && pose.alt === target.alt;
    frame = visible && !settled ? requestAnimationFrame(tick) : 0;
  }

  const run = () => {
    if (!frame && visible) {
      last = 0;
      frame = requestAnimationFrame(tick);
    }
  };

  function aim(date) {
    const next = M.poseOf(date, latest);
    target.az = next.az;
    target.alt = next.alt;
    run();
  }

  new IntersectionObserver(
    (entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible) run();
    },
    { rootMargin: "120px 0px" },
  ).observe(stage);

  // ドラッグ：左右で日付、上下で年。離したところの日付を開く。
  // 指で触ったときは左右だけを使い、上下はページのスクロールに任せる
  stage.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    drag = { x: event.clientX, y: event.clientY, az: target.az, alt: target.alt, moved: false, touch: event.pointerType === "touch" };
    stage.setPointerCapture(event.pointerId);
    stage.dataset.dragging = "";
  });
  stage.addEventListener("pointermove", (event) => {
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.hypot(dx, drag.touch ? 0 : dy) > 3) drag.moved = true;
    // 指を右へ動かすとスリットも右へ回る（方位は画面の右へ向かうほど小さい）
    target.az = Math.min(M.SCALE_HIGH, Math.max(M.SCALE_LOW, drag.az - dx * DEG_PER_PX_AZ));
    if (!drag.touch) target.alt = Math.min(M.ALT_HIGH, Math.max(M.ALT_LOW, drag.alt - dy * DEG_PER_PX_ALT));
    run();
  });
  const release = () => {
    if (!drag) return;
    const moved = drag.moved;
    drag = null;
    delete stage.dataset.dragging;
    if (!moved) return;
    const date = M.dateOf(target.az, target.alt, latest);
    aim(date);
    describe(date);
    if (date !== shown) onPick(date);
  };
  stage.addEventListener("pointerup", release);
  // ブラウザがスクロールに切り替えたときは、日付を開かずに元へ戻す
  stage.addEventListener("pointercancel", () => {
    if (!drag) return;
    target.az = drag.az;
    target.alt = drag.alt;
    drag = null;
    delete stage.dataset.dragging;
    run();
  });

  // 1 年ずつ動かす。続けて押せるよう、少し待ってから開く
  function stepYear(by) {
    const from = M.dateOf(target.az, target.alt, latest);
    const date = M.shiftYear(from, by, latest);
    aim(date);
    describe(date);
    clearTimeout(keyTimer);
    keyTimer = setTimeout(() => {
      if (date !== shown) onPick(date);
    }, 500);
  }

  stage.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    stepYear(event.key === "ArrowUp" ? 1 : -1);
  });

  draw();

  return {
    // サイトが日付を表示したとき
    show(date, latestDate) {
      if (latestDate) latest = latestDate;
      shown = date;
      aim(date);
      describe(date);
    },
    // ギャラリーのカードにカーソルを載せたとき（開きはしない）
    preview(date) {
      aim(date);
    },
    stepYear,
    rest() {
      if (shown) aim(shown);
    },
    setLatest(date) {
      if (date) latest = date;
    },
  };
}
