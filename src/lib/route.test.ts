import { describe, expect, it } from "vitest";
import { addStop, formatDistance, formatDuration, moveStop, parseStoredRoute, removeStop, ROUTE_MAX, routeMeters, walkMinutes, type RouteStop } from "./route";

const stop = (id: string, lat = -23.96, lng = -46.33): RouteStop => ({ kind: "place", id, name: id, lat, lng });

describe("route editing", () => {
  it("adds without duplicates and up to five stops", () => {
    let r: RouteStop[] = [];
    for (const id of ["a", "b", "a", "c", "d", "e", "f"]) r = addStop(r, stop(id));
    expect(r.map((s) => s.id)).toEqual(["a", "b", "c", "d", "e"]);
    expect(r).toHaveLength(ROUTE_MAX);
  });
  it("treats a place and an activity with the same id as different stops", () => {
    const r = addStop([stop("x")], { ...stop("x"), kind: "activity" });
    expect(r).toHaveLength(2);
  });
  it("removes and reorders", () => {
    const r = [stop("a"), stop("b"), stop("c")];
    expect(removeStop(r, { kind: "place", id: "b" }).map((s) => s.id)).toEqual(["a", "c"]);
    expect(moveStop(r, 2, -1).map((s) => s.id)).toEqual(["a", "c", "b"]);
    expect(moveStop(r, 0, -1)).toBe(r);
  });
});

describe("distance and time", () => {
  it("sums straight-line legs in order", () => {
    // ~1.11 km per 0.01° of latitude
    const r = [stop("a", -23.96, -46.33), stop("b", -23.97, -46.33), stop("c", -23.98, -46.33)];
    expect(routeMeters(r)).toBeGreaterThan(2200);
    expect(routeMeters(r)).toBeLessThan(2250);
    expect(routeMeters([stop("a")])).toBe(0);
  });
  it("estimates walking time at 4.5 km/h and formats it", () => {
    expect(walkMinutes(4500)).toBe(60);
    expect(formatDuration(30)).toBe("30 min");
    expect(formatDuration(75)).toBe("1 h 15 min");
    expect(formatDistance(640)).toBe("640 m");
    expect(formatDistance(2230)).toBe("2,2 km");
  });
});

describe("parseStoredRoute", () => {
  it("drops malformed data", () => {
    expect(parseStoredRoute(null)).toEqual([]);
    expect(parseStoredRoute("{oops")).toEqual([]);
    expect(parseStoredRoute(JSON.stringify([stop("a"), { kind: "x", id: 1 }]))).toEqual([stop("a")]);
  });
});
