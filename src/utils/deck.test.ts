import { expect, it } from "vitest";
import { buildDeck, CARDS_PER_HAND } from "./deck";

it("deals twelve desktop rows with a permitted choice outside the top candidates", () => {
  const order = Uint32Array.from({ length: 80 }, (_, id) => id);
  const deck = buildDeck(order, (id) => id === 64);
  expect(CARDS_PER_HAND).toBe(48);
  expect(deck).toHaveLength(CARDS_PER_HAND);
  expect(new Set(deck).size).toBe(CARDS_PER_HAND);
  expect(deck).toContain(64);
  expect(deck).not.toContain(47);
  expect(Array.from(deck)).toEqual([...Array.from({ length: 47 }, (_, id) => id), 64]);
});

it("doesn't replace cards when the top candidates are already playable", () => {
  expect(Array.from(buildDeck(new Uint32Array([9, 3, 7]), (id) => id === 3))).toEqual([9, 3, 7]);
});
