import { describe, expect, it } from "vitest";
import { isLocalDbUrl } from "./db-guard.mjs";

describe("isLocalDbUrl", () => {
  it("accepts only local hosts", () => {
    expect(isLocalDbUrl("postgresql://postgres:postgres@127.0.0.1:54322/postgres")).toBe(true);
    expect(isLocalDbUrl("postgresql://postgres:postgres@localhost:54322/postgres")).toBe(true);
  });
  it("refuses hosted projects and garbage", () => {
    expect(isLocalDbUrl("postgresql://postgres.abc:pw@aws-1-sa-east-1.pooler.supabase.com:5432/postgres")).toBe(false);
    expect(isLocalDbUrl("postgresql://postgres:pw@db.abc.supabase.co:5432/postgres")).toBe(false);
    expect(isLocalDbUrl("not a url")).toBe(false);
  });
});
