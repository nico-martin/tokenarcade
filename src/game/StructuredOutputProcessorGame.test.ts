import { Tensor } from "@huggingface/transformers";
import type { PreTrainedTokenizer } from "@huggingface/transformers";
import { describe, expect, it } from "vitest";
import StructuredOutputProcessorGame from "./StructuredOutputProcessorGame";

// The constraint package supports token-byte sources as well as real tokenizers.
const tokenizer = {
  tokens: [...Array.from({ length: 256 }, (_, id) => [id]), []],
  eos_token_id: 256,
  special_token_ids: [256],
} as unknown as PreTrainedTokenizer;

function logits() {
  return new Tensor(
    "float32",
    Float32Array.from({ length: 260 }, (_, id) => id / 10),
    [1, 260]
  );
}

describe("StructuredOutputProcessorGame", () => {
  it("mirrors native EOS permission onto every configured termination token", () => {
    const game = new StructuredOutputProcessorGame(
      tokenizer,
      { type: "regex", regex: "a" },
      [256, 254, 255, 254]
    );
    const ids = [[0n]];
    const input = logits();
    const original = Array.from(input.data);
    game.inspect(ids, input);
    expect(game.terminationTokenIds).toEqual([256, 254, 255]);
    expect(game.canEndResponse()).toBe(false);
    for (const id of game.terminationTokenIds) expect(game.isAllowed(id)).toBe(false);
    ids[0].push(97n);
    const inspection = game.inspect(ids, input);
    expect(game.canEndResponse()).toBe(true);
    for (const id of game.terminationTokenIds) expect(game.isAllowed(id)).toBe(true);
    expect(game.isTerminationToken(254)).toBe(true);
    expect(game.isTerminationToken(97)).toBe(false);
    expect(Array.from(input.data)).toEqual(original);
    expect(inspection.probabilities[254]).toBeGreaterThan(0);
  });
  it("keeps fallback masks isolated and honors a set excluding tokenizer EOS", () => {
    const format = { type: "json_schema", json_schema: { const: "a" } } as const;
    const first = new StructuredOutputProcessorGame(tokenizer, format, [254]);
    const second = new StructuredOutputProcessorGame(tokenizer, format, [255]);
    for (const game of [first, second]) {
      const ids = [[0n]];
      for (const id of new TextEncoder().encode('"a"')) {
        game.inspect(ids, logits());
        expect(game.canEndResponse()).toBe(false);
        ids[0].push(BigInt(id));
      }
      game.inspect(ids, logits());
      expect(game.isAllowed(256)).toBe(false);
    }
    expect(first.isAllowed(254)).toBe(true);
    expect(first.isAllowed(255)).toBe(false);
    expect(second.isAllowed(254)).toBe(false);
    expect(second.isAllowed(255)).toBe(true);
  });
  it("blocks termination IDs that are otherwise valid JSON string content until completion", () => {
    const game = new StructuredOutputProcessorGame(
      tokenizer,
      { type: "json_schema", json_schema: { type: "string" } },
      [256, 120]
    );
    const ids = [[0n]];
    game.inspect(ids, logits());
    ids[0].push(34n);
    game.inspect(ids, logits());
    expect(game.isAllowed(120)).toBe(false);
    expect(game.isAllowed(121)).toBe(true);
    ids[0].push(34n);
    game.inspect(ids, logits());
    expect(game.isAllowed(120)).toBe(true);
  });
  it("validates termination IDs", () => {
    const format = { type: "regex", regex: "a" } as const;
    for (const ids of [[], [-1], [1.5]])
      expect(() => new StructuredOutputProcessorGame(tokenizer, format, ids)).toThrow(RangeError);
    const game = new StructuredOutputProcessorGame(tokenizer, format, [300]);
    expect(() => game.inspect([[0n]], logits())).toThrow(RangeError);
  });
  it("keeps original logits and probabilities, even for forbidden high-score tokens", () => {
    const game = new StructuredOutputProcessorGame(tokenizer, { type: "regex", regex: "ab" });
    const input = logits();
    const original = Array.from(input.data);
    const inspection = game.inspect([[0n]], input);
    expect(Array.from(input.data)).toEqual(original);
    expect(inspection.order[0]).toBe(259);
    expect(inspection.probabilities[259]).toBeGreaterThan(inspection.probabilities[97]);
    expect(game.isAllowed(259)).toBe(false);
    expect(game.isAllowed(97)).toBe(true);
  });
  it("does not advance on rejected guesses or repeated inspection", () => {
    const game = new StructuredOutputProcessorGame(tokenizer, { type: "regex", regex: "ab" });
    const ids = [[0n]];
    game.inspect(ids, logits());
    expect(game.isAllowed(98)).toBe(false);
    game.inspect(ids, logits());
    expect(game.isAllowed(97)).toBe(true);
    ids[0].push(97n);
    game.inspect(ids, logits());
    expect(game.isAllowed(97)).toBe(false);
    expect(game.isAllowed(98)).toBe(true);
    expect(game.isAllowed(256)).toBe(false);
    ids[0].push(98n);
    game.inspect(ids, logits());
    expect(game.isAllowed(256)).toBe(true);
    expect(game.isAllowed(98)).toBe(false);
  });
  it("separates grammar validity from negative-infinity model logits", () => {
    const game = new StructuredOutputProcessorGame(tokenizer, { type: "regex", regex: "a" });
    const input = logits();
    (input.data as Float32Array)[97] = -Infinity;
    game.inspect([[0n]], input);
    expect(game.isAllowed(97)).toBe(true);
    expect(game.isAllowed(-1)).toBe(false);
    expect(game.isAllowed(1.5)).toBe(false);
  });
  it("enforces schema constraints and permits EOS only after completion", () => {
    const game = new StructuredOutputProcessorGame(tokenizer, {
      type: "json_schema",
      json_schema: { const: { ok: true } },
    });
    const ids = [[0n]];
    for (const id of new TextEncoder().encode('{"ok":true}')) {
      game.inspect(ids, logits());
      expect(game.isAllowed(id)).toBe(true);
      expect(game.isAllowed(256)).toBe(false);
      ids[0].push(BigInt(id));
    }
    game.inspect(ids, logits());
    expect(game.isAllowed(256)).toBe(true);
  });
  it("uses the processor's effective whitespace policy", () => {
    const game = new StructuredOutputProcessorGame(tokenizer, { type: "json_object" });
    const ids = [[0n]];
    game.inspect(ids, logits());
    for (let i = 0; i < 4; i++) {
      expect(game.isAllowed(32)).toBe(true);
      ids[0].push(32n);
      game.inspect(ids, logits());
    }
    expect(game.isAllowed(32)).toBe(false);
    expect(game.isAllowed(123)).toBe(true);
  });
});
