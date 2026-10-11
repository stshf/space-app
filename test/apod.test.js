import { describe, expect, it } from "vitest";
import { normalizeApod } from "../src/apod.js";
import { hostileEntry, imageEntry, placeholderEntry, videoEntry } from "./fixtures.js";

describe("normalizeApod", () => {
  it("returns clean text and sized image URLs", () => {
    const apod = normalizeApod(imageEntry);
    expect(apod).toMatchObject({
      date: "2015-07-14",
      title: "New Horizons Passes Pluto and Charon",
      explanation: "Pluto & Charon, up close.",
      credit: "NASA, JHU APL, SwRI",
      alt: "Pluto and its moon Charon",
      mediaType: "image",
      videoUrl: null,
      pageUrl: "https://science.nasa.gov/image-article/apod-2015-july-14/",
    });
    expect(apod.image.thumb).toBe(
      "https://assets.science.nasa.gov/content/dam/science/cds/apod/apod/2015/july/PlutoCharon01_NewHorizons_1422.jpg?w=640",
    );
  });

  it("recovers the real image when NASA returns its logo placeholder", () => {
    const apod = normalizeApod(placeholderEntry);
    expect(apod.mediaType).toBe("image");
    expect(apod.image.large).toContain("hyakutake_eso_big.gif");
  });

  it("turns iframes into a safe video embed", () => {
    const apod = normalizeApod(videoEntry);
    expect(apod.mediaType).toBe("video");
    expect(apod.image).toBeNull();
    expect(apod.videoUrl).toBe("https://www.youtube-nocookie.com/embed/XORui0wFKnE");
  });

  it("neutralizes hostile data", () => {
    const apod = normalizeApod(hostileEntry);
    expect(apod.title).toBe("Nice");
    expect(apod.explanation).toBe("Safe text");
    expect(apod.credit).toBe("Someone");
    expect(apod.alt).not.toContain("<script>");
    expect(apod.pageUrl).toBeNull();
    expect(apod.image).toBeNull();
    expect(apod.videoUrl).toBeNull();
    expect(apod.mediaType).toBe("other");
  });
});
