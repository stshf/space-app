// 天文台の図（静的な部分）を組み立てて public/index.html に書き込む。
//   node tools/build-observatory.mjs            index.html を更新
//   node tools/build-observatory.mjs --preview  確認用のページも書き出す
// 動く部品（ドームの継ぎ目・スリット・望遠鏡・指針）は public/js/observatory.js が毎フレーム描き直す。
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../public/js/kit/iso-kit.js";
import * as G from "../public/js/kit/lathe.js";
import * as M from "../public/js/observatory-model.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const { P, at } = M;
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const rad = (deg) => (deg * Math.PI) / 180;
const polar = (r, deg) => [r * Math.cos(rad(deg)), r * Math.sin(rad(deg))];

// ---- 基礎 ------------------------------------------------------------------

function plinth() {
  const { PLINTH, PLINTH_H, FOOTING, FOOTING_H } = M;
  const out = [`<path class="iso-halo" d="${k.haloOf(FOOTING, -PLINTH_H - FOOTING_H, FOOTING_H, P)}"/>`];
  out.push(S(k.slabOf(FOOTING, -PLINTH_H - FOOTING_H, FOOTING_H, P, 8, 0.8), { tone: "lo" }));
  out.push(S(k.slabOf(PLINTH, -PLINTH_H, PLINTH_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(PLINTH, -PLINTH_H / 2, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLINTH, 6), 0, P), { tone: "lo" }));
  // 四隅のアンカーボルト
  const anchors = k.corners(PLINTH, 14);
  out.push(L(anchors.map(([x, y]) => k.ring(x, y, 3, 0, P, 20)).join(""), { tone: "lo" }));
  out.push(D(anchors.map(([x, y]) => at([x, y, 0])), { size: 0.55 }));
  return out.join("");
}

// ---- 風速計のマスト（奥の左） ------------------------------------------------

