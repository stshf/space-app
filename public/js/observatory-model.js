// 天文台の図のモデル。ビルド（Node）とブラウザの両方から読み込む。
// ドームの向きが「その年の何日目か」、望遠鏡の高さが「何年か」を表す。
// 図に出る数字はすべてここから計算する。
import * as k from "./kit/iso-kit.js";
import * as G from "./kit/lathe.js";

export const FIRST = "1995-06-16";
export const FIRST_YEAR = 1995;

export const WIDTH = 640;
export const HEIGHT = 470;

// ---- 寸法（ワールド単位、z が上） -----------------------------------------

export const PLINTH = { x: -116, y: -116, w: 232, d: 232, r: 10 };
export const PLINTH_H = 12;
export const FOOTING = k.insetPlan(PLINTH, -4);
export const FOOTING_H = 4;

export const DRUM_R = 62;
export const DRUM_H = 64;
export const RAIL_R = 69;
export const RAIL_Z = DRUM_H;
export const RAIL_H = 3.4;
export const RAIL_TOP = RAIL_Z + RAIL_H;
export const SKIRT_R = 63.4;
export const SKIRT_H = 7;
export const DOME_Z = RAIL_TOP + SKIRT_H;
export const DOME_R = 63.4;
export const SLIT_W = 8.5;
export const RAIL_W = 2.6;
export const SLIT_END = 104; // スリットは天頂を越えて 104° まで

// 暦の目盛り：1 年をドームの前側 150° に割り当てる（Jan 1 から Dec 31 まで）
export const SCALE_FROM = -30;
export const SCALE_SPAN = 150;
// 年の目盛り：1995 年が 14°、今年が 76°
export const ALT_LOW = 14;
export const ALT_HIGH = 76;

export const PIVOT_Z = DOME_Z + 4;

const rad = (deg) => (deg * Math.PI) / 180;

// ---- カメラ ----------------------------------------------------------------

export const P = k.fitProjection(
  [
    ...k.boxCorners(FOOTING, -PLINTH_H - FOOTING_H, 0),
    [142, 0, -PLINTH_H - FOOTING_H],
    [-84, 86, 172],
    [0, 0, DOME_Z + DOME_R],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 45 },
);
export const V = G.viewOf(P);
export const at = (point) => k.iso(point, P);

// ---- 日付と角度 ------------------------------------------------------------

const DAY = 86400000;
const utc = (iso) => Date.parse(`${iso}T00:00:00Z`);
const isoOf = (time) => new Date(time).toISOString().slice(0, 10);
const daysIn = (year) => ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365);

export function serialOf(iso) {
  return Math.round((utc(iso) - utc(FIRST)) / DAY) + 1;
}

export function lastYearOf(latest) {
  return Math.max(FIRST_YEAR + 1, Number(latest.slice(0, 4)));
}

// 日付 → ドームの方位（φ、+x から +y へ）と望遠鏡の高度
export function poseOf(iso, latest) {
  const year = Number(iso.slice(0, 4));
  const day = (utc(iso) - Date.UTC(year, 0, 1)) / DAY;
  const last = lastYearOf(latest);
  return {
    az: SCALE_FROM + (day / (daysIn(year) - 1)) * SCALE_SPAN,
    alt: ALT_LOW + ((year - FIRST_YEAR) / (last - FIRST_YEAR)) * (ALT_HIGH - ALT_LOW),
  };
}

// 方位と高度 → 日付（目盛りを読むのと同じ。動いている途中もこれで読む）
export function dateOf(az, alt, latest) {
  const last = lastYearOf(latest);
  const year = Math.round(FIRST_YEAR + ((alt - ALT_LOW) / (ALT_HIGH - ALT_LOW)) * (last - FIRST_YEAR));
  const share = Math.min(1, Math.max(0, (az - SCALE_FROM) / SCALE_SPAN));
  const day = Math.round(share * (daysIn(year) - 1));
  return clampDate(isoOf(Date.UTC(year, 0, 1) + day * DAY), latest);
}

export function clampDate(iso, latest) {
  return iso < FIRST ? FIRST : iso > latest ? latest : iso;
}

export function shiftYear(iso, by, latest) {
  const [y, m, d] = iso.split("-").map(Number);
  const year = y + by;
  const day = Math.min(d, new Date(Date.UTC(year, m, 0)).getUTCDate());
  return clampDate(`${year}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`, latest);
}

export function shiftDay(iso, by, latest) {
  return clampDate(isoOf(utc(iso) + by * DAY), latest);
}

// ---- 動く部品 --------------------------------------------------------------

