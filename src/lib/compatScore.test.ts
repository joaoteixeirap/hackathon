import { expect, test } from "vitest";
import { compatScore } from "./compatScore";
test("compatibility is bounded and missing data never adds points", () => {
  expect(compatScore(0, 0, false)).toBe(0);
  expect(compatScore(-10, NaN, false)).toBe(0);
  expect(compatScore(365, 6, true)).toBe(100);
});
test("overlap, shared interests and non-flexible rhythm have the SQL weights", () => {
  expect(compatScore(15, 2, true)).toBe(65);
  expect(compatScore(7, 1, false)).toBe(21.7);
  expect(compatScore(30, 0, false)).toBe(50);
});
