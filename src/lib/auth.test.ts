import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
const { safeNext } = await import("./auth");

describe("safeNext", () => {
  it("keeps relative paths", () => {
    expect(safeNext("/perfil")).toBe("/perfil");
  });

  it("rejects absolute and protocol-relative URLs", () => {
    expect(safeNext("https://evil.example")).toBe("/");
    expect(safeNext("//evil.example")).toBe("/");
    expect(safeNext(null, "/mapa")).toBe("/mapa");
  });
});
