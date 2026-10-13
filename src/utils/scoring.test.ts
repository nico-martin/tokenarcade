import { describe, expect, it } from "vitest";
import { averageScore, formatProbability, pointsForAttempt, softmax } from "./scoring";

describe("scoring", () => {
  it("shows five decimal places and labels tiny nonzero probabilities without scientific notation", () => {
    expect(formatProbability(1.5e-13)).toBe("<0.00001%");
    expect(formatProbability(0.00000012345)).toBe("0.00001%");
    expect(formatProbability(0.12345)).toBe("12.34500%");
    expect(formatProbability(0.3)).toBe("30.00000%");
    expect(formatProbability(0.9994)).toBe("99.94000%");
    expect(formatProbability(0)).toBe("0.00000%");
  });
  it("halves the reward for each attempt, without rounding", () => {
    expect([1, 2, 3, 4, 5].map(pointsForAttempt)).toEqual([100, 50, 25, 12.5, 6.25]);
    expect(() => pointsForAttempt(0)).toThrow(RangeError);
  });
  it("averages accepted selections, including EOS", () => {
    expect(averageScore(0, 0)).toBe(0);
    expect(averageScore(150, 2)).toBe(75);
  });
});

describe("softmax", () => {
  it("is stable for large logits and preserves the full vocabulary", () => {
    const probabilities = softmax([1000, 999, -Infinity]);
    expect(probabilities[0]).toBeCloseTo(0.7310586);
    expect(probabilities[1]).toBeCloseTo(0.2689414);
    expect(probabilities[2]).toBe(0);
    expect(probabilities.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1);
  });
  it("rejects unusable distributions", () => {
    expect(() => softmax([-Infinity, -Infinity])).toThrow();
  });
});
