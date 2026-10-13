export default function cn(...classes: (string | Record<string, boolean>)[]): string {
  return classes
    .map((entry) =>
      typeof entry === "string"
        ? entry
        : Object.entries(entry)
            .filter(([, enabled]) => enabled)
            .map(([name]) => name)
            .join(" ")
    )
    .filter(Boolean)
    .join(" ");
}
