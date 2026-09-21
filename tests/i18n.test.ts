import { describe, expect, it } from "vitest";
import zh from "../src/i18n/locales/zh";
import en from "../src/i18n/locales/en";

function leafKeys(obj: unknown, prefix = ""): string[] {
  if (obj === null || typeof obj !== "object") return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => leafKeys(v, prefix ? `${prefix}.${k}` : k));
}

describe("i18n resources", () => {
  it("zh and en expose exactly the same keys", () => {
    const zhKeys = leafKeys(zh).sort();
    const enKeys = leafKeys(en).sort();
    expect(zhKeys).toEqual(enKeys);
  });

  it("translation values are non-empty strings", () => {
    for (const key of leafKeys(en)) {
      const value = key.split(".").reduce<unknown>((acc, part) => (acc as Record<string, unknown>)?.[part], en);
      expect(typeof value).toBe("string");
      expect((value as string).length).toBeGreaterThan(0);
    }
  });
});
