import type { ConstraintType } from "./types";

export interface Preset {
  name: string;
  type: ConstraintType;
  prompt: string;
  constraint: string;
}

export const PRESETS: Preset[] = [
  {
    name: "A tiny creature",
    type: "json_schema",
    prompt:
      "Invent a tiny fantasy creature. Return a JSON object with its name, element, and power level. Keep its name short.",
    constraint: JSON.stringify(
      {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1, maxLength: 12 },
          element: { enum: ["fire", "water", "earth"] },
          power: { type: "integer", minimum: 1, maximum: 9 },
        },
        required: ["name", "element", "power"],
        additionalProperties: false,
      },
      null,
      2
    ),
  },
  {
    name: "Heads or tails",
    type: "regex",
    prompt: "Flip a coin. Reply with exactly heads or tails, nothing else.",
    constraint: "(heads|tails)",
  },
  {
    name: "A calendar date",
    type: "regex",
    prompt: "Give a date in 2026 in YYYY-MM-DD format. Reply only with the date.",
    constraint: "2026-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])",
  },
  {
    name: "Anything JSON",
    type: "json_object",
    prompt: "Describe a friendly robot in a short JSON object. Use at most two properties.",
    constraint: "",
  },
];
