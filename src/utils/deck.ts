export const CARDS_PER_HAND = 48;

/** Keep a playable hand without exposing which cards are permitted. */
export function buildDeck(order: Uint32Array, isAllowed: (id: number) => boolean): Uint32Array {
  const cards = Array.from(order.slice(0, CARDS_PER_HAND));
  if (!cards.some(isAllowed)) {
    const valid = order.find(isAllowed);
    if (valid === undefined) throw new Error("No playable tokens remain.");
    cards[cards.length - 1] = valid;
  }
  return Uint32Array.from(cards);
}
