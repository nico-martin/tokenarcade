import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import SetupScreen from "./SetupScreen";

it("keeps the coin challenge bound to its fixed regex with read-only fields", () => {
  const html = renderToStaticMarkup(
    <SetupScreen preset={1} error="" onPreset={vi.fn()} onStart={vi.fn()} />
  );
  expect(html).toContain("(heads|tails)");
  expect(html).toContain("Flip a coin. Reply with exactly heads or tails, nothing else.");
  expect(html.match(/readonly=""/gi)).toHaveLength(2);
  expect(html).not.toContain("<select");
  expect(html).not.toContain("Edit either field");
});

it("shows the JSON-object preset's fixed rules without a format picker", () => {
  const html = renderToStaticMarkup(
    <SetupScreen preset={3} error="" onPreset={vi.fn()} onStart={vi.fn()} />
  );
  expect(html).toContain("any valid JSON object");
  expect(html.match(/readonly=""/gi)).toHaveLength(2);
  expect(html).not.toContain("<select");
});
