import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker from "../src/index.js";
import { imageEntry, placeholderEntry, videoEntry } from "./fixtures.js";

const ENTRIES = {
  "150714": imageEntry,
  "960313": placeholderEntry,
  "240804": videoEntry,
};

function createKv() {
  const store = new Map();
  return {
    store,
    async get(key, type) {
      const value = store.get(key);
      return value === undefined ? null : type === "json" ? JSON.parse(value) : value;
    },
    async put(key, value) {
      store.set(key, value);
    },
  };
}

function nasaResponse(path) {
  const id = path.match(/apod-basic\/(\d{6})$/)?.[1];
  if (id) {
    return ENTRIES[id]
      ? Response.json(ENTRIES[id])
      : Response.json({ code: "apod_basic_not_found" }, { status: 404 });
  }
  if (path.includes("apod-basic?per_page=1")) {
    return Response.json([imageEntry]);
  }
  return new Response("unexpected", { status: 500 });
}

let env;
let ctx;
let fetchMock;

beforeEach(() => {
  fetchMock = vi.fn(async (input) => nasaResponse(String(input)));
  vi.stubGlobal("fetch", fetchMock);
  env = {
    APOD_CACHE: createKv(),
    ASSETS: { fetch: async () => new Response("<html><head><title>SPACE APP</title></head></html>", { headers: { "Content-Type": "text/html" } }) },
  };
  const pending = [];
  ctx = { waitUntil: (promise) => pending.push(promise), pending };
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const call = (path) => worker.fetch(new Request(`https://space-app.test${path}`), env, ctx);

describe("GET /api/apod", () => {
  it("returns a normalized APOD for a date", async () => {
    const res = await call("/api/apod?date=2015-07-14");
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=86400");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    const body = await res.json();
    expect(body.apod.title).toBe("New Horizons Passes Pluto and Charon");
    expect(body.apod.explanation).toBe("Pluto & Charon, up close.");
  });

  it("still accepts the old MM/DD/YYYY format", async () => {
    const res = await call("/api/apod?date=07/14/2015");
    expect(res.status).toBe(200);
  });

  it("returns the latest APOD without a date", async () => {
    const res = await call("/api/apod");
    expect(res.status).toBe(200);
    expect((await res.json()).apod.date).toBe("2015-07-14");
  });

  it("returns 400 for malformed dates", async () => {
    const res = await call("/api/apod?date=13/45/2025");
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_date");
  });

  it("returns 404 outside the APOD range without asking NASA", async () => {
    const res = await call("/api/apod?date=1990-01-01");
    expect(res.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 404 when NASA has no APOD for that day", async () => {
    const res = await call("/api/apod?date=2001-01-01");
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("not_found");
  });

  it("serves past dates from KV after the first request", async () => {
    await call("/api/apod?date=2015-07-14");
    await Promise.all(ctx.pending);
    expect(env.APOD_CACHE.store.has("apod:v1:2015-07-14")).toBe(true);

    fetchMock.mockClear();
    const res = await call("/api/apod?date=2015-07-14");
    expect(res.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("retries when NASA answers with its bot check (403)", async () => {
    vi.useFakeTimers();
    let calls = 0;
    fetchMock.mockImplementation(async (input) => {
      calls++;
      return calls < 3 ? new Response("Checking your browser...", { status: 403 }) : nasaResponse(String(input));
    });
    const pending = call("/api/apod?date=2015-07-14");
    await vi.runAllTimersAsync();
    const res = await pending;
    vi.useRealTimers();
    expect(res.status).toBe(200);
    expect(calls).toBe(3);
  });

  it("returns 502 when NASA keeps failing", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(async () => new Response("down", { status: 500 }));
    const pending = call("/api/apod?date=2015-07-14");
    await vi.runAllTimersAsync();
    const res = await pending;
    vi.useRealTimers();
    expect(res.status).toBe(502);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});

describe("GET /api/apods/random", () => {
  it("returns only the dates NASA could serve, images first", async () => {
    // ランダムな12日のうち、3日だけ NASA にデータがある状態にする
    const known = ["2015-07-14", "1996-03-13", "2024-08-04"];
    let i = 0;
    vi.spyOn(Math, "random").mockImplementation(() => {
      const date = known[i % known.length] ?? "2001-01-01";
      i++;
      const start = Date.parse("1995-06-16");
      const span = Date.now() - start;
      return i <= known.length ? (Date.parse(date) - start) / span : 0.5 + i / 1000;
    });

    const res = await call("/api/apods/random");
    Math.random.mockRestore();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const { apods } = await res.json();
    expect(apods.map((apod) => apod.mediaType)).toEqual(["image", "image", "video"]);
  });
});

describe("other routes", () => {
  it("returns JSON 404 for unknown API paths", async () => {
    const res = await call("/api/nope");
    expect(res.status).toBe(404);
  });

  it("rejects non-GET methods", async () => {
    const res = await worker.fetch(new Request("https://space-app.test/api/apod", { method: "POST" }), env, ctx);
    expect(res.status).toBe(405);
  });

  it("adds a Content-Security-Policy to the HTML page", async () => {
    const res = await call("/");
    expect(res.headers.get("Content-Security-Policy")).toContain("script-src 'self'");
  });
});
