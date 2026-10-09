import { describe, expect, it } from "vitest";
import { needsGuestSession } from "./guest";

describe("needsGuestSession", () => {
  it("matches user-only routes and their children", () => {
    expect(needsGuestSession("/perfil")).toBe(true);
    expect(needsGuestSession("/perfil/123")).toBe(true);
    expect(needsGuestSession("/atividade/nova")).toBe(true);
    expect(needsGuestSession("/verificar")).toBe(true);
  });

  it("leaves public routes alone", () => {
    expect(needsGuestSession("/mapa/santos")).toBe(false);
    expect(needsGuestSession("/perfilx")).toBe(false);
    expect(needsGuestSession("/atividade/abc")).toBe(false);
  });
});
