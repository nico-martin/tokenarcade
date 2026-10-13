export function tokenText(label: string): string {
  return label
    .replaceAll("Ġ", " ")
    .replaceAll("▁", " ")
    .replaceAll("Ċ", "\n")
    .replaceAll("ĉ", "\t");
}

export function visibleWhitespace(text: string): string {
  return text.replaceAll(" ", "␠").replaceAll("\n", "\\n").replaceAll("\t", "\\t");
}

export function readableToken(label: string): string {
  if (label === "[EOS]") return "[EOS]";
  return visibleWhitespace(tokenText(label));
}
