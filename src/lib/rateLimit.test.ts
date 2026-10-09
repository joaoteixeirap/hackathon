import { describe, expect, it } from "vitest";
import { clientKey, createLimiter } from "./rateLimit";

describe("createLimiter", () => {
  it("caps requests and bytes per window and resets afterwards", () => {
    const l = createLimiter({ requests: 3, bytes: 100 }, 1000);
    expect(l.take("a", 10, 0)).toBe(true);
    expect(l.take("a", 10, 1)).toBe(true);
    expect(l.take("a", 90, 2)).toBe(false); // bytes over budget
    expect(l.take("a", 10, 3)).toBe(true);
    expect(l.take("a", 0, 4)).toBe(false); // 4th request
    expect(l.take("b", 10, 5)).toBe(true); // other client unaffected
    expect(l.take("a", 10, 1001)).toBe(true); // new window
  });
});

describe("clientKey", () => {
  it("uses the first forwarded address", () => {
    expect(clientKey(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
    expect(clientKey(new Headers())).toBe("local");
  });
});