const DOME_C = [0, 0, DOME_Z];
const dirOf = (az, alt) => [Math.cos(rad(alt)) * Math.cos(rad(az)), Math.cos(rad(alt)) * Math.sin(rad(az)), Math.sin(rad(alt))];
const facing = (p) => G.dot3(G.sub3(p, DOME_C), V) > 0;

// スリットの縁と平行な曲線：スリットの中心面から u だけ横にずれた、球面上の点
function onSlit(az, u, theta) {
  const d = [Math.cos(rad(az)), Math.sin(rad(az)), 0];
  const t = [-Math.sin(rad(az)), Math.cos(rad(az)), 0];
  const c = Math.sqrt(DOME_R * DOME_R - u * u);
  return [
    t[0] * u + c * (Math.cos(rad(theta)) * d[0]),
    t[1] * u + c * (Math.cos(rad(theta)) * d[1]),
    DOME_Z + c * Math.sin(rad(theta)),
  ];
}

// 球面上の曲線のうち見えている部分。見え隠れの境目は二分法で輪郭にのせる
function visibleRuns(pointAt, from, to, step) {
  const runs = [];
  let run = null;
  let prev = from;
  const edge = (a, b) => {
    let lo = a;
    let hi = b;
    const want = facing(pointAt(a));
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (facing(pointAt(mid)) === want) lo = mid;
      else hi = mid;
    }
    return want ? lo : hi;
  };
  for (let t = from; t <= to + 1e-9; t += step) {
    const shown = facing(pointAt(t));
    if (shown && !run) {
      run = [];
      if (t > from) run.push(at(pointAt(edge(prev, t))));
    }
    if (shown) run.push(at(pointAt(t)));
    if (!shown && run) {
      run.push(at(pointAt(edge(prev, t))));
      runs.push(run);
      run = null;
    }
    prev = t;
  }
  if (run) runs.push(run);
  return runs.filter((r) => r.length > 1).map((r) => k.pathOf(r)).join("");
}

export function domeLines(az) {
  // パネルの継ぎ目（スリットの両脇は除く）。根元はスカート、上は 78° の継ぎ目で終わる
  const seams = [];
  for (let i = 1; i < 12; i++) {
    const a = az + i * 30;
    seams.push(visibleRuns((theta) => G.add3(DOME_C, G.mul3(dirOf(a, theta), DOME_R)), 0, 78, 2));
  }
  const edges = [];
  const rails = [];
  for (const side of [-1, 1]) {
    edges.push(visibleRuns((theta) => onSlit(az, side * SLIT_W, theta), 0, SLIT_END, 2));
    rails.push(visibleRuns((theta) => onSlit(az, side * (SLIT_W + RAIL_W), theta), 0, SLIT_END, 2));
  }
  const top = visibleRuns((u) => onSlit(az, u, SLIT_END), -(SLIT_W + RAIL_W), SLIT_W + RAIL_W, 0.5);
  return { seams: seams.join(""), edges: edges.join(""), rails: rails.join("") + top };
}

// スリットの開口部：見えているセルを小さな四角形の集まりとして返す
export function slitOpening(az) {
  const quads = [];
  const us = [-SLIT_W, -SLIT_W / 2, 0, SLIT_W / 2, SLIT_W];
  for (let theta = 0; theta < SLIT_END; theta += 2) {
    const t1 = Math.min(SLIT_END, theta + 2);
    for (let j = 0; j < us.length - 1; j++) {
      const corners = [onSlit(az, us[j], theta), onSlit(az, us[j + 1], theta), onSlit(az, us[j + 1], t1), onSlit(az, us[j], t1)];
      if (!corners.some(facing)) continue;
      quads.push(k.pathOf(corners.map(at), true));
    }
  }
  return quads.join("");
}

// 指針：スカートの下から暦の目盛りの上へ張り出す小さな爪
export function pointerOf(az) {
  const d = [Math.cos(rad(az)), Math.sin(rad(az))];
  const t = [-d[1], d[0]];
  const ring = [
    [SKIRT_R - 1, -1.8],
    [RAIL_R + 1.2, -1.2],
    [RAIL_R + 1.2, 1.2],
    [SKIRT_R - 1, 1.8],
  ].map(([r, w]) => [d[0] * r + t[0] * w, d[1] * r + t[1] * w]);
  const z = RAIL_TOP + 0.6;
  return {
    solid: k.extrude(ring, z, 1.6, P, { bevel: 0.3 }),
    line: k.lineOnTop([d[0] * (SKIRT_R + 0.4), d[1] * (SKIRT_R + 0.4)], [d[0] * (RAIL_R + 0.8), d[1] * (RAIL_R + 0.8)], z + 1.6, P),
  };
}

