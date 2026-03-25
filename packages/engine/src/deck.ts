import { Card, Suit, Rank } from "./types";

const SUITS: Suit[] = ["coins", "cups", "swords", "clubs"];
const RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, id: `${suit}-${rank}` });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j] as Card, shuffled[i] as Card];
  }
  return shuffled;
}

export function dealCards(deck: Card[], playerCount: number, cardsPerPlayer: number): {
  hands: Card[][];
  remaining: Card[];
} {
  const hands: Card[][] = Array.from({ length: playerCount }, () => []);
  const remaining = [...deck];
  for (let i = 0; i < cardsPerPlayer; i++) {
    for (let p = 0; p < playerCount; p++) {
      const card = remaining.pop();
      if (card) hands[p]?.push(card);
    }
  }
  return { hands, remaining };
}
