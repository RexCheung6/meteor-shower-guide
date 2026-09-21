import { beforeEach, describe, expect, it } from "vitest";
import { hasAccount, isLoggedIn, login, logout, register } from "../src/auth";

describe("local account auth", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("registers, creates a session, and logs out", async () => {
    expect(hasAccount()).toBe(false);
    await register("observer", "starry-night");
    expect(hasAccount()).toBe(true);
    expect(isLoggedIn()).toBe(true);
    logout();
    expect(isLoggedIn()).toBe(false);
  });

  it("accepts the correct password and rejects the wrong one", async () => {
    await register("observer", "starry-night");
    logout();
    await expect(login("observer", "wrong-password")).rejects.toThrow("invalid-credentials");
    expect(isLoggedIn()).toBe(false);
    await login("observer", "starry-night");
    expect(isLoggedIn()).toBe(true);
  });

  it("rejects a wrong username", async () => {
    await register("observer", "starry-night");
    logout();
    await expect(login("someone-else", "starry-night")).rejects.toThrow("invalid-credentials");
  });

  it("refuses a second account in the same browser", async () => {
    await register("observer", "starry-night");
    await expect(register("second", "another-pass")).rejects.toThrow("account-exists");
  });
});
