import { describe, expect, it } from "vitest";
import { cleanMessage, costSplit, joinErrorMessage, viewerRole } from "./membership";

const base = { userId: "u1", creatorId: "c1", status: null, verified: false, verificationRequired: false };

describe("viewerRole", () => {
  it("recognizes the creator", () => {
    expect(viewerRole({ ...base, userId: "c1" })).toBe("creator");
  });
  it("uses the membership status when there is one", () => {
    expect(viewerRole({ ...base, status: "approved" })).toBe("approved");
    expect(viewerRole({ ...base, status: "requested" })).toBe("requested");
    expect(viewerRole({ ...base, status: "declined" })).toBe("declined");
  });
  it("lets people who left ask again", () => {
    expect(viewerRole({ ...base, status: "left" })).toBe("guest");
  });
  it("gates unverified users only when verification is required", () => {
    expect(viewerRole(base)).toBe("guest");
    expect(viewerRole({ ...base, verificationRequired: true })).toBe("unverified");
    expect(viewerRole({ ...base, verificationRequired: true, verified: true })).toBe("guest");
  });
  it("visitors without a session can still ask (a guest session starts on click)", () => {
    expect(viewerRole({ ...base, userId: null, verificationRequired: true })).toBe("guest");
  });
});

describe("costSplit", () => {
  it("is null without a split", () => {
    expect(costSplit(12000, false, 1, 4)).toBeNull();
    expect(costSplit(null, true, 1, 4)).toBeNull();
  });
  it("shows the full-group split before anyone joins", () => {
    expect(costSplit(12000, true, 0, 4)).toEqual({ cents: 3000, note: "se lotar" });
  });
  it("splits among approved members plus the creator, rounding up", () => {
    expect(costSplit(10000, true, 2, 6)).toEqual({ cents: 3334, note: "com 3 pessoas" });
  });
});

describe("joinErrorMessage", () => {
  it("maps database errors to Portuguese", () => {
    expect(joinErrorMessage("activity is full")).toBe("A roda já está lotada.");
    expect(joinErrorMessage("verification pending")).toMatch(/verificação/);
    expect(joinErrorMessage(undefined)).toMatch(/Tente de novo/);
  });
});

describe("cleanMessage", () => {
  it("trims and enforces 1–1000 characters", () => {
    expect(cleanMessage("  oi  ")).toBe("oi");
    expect(cleanMessage("   ")).toBeNull();
    expect(cleanMessage("a".repeat(1001))).toBeNull();
    expect(cleanMessage("a".repeat(1000))).toHaveLength(1000);
  });
});