const MAST = [-84, 86];
const MAST_TOP = 150;
function mast() {
  const [x, y] = MAST;
  const out = [];
  // 観測機器の箱
  const box = { x: x - 4, y: y - 30, w: 18, d: 14, r: 1.5 };
  out.push(S(k.slabOf(box, 0, 16, P, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(box, 12, P, 3), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(box, 2.4), 16, P, 3), { tone: "faint" }));
  out.push(D([at([box.x + 3, box.y + 3, 16]), at([box.x + box.w - 3, box.y + box.d - 3, 16])], { size: 0.45 }));
  // ベースプレートと支柱
  const foot = { x: x - 8, y: y - 8, w: 16, d: 16, r: 2 };
  out.push(S(k.slabOf(foot, 0, 1.6, P, 4, 0.4), { tone: "lo" }));
  out.push(D(k.corners(foot, 2.6).map(([px, py]) => at([px, py, 1.6])), { size: 0.45 }));
  out.push(S(k.cylinder(x, y, 4.4, 1.6, 5, P, 24), { tone: "mid" }));
  // 腕木は支柱の奥側と手前側に分けて、支柱をはさんで描く
  out.push(S(k.slabOf({ x: x - 1.2, y: y - 22, w: 2.4, d: 20.4, r: 0.8 }, MAST_TOP - 18, 2, P, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(x, y, 2, 6.6, MAST_TOP - 6.6, P, 16), { tone: "mid", crease: "none", inner: L([40, 80, 120].map((z) => k.sideArc(x, y, 2, z, P, 12)).join(""), { tone: "faint" }) }));
  out.push(S(k.cylinder(x, y, 2.8, MAST_TOP - 19, 4, P, 16), { tone: "mid" }));
  out.push(S(k.slabOf({ x: x - 1.2, y: y + 1.6, w: 2.4, d: 20.4, r: 0.8 }, MAST_TOP - 18, 2, P, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(x, y - 20, 1.2, MAST_TOP - 16, 6, P, 12), { tone: "mid", crease: "none" }));
  out.push(S(k.slabOf({ x: x - 9, y: y - 21, w: 14, d: 2, r: 0.6 }, MAST_TOP - 10, 1, P, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.extrude([[x - 9, y - 21], [x - 15, y - 25], [x - 15, y - 15], [x - 9, y - 19]], MAST_TOP - 10.6, 2.2, P), { tone: "mid" }));
  out.push(S(k.cylinder(x, y + 20, 1.2, MAST_TOP - 16, 4, P, 12), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(x, y + 20, 3.4, MAST_TOP - 12, 3, P, 20), { tone: "mid" }));
  // 風杯
  out.push(S(k.cylinder(x, y, 2.8, MAST_TOP, 3, P, 20), { tone: "mid" }));
  const cups = [20, 140, 260].map((deg) => [x + polar(11, deg)[0], y + polar(11, deg)[1]]);
  for (const [cx, cy] of byDepth(cups)) {
    out.push(L(k.lineOnTop([x, y], [cx, cy], MAST_TOP + 1.5, P), { tone: "mid" }));
    out.push(S(G.sphereOf([cx, cy, MAST_TOP + 1.5], 2.6, P), { tone: "mid" }));
  }
  out.push(S(k.cylinder(x, y, 1.6, MAST_TOP + 3, 2.4, P, 16), { tone: "mid" }));
  return out.join("");
}

// ---- 円筒の建物、レール、暦の目盛り ------------------------------------------

function drum() {
  const out = [];
  out.push(S(k.cylinder(0, 0, M.DRUM_R + 4, 0, 5, P, 96, 0.6), { tone: "lo" }));
  out.push(S(k.cylinder(0, 0, M.DRUM_R, 5, M.DRUM_H - 5, P, 96), {
    tone: "mid",
    crease: "none",
    inner: L([22, 43].map((z) => k.sideArc(0, 0, M.DRUM_R, z, P, 64)).join(""), { tone: "faint" }),
  }));
  // 換気口：円筒の面に沿った閉じたスロット
  for (const deg of [-62, 112, 150]) {
    const pts = [];
    for (let a = deg - 3; a <= deg + 3; a += 1) pts.push([...polar(M.DRUM_R + 0.05, a), 50]);
    for (let a = deg + 3; a >= deg - 3; a -= 1) pts.push([...polar(M.DRUM_R + 0.05, a), 53.5]);
    out.push(`<path class="obs-vent" d="${k.pathOf(pts.map(at), true)}"/>`);
    out.push(L(k.pathOf(pts.map(at), true), { tone: "lo" }));
  }
  return out.join("");
}

function rail() {
  const out = [];
  const F = G.frameOf([0, 0, M.RAIL_Z], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  out.push(S(k.cylinder(0, 0, M.RAIL_R, M.RAIL_Z, M.RAIL_H, P, 120, 0.5), { tone: "mid" }));
  out.push(D(G.dotsOf(F, M.RAIL_H / 2, M.RAIL_R, 72, P, { fade: [0.04, 0.42] }), { size: 0.4 }));
  // 暦の目盛り：週ごとの短い目盛り、月の初めに長い目盛り
  const majors = [];
  const minors = [];
  const tickAt = (deg, len) => k.lineOnTop(polar(M.RAIL_R, deg), polar(M.RAIL_R - len, deg), M.RAIL_TOP, P);
  for (let m = 0; m <= 12; m++) {
    const day = m === 12 ? 364 : Math.round((Date.UTC(2023, m, 1) - Date.UTC(2023, 0, 1)) / 86400000);
    majors.push(tickAt(M.SCALE_FROM + (day / 364) * M.SCALE_SPAN, 2.8));
  }
  for (let day = 7; day < 364; day += 7) minors.push(tickAt(M.SCALE_FROM + (day / 364) * M.SCALE_SPAN, 1.6));
  out.push(L(minors.join(""), { tone: "lo" }), L(majors.join(""), { tone: "mid" }));
  // 目盛りの両端のストッパー
  for (const deg of [M.SCALE_FROM - 3, M.SCALE_FROM + M.SCALE_SPAN + 3]) {
    const d = polar(1, deg);
    const t = [-d[1], d[0]];
    const ring = [[M.RAIL_R - 4.4, -1.4], [M.RAIL_R - 0.4, -1.4], [M.RAIL_R - 0.4, 1.4], [M.RAIL_R - 4.4, 1.4]].map(([r, w]) => [d[0] * r + t[0] * w, d[1] * r + t[1] * w]);
    out.push(S(k.extrude(ring, M.RAIL_TOP, 1.4, P), { tone: "mid" }));
  }
  return out.join("");
}

function dome() {
  const out = [];
  out.push(S(k.cylinder(0, 0, M.SKIRT_R, M.RAIL_TOP, M.SKIRT_H, P, 120, 0.5), {
    tone: "mid",
    inner: L(k.sideArc(0, 0, M.SKIRT_R, M.RAIL_TOP + 2.2, P, 96), { tone: "faint" }),
  }));
  const F = G.frameOf([0, 0, M.DOME_Z], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  const R = M.DOME_R;
  const profile = [];
  for (let theta = 0; theta < 90; theta += 4) profile.push([R * Math.sin(rad(theta)), R * Math.cos(rad(theta)), 1]);
  const meridian = [[0, 0], ...profile, [R, 0]];
  const radius = (s) => Math.sqrt(Math.max(0, R * R - s * s));
  const slope = (s) => -s / Math.max(0.6, radius(s));
  const paths = G.lathe(meridian, F, P, { smooth: { slope }, rims: "first" });
  const seam = (theta) => G.arcOf(F, R * Math.sin(rad(theta)), R * Math.cos(rad(theta)), P, { slope: -Math.tan(rad(theta)) });
  out.push(S(paths, { tone: "mid", inner: L(seam(40) + seam(78), { tone: "faint" }) }));
  return out.join("");
}

// ---- 動く部品の置き場所 ------------------------------------------------------

// JavaScript が動かなくても絵が欠けないよう、最初の姿勢（REST）で中身を入れておく
const REST = { az: 40, alt: 46 };
function live() {
  const lines = M.domeLines(REST.az);
  const opening = M.slitOpening(REST.az);
  const scope = M.telescopeOf(REST.az, REST.alt);
  const pointer = M.pointerOf(REST.az);
  const lit = (name) => name === "tube" || name === "shield";
  const slots = scope.parts.map((part) => M.slotSvg(part.name, { tone: lit(part.name) ? "hi" : "mid", lit: lit(part.name) }, part.paths)).join("");
  const line = (name, d, tone) => k.lineSvg(d || "M0 0", { tone }).replace("<path", `<path data-line="${name}"`);
  return [
    line("seams", lines.seams, "faint"),
    `<clipPath id="obs-slit"><path data-line="clip" d="${opening}"/></clipPath>`,
    `<path class="obs-cavity" data-line="opening" d="${opening}"/>`,
    `<g clip-path="url(#obs-slit)" data-part="telescope">${slots}<path class="obs-lens" data-line="lens" d="${scope.lens}"/>${line("lens-ring", scope.lensRing, "lo")}</g>`,
    line("edges", lines.edges, "lo"),
    line("rails", lines.rails, "mid"),
    M.slotSvg("pointer", { tone: "hi", lit: true }, pointer.solid),
    line("pointer", pointer.line, "lit"),
  ].join("");
}

// ---- 手前：前室、銘板、階段 -----------------------------------------------------

function vestibule() {
  const out = [];
  const box = { x: 58, y: -22, w: 34, d: 44, r: 1.5 };
  out.push(S(k.slabOf(box, 0, 40, P, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(box, 6, P, 3), { tone: "faint" }) }));
  const roof = { x: 56, y: -25, w: 39, d: 50, r: 2 };
  out.push(S(k.slabOf(roof, 40, 4, P, 4, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(roof, 3), 44, P, 4), { tone: "faint" }));
  // 扉、取っ手、扉の上の灯り
  const door = { x: 92, y: -9, w: 1, d: 18, r: 0.3 };
  out.push(S(k.slabOf(door, 0, 31, P, 2), { tone: "hi", crease: "lo" }));
  // 扉の鏡板：閉じた枠なので端がない
  for (const [z0, z1] of [[4, 14], [17, 28]]) {
    out.push(L(k.pathOf([[93.05, -6, z0], [93.05, 6, z0], [93.05, 6, z1], [93.05, -6, z1]].map(at), true), { tone: "faint" }));
  }
  out.push(D([at([93.2, 5.6, 15])], { size: 0.7, tone: "hi" }));
  out.push(S(k.slabOf({ x: 92, y: -2, w: 2.4, d: 4, r: 0.6 }, 34, 3, P, 2), { tone: "mid" }));
  // 前室の脇の小窓
  const win = [[70, 22.05, 20], [82, 22.05, 20], [82, 22.05, 30], [70, 22.05, 30]];
  out.push(`<path class="obs-glass" d="${k.pathOf(win.map(at), true)}"/>`);
  out.push(L(k.pathOf(win.map(at), true), { tone: "lo" }));
  out.push(L(k.segment([76, 22.05, 20], [76, 22.05, 30], P), { tone: "faint" }));
  return out.join("");
}

function plate() {
  const out = [];
  const plan = { x: 64, y: 74, w: 36, d: 18, r: 1.5 };
  out.push(S(k.slabOf(plan, 0, 0.8, P, 4), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(plan, 1.6), 0.8, P), { tone: "faint" }));
  out.push(k.faceTextSvg(k.topMatrix([plan.x + 5, plan.y + 7.2], 0.8, P, "x"), "APOD", { size: 4.6, tone: "mid" }));
  out.push(L(k.lineOnTop([plan.x + 5, plan.y + 11], [plan.x + 28, plan.y + 11], 0.8, P) + k.lineOnTop([plan.x + 5, plan.y + 13.6], [plan.x + 21, plan.y + 13.6], 0.8, P), { tone: "lo", free: true }));
  out.push(D([at([plan.x + 32, plan.y + 4, 0.8]), at([plan.x + 32, plan.y + 14, 0.8])], { size: 0.45 }));
  return out.join("");
}

function stairs() {
  const out = [];
  const x0 = M.PLINTH.x + M.PLINTH.w;
  const steps = [0, 1, 2];
  for (const i of steps) {
    const plan = { x: x0, y: -14, w: 9 * (3 - i), d: 28, r: 0.8 };
    out.push(S(k.slabOf(plan, -M.PLINTH_H - M.FOOTING_H, 4 * (i + 1), P, 2, 0.4), { tone: i === 2 ? "mid" : "lo" }));
  }
  // 手すり
  for (const y of [-12.5, 12.5]) {
    out.push(S(k.cylinder(x0 + 23, y, 0.9, -M.PLINTH_H - M.FOOTING_H + 4, 22, P, 10), { tone: "mid", crease: "none" }));
    out.push(S(k.cylinder(x0 + 3, y, 0.9, -4, 18, P, 10), { tone: "mid", crease: "none" }));
    out.push(L(k.segment([x0 + 3, y, 14], [x0 + 23, y, 10], P), { tone: "mid" }));
    out.push(D([at([x0 + 3, y, 14]), at([x0 + 23, y, 10])], { size: 0.6, tone: "mid" }));
  }
  return out.join("");
}

// ---- 組み立て ----------------------------------------------------------------

const LABEL =
  "天文台の図。円筒の建物の上でドームが回り、スリットの奥の望遠鏡が上下します。ドームの向きが日付（建物の縁の暦の目盛り）を、望遠鏡の高さが年を表します。";

export const svg = k.figureSvg({
  width: M.WIDTH,
  height: M.HEIGHT,
  label: LABEL,
  className: "obs-svg",
  body: [plinth(), mast(), drum(), rail(), dome(), live(), vestibule(), plate(), stairs()],
});

const html = readFileSync(join(ROOT, "public/index.html"), "utf8");
const marked = /(<!-- observatory:start -->)[\s\S]*?(<!-- observatory:end -->)/;
if (!marked.test(html)) throw new Error("public/index.html has no observatory markers");
writeFileSync(join(ROOT, "public/index.html"), html.replace(marked, `$1${svg}$2`));
console.log(`wrote observatory into public/index.html (${(svg.length / 1024).toFixed(1)} KB)`);

if (process.argv.includes("--preview")) {
  const out = process.argv[process.argv.indexOf("--preview") + 1] || join(ROOT, "observatory-preview.html");
  writeFileSync(out, k.pageHtml({ title: "Observatory", theme: "light", body: k.plateHtml({ fig: "Fig 1", title: "Observatory", hint: "", readout: "", body: `<div class="iso-stage">${svg}</div>` }) }));
  console.log("wrote", out);
}
