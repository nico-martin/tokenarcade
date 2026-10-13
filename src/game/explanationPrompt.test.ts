import { expect, it } from "vitest";
import { explanationMessages } from "./explanationPrompt";

it("supplies constraints and exact proposed text with visible JSON-escaped whitespace", () => {
  const messages = explanationMessages(
    { prompt: "Flip a coin", format: { type: "regex", regex: "(heads|tails)" } },
    50390,
    "",
    " tails",
    " tails",
    false,
    false
  );
  expect(messages[1].content).toContain('"proposedResponse": " tails"');
  expect(messages[1].content).toContain('"tokenText": " tails"');
  expect(messages[1].content).toContain("(heads|tails)");
  expect(messages[0].content).toContain("must still be extendable");
  expect(messages[0].content).toContain("say so rather than inventing");
});

it("tells the model when a complete regex response can end with EOS", () => {
  const messages = explanationMessages(
    { prompt: "Flip a coin", format: { type: "regex", regex: "(heads|tails)" } },
    12,
    "tails",
    "x",
    "tailsx",
    false,
    true
  );
  expect(messages[1].content).toContain('"currentResponseCanEnd": true');
  expect(messages[1].content).toContain("The processor permits EOS now");
  expect(messages[0].content).toContain("Do not assume EOS is the only allowed choice");
});

it("does not treat a rejected EOS as literal appended text and identifies open strings", () => {
  const messages = explanationMessages(
    { prompt: "Return JSON", format: { type: "json_object" } },
    1,
    '{"name":"ab\\"c',
    "[EOS]",
    '{"name":"ab\\"c [EOS]',
    true,
    false
  );
  expect(messages[1].content).toContain('"isEndOfSequence": true');
  expect(messages[1].content).toContain('"jsonStringIsOpen": true');
  expect(messages[1].content).toContain('"currentResponseCanEnd": false');
  const data = JSON.parse(messages[1].content.slice(messages[1].content.indexOf("{"))) as {
    proposedResponse: string;
  };
  expect(data.proposedResponse).toBe('{"name":"ab\\"c');
  expect(messages[0].content).toContain("NOT necessarily the entire response");
});