// 望遠鏡：フォーク式の架台に載った鏡筒。スリットの中に見える
const TUBE = [
  [-24, 5.4],
  [-21, 5.4],
  [-21, 7.2],
  [34, 7.2],
];
const SHIELD = [
  [34, 8.4],
  [52, 8.4],
];
const COLLAR = [
  [-3, 8.3],
  [3, 8.3],
];
export function telescopeOf(az, alt) {
  const D = dirOf(az, alt);
  const pivot = [0, 0, PIVOT_Z];
  const F = G.frameAlong(pivot, D);
  const t = [-Math.sin(rad(az)), Math.cos(rad(az)), 0];
  const parts = [];
  parts.push({ name: "tube", depth: G.dot3(pivot, V), paths: G.solidOf(TUBE, F, P), tone: "hi", lit: true });
  parts.push({ name: "collar", depth: G.dot3(pivot, V) + 0.1, paths: G.solidOf(COLLAR, F, P), tone: "mid" });
  parts.push({ name: "shield", depth: G.dot3(G.add3(pivot, G.mul3(D, 43)), V), paths: G.solidOf(SHIELD, F, P), tone: "hi", lit: true });
  for (const side of [-1, 1]) {
    const o = G.add3(pivot, G.mul3(t, side * 9.6));
    const A = G.frameOf(o, G.mul3(t, side), [0, 0, -1], [Math.cos(rad(az)), Math.sin(rad(az)), 0]);
    const arm = G.prismOf(A, G.stadium(4.2, 6.4, 13), 0, 3, P);
    const bearing = G.disc(-1.2, 0, 4.8, A, P);
    const depth = G.dot3(o, V);
    parts.push({ name: side < 0 ? "armA" : "armB", depth: depth + (depth > G.dot3(pivot, V) ? 20 : -20), paths: arm, tone: "mid" });
    parts.push({ name: side < 0 ? "bearingA" : "bearingB", depth: depth + (depth > G.dot3(pivot, V) ? 20.1 : -20.1), paths: bearing, tone: "mid" });
  }
  const front = G.dot3(D, V) > 0.05;
  return {
    parts: parts.sort((a, b) => a.depth - b.depth),
    lens: front ? G.circleOf(F, 52, 7.2, P) : "",
    lensRing: front ? G.circleOf(F, 52, 5.6, P) : "",
  };
}

export const TELESCOPE_SLOTS = ["armA", "bearingA", "armB", "bearingB", "tube", "collar", "shield"];

// ---- 動く部品の SVG（決まった数の要素を作り、毎フレーム d だけ書き換える） ----

// 中身が空の d="" は描かれないだけで、属性としては正しい
export function slotSvg(name, { tone = "mid", lit = false } = {}, paths = {}) {
  const p = solidParts(paths);
  const crease = lit ? "lo" : "faint";
  const shades = p.shades.map((d, s) => `<path class="iso-shade" data-shade="${s}" d="${d}"/>`).join("");
  return `<g class="iso-solid" data-slot="${name}"${lit ? " data-lit" : ""}${p.seamless ? " data-seamless" : ""}><path class="iso-fill" d="${p.fill}"/>${shades}<path class="iso-top" d="${p.top}"/><path class="iso-line iso-crease" data-tone="${crease}" d="${p.crease}"/><path class="iso-line iso-bevel" data-tone="${crease}" d="${p.bevel}"/><path class="iso-line iso-edge" data-tone="${tone}" d="${p.outline}"/></g>`;
}

// 決まった要素に新しい形を書き込む（ブラウザ用）
export function writeSlot(group, paths) {
  const p = solidParts(paths);
  const nodes = group.children;
  nodes[0].setAttribute("d", p.fill);
  for (let s = 0; s < 4; s++) nodes[1 + s].setAttribute("d", p.shades[s]);
  nodes[5].setAttribute("d", p.top);
  nodes[6].setAttribute("d", p.crease);
  nodes[7].setAttribute("d", p.bevel);
  nodes[8].setAttribute("d", p.outline);
  group.toggleAttribute("data-seamless", p.seamless);
}

export function solidParts(paths) {
  return {
    fill: paths.fill || "",
    shades: [0, 1, 2, 3].map((s) => paths.shades?.[s] || ""),
    top: paths.top || "",
    crease: paths.crease || "",
    bevel: paths.bevel || "",
    outline: paths.outline || "",
    seamless: Boolean(paths.seamless),
  };
}
