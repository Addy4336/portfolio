import { describe, expect, it } from "vitest";
import { dec, formatDate, RULE, versionOn } from "./lab-state";

describe("the Lab's as-of rule", () => {
  it("uses v1 before the change and v2 from the day it took effect", () => {
    expect(versionOn(dec(2024, 3, 12))).toBe("v1");
    expect(versionOn(dec(2025, 8, 26))).toBe("v1");
    expect(versionOn(dec(2025, 8, 27))).toBe("v2");
    expect(versionOn(dec(2026, 11, 6))).toBe("v2");
  });

  it("round-trips dates through decimal years", () => {
    expect(formatDate(dec(2025, 8, 27))).toBe("27 Aug 2025");
    expect(formatDate(dec(2022, 4, 27))).toBe("27 Apr 2022");
    expect(formatDate(RULE.v2.from)).toBe("27 Aug 2025");
  });
});
