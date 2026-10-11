import { describe, expect, it } from "vitest";
import { isInApodRange, parseDate, randomIsoDates, toApodId } from "../src/dates.js";

describe("parseDate", () => {
  it("accepts ISO and legacy US formats", () => {
    expect(parseDate("2015-07-14")).toBe("2015-07-14");
    expect(parseDate("07/14/2015")).toBe("2015-07-14");
  });

  it("rejects impossible or malformed dates", () => {
    expect(parseDate("13/45/2025")).toBeNull();
    expect(parseDate("2025-02-30")).toBeNull();
    expect(parseDate("2025-1-1")).toBeNull();
    expect(parseDate("<script>")).toBeNull();
    expect(parseDate(undefined)).toBeNull();
  });
});

describe("isInApodRange", () => {
  const now = new Date("2026-10-11T12:00:00Z");

  it("allows the first APOD through today", () => {
    expect(isInApodRange("1995-06-16", now)).toBe(true);
    expect(isInApodRange("2026-10-11", now)).toBe(true);
  });

  it("rejects dates before the first APOD or in the future", () => {
    expect(isInApodRange("1995-06-15", now)).toBe(false);
    expect(isInApodRange("2026-10-12", now)).toBe(false);
  });
});

describe("toApodId", () => {
  it("converts to the YYMMDD path NASA uses", () => {
    expect(toApodId("2015-07-14")).toBe("150714");
    expect(toApodId("1995-06-16")).toBe("950616");
  });
});

describe("randomIsoDates", () => {
  it("returns unique dates inside the APOD range", () => {
    const now = new Date("2026-10-11T00:00:00Z");
    const dates = randomIsoDates(12, now);
    expect(new Set(dates).size).toBe(12);
    for (const date of dates) {
      expect(isInApodRange(date, now)).toBe(true);
    }
  });
});
