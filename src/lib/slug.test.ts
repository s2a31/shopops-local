import { describe, expect, it } from "vitest";

import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases, strips accents, and hyphenates", () => {
    expect(slugify("Café Crème 2")).toBe("cafe-creme-2");
  });

  it("treats composed and decomposed Unicode input identically", () => {
    const composed = "Café"; // "é" as one code point
    const decomposed = "Cafe\u0301"; // "e" + combining acute accent (U+0301)
    expect(slugify(composed)).toBe("cafe");
    expect(slugify(decomposed)).toBe("cafe");
  });

  it("strips double acute accents (Hungarian ő/ű)", () => {
    expect(slugify("Őzbőr Űrhajó")).toBe("ozbor-urhajo");
  });

  it("decomposes compatibility characters (ligatures, circled digits)", () => {
    expect(slugify("ﬁle ②")).toBe("file-2");
  });

  it("replaces letters without an ASCII decomposition with a hyphen", () => {
    expect(slugify("Straße")).toBe("stra-e");
  });

  it("returns an empty string for fully non-Latin names", () => {
    expect(slugify("Молоко")).toBe("");
    expect(slugify("¡¡¡")).toBe("");
  });

  it("collapses punctuation runs and trims edge hyphens", () => {
    expect(slugify("  --Hello,   World!--  ")).toBe("hello-world");
  });

  it("caps the length at 80 characters", () => {
    expect(slugify("a".repeat(200))).toHaveLength(80);
  });

  it("never ends with a hyphen after the length cap", () => {
    expect(slugify(`${"a".repeat(79)} b`)).toBe("a".repeat(79));
  });
});
