import { describe, expect, it } from "vitest";
import { adminTokenOk, requestToken } from "./adminOverview";

describe("admin overview auth", () => {
  it("rejects when no token is configured", () => {
    expect(adminTokenOk("anything", undefined)).toBe(false);
    expect(adminTokenOk("anything", "")).toBe(false);
  });

  it("rejects empty, wrong or length-mismatched tokens", () => {
    expect(adminTokenOk("", "secret-token")).toBe(false);
    expect(adminTokenOk("secret-tokeX", "secret-token")).toBe(false);
    expect(adminTokenOk("secret", "secret-token")).toBe(false);
    expect(adminTokenOk(undefined, "secret-token")).toBe(false);
  });

  it("accepts the exact configured token", () => {
    expect(adminTokenOk("secret-token", "secret-token")).toBe(true);
  });

  it("reads token from query or bearer header", () => {
    expect(
      requestToken({ query: { token: "abc" }, headers: {} } as never)
    ).toBe("abc");
    expect(
      requestToken({
        query: {},
        headers: { authorization: "Bearer xyz" },
      } as never)
    ).toBe("xyz");
    expect(requestToken({ query: {}, headers: {} } as never)).toBe("");
  });
});
