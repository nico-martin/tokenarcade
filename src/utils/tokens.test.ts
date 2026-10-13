import { expect, it } from "vitest";
import { readableToken, tokenText, visibleWhitespace } from "./tokens";

it("shows literal quotes and backslashes without JSON wrapping or escaping", () => {
  expect(readableToken('Ġ"')).toBe('␠"');
  expect(readableToken('"')).toBe('"');
  expect(readableToken('Ġ"\\')).toBe('␠"\\');
  expect(readableToken("hello")).toBe("hello");
});

it("marks leading, trailing, repeated, and space-only tokens", () => {
  expect(readableToken("ĠhelloĠ")).toBe("␠hello␠");
  expect(readableToken(" tails ")).toBe("␠tails␠");
  expect(readableToken("▁tails▁")).toBe("␠tails␠");
  expect(readableToken("ĠĠ")).toBe("␠␠");
  expect(readableToken("a b")).toBe("a␠b");
});

it("keeps invisible control tokens readable and raw text available for search", () => {
  expect(readableToken("Ċĉ")).toBe("\\n\\t");
  expect(readableToken("[EOS]")).toBe("[EOS]");
  expect(tokenText("ĠtailsĠ")).toBe(" tails ");
  expect(visibleWhitespace(" tails\n\t")).toBe("␠tails\\n\\t");
});
