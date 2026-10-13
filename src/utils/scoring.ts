export function formatProbability(probability: number): string {
  const percentage = probability * 100;
  if (percentage > 0 && percentage < 0.00001) return "<0.00001%";
  return `${percentage.toFixed(5)}%`;
}

export function pointsForAttempt(attempt: number): number {
  if (!Number.isInteger(attempt) || attempt < 1)
    throw new RangeError("Attempt must be a positive integer.");
  return 100 / 2 ** (attempt - 1);
}

export function averageScore(points: number, tokens: number): number {
  return tokens > 0 ? points / tokens : 0;
}

export function softmax(logits: ArrayLike<number>): Float32Array {
  let max = -Infinity;
  for (let i = 0; i < logits.length; i++) max = Math.max(max, logits[i]);
  if (!Number.isFinite(max)) throw new Error("Model returned no finite logits.");
  const probabilities = new Float32Array(logits.length);
  let sum = 0;
  for (let i = 0; i < logits.length; i++) {
    probabilities[i] = Math.exp(logits[i] - max);
    sum += probabilities[i];
  }
  for (let i = 0; i < probabilities.length; i++) probabilities[i] /= sum;
  return probabilities;
}

export function formatPoints(points: number): string {
  return points.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
