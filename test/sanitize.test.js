import { describe, expect, it } from "vitest";
import {
  cleanAlt,
  cleanCredit,
  cleanExplanation,
  safeImageUrl,
  safePageUrl,
  safeVideoUrl,
  toPlainText,
} from "../src/sanitize.js";

describe("toPlainText", () => {
  it("removes tags, scripts and decodes entities", () => {
    expect(toPlainText('<b>Hi</b> &amp; <a href="x">there</a>')).toBe("Hi & there");
    expect(toPlainText('ok<script>alert(1)</script><img src=x onerror=alert(1)>')).toBe("ok");
    expect(toPlainText("Saturn&#8217;s rings &#x2014; wow")).toBe("Saturn’s rings — wow");
  });

  it("keeps escaped markup as harmless text", () => {
    expect(toPlainText("&lt;script&gt;")).toBe("<script>");
  });

  it("does not leave stray spaces where inline tags were", () => {
    expect(toPlainText('New <a href="#">Horizon</a>\'s flyby: <a href="#">Twitter</a>, <a href="#">Facebook</a>'))
      .toBe("New Horizon's flyby: Twitter, Facebook");
    expect(toPlainText("line one<br>line two<p>para</p>")).toBe("line one line two para");
  });
});

describe("cleanAlt", () => {
  it("drops the boilerplate alt text of old APODs", () => {
    expect(cleanAlt("See Explanation. Clicking on the picture will download the highest resolution version available."))
      .toBe("");
    expect(cleanAlt("A dark cable descends into a deep hole")).toBe("A dark cable descends into a deep hole");
  });
});

describe("cleanExplanation / cleanCredit", () => {
  it("strips the NASA labels", () => {
    expect(cleanExplanation("<strong>Explanation:</strong> What color is the universe?"))
      .toBe("What color is the universe?");
    expect(cleanCredit('<b>Image Credit &amp; Copyright:</b> <a href="#">John Britton</a>'))
      .toBe("John Britton");
    expect(cleanCredit("<b>Credit:</b> NASA, ESA")).toBe("NASA, ESA");
  });
});

describe("URL allow lists", () => {
  it("allows NASA images over https only", () => {
    expect(safeImageUrl("https://assets.science.nasa.gov/a.jpg")).toBe("https://assets.science.nasa.gov/a.jpg");
    expect(safeImageUrl("http://assets.science.nasa.gov/a.jpg")).toBeNull();
    expect(safeImageUrl("https://evil.example/a.jpg")).toBeNull();
    expect(safeImageUrl("javascript:alert(1)")).toBeNull();
  });

  it("allows NASA pages only", () => {
    expect(safePageUrl("https://science.nasa.gov/image-article/x/")).toBe("https://science.nasa.gov/image-article/x/");
    expect(safePageUrl("https://nasa.gov.evil.example/")).toBeNull();
  });

  it("normalizes YouTube to the no-cookie player and allows Vimeo", () => {
    expect(safeVideoUrl("//www.youtube.com/embed/XORui0wFKnE?rel=0"))
      .toBe("https://www.youtube-nocookie.com/embed/XORui0wFKnE");
    expect(safeVideoUrl("https://player.vimeo.com/video/11386048#t=0m58s?color=8BA0FF&#038;portrait=0"))
      .toBe("https://player.vimeo.com/video/11386048");
    expect(safeVideoUrl("https://evil.example/embed/abcdefg")).toBeNull();
  });
});
