import type { Card, Deck, Review, Settings, ExportData, InsertCard, InsertDeck } from "@shared/schema";

const STORAGE_KEYS = {
  CARDS: "srs_cards",
  DECKS: "srs_decks",
  REVIEWS: "srs_reviews",
  SETTINGS: "srs_settings",
} as const;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to save to localStorage: ${key}`, error);
  }
}

export function getCards(): Card[] {
  return getFromStorage<Card[]>(STORAGE_KEYS.CARDS, []);
}

export function saveCards(cards: Card[]): void {
  saveToStorage(STORAGE_KEYS.CARDS, cards);
}

export function getCard(id: string): Card | undefined {
  return getCards().find((c) => c.id === id);
}

export function createCard(data: InsertCard): Card {
  const cards = getCards();
  const now = new Date().toISOString();
  const card: Card = {
    ...data,
    id: generateId(),
    sentence: data.sentence || "",
    association: data.association || "",
    isStarred: data.isStarred || false,
    tags: data.tags || [],
    easeFactor: data.easeFactor || 2.5,
    interval: data.interval || 0,
    repetitions: data.repetitions || 0,
    nextReviewDate: data.nextReviewDate || now,
    createdAt: now,
  };
  cards.push(card);
  saveCards(cards);
  updateDeckCardCount(card.deckId);
  return card;
}

export function updateCard(id: string, updates: Partial<Card>): Card | undefined {
  const cards = getCards();
  const index = cards.findIndex((c) => c.id === id);
  if (index === -1) return undefined;
  
  cards[index] = { ...cards[index], ...updates };
  saveCards(cards);
  return cards[index];
}

export function deleteCard(id: string): boolean {
  const cards = getCards();
  const card = cards.find((c) => c.id === id);
  if (!card) return false;
  
  const filtered = cards.filter((c) => c.id !== id);
  saveCards(filtered);
  updateDeckCardCount(card.deckId);
  return true;
}

export function getCardsByDeck(deckId: string): Card[] {
  return getCards().filter((c) => c.deckId === deckId);
}

export function getDecks(): Deck[] {
  return getFromStorage<Deck[]>(STORAGE_KEYS.DECKS, []);
}

export function saveDecks(decks: Deck[]): void {
  saveToStorage(STORAGE_KEYS.DECKS, decks);
}

export function getDeck(id: string): Deck | undefined {
  return getDecks().find((d) => d.id === id);
}

export function createDeck(data: InsertDeck): Deck {
  const decks = getDecks();
  const deck: Deck = {
    ...data,
    id: generateId(),
    description: data.description || "",
    createdAt: new Date().toISOString(),
    cardCount: 0,
  };
  decks.push(deck);
  saveDecks(decks);
  return deck;
}

export function updateDeck(id: string, updates: Partial<Deck>): Deck | undefined {
  const decks = getDecks();
  const index = decks.findIndex((d) => d.id === id);
  if (index === -1) return undefined;
  
  decks[index] = { ...decks[index], ...updates };
  saveDecks(decks);
  return decks[index];
}

export function deleteDeck(id: string): boolean {
  const decks = getDecks().filter((d) => d.id !== id);
  saveDecks(decks);
  const cards = getCards().filter((c) => c.deckId !== id);
  saveCards(cards);
  return true;
}

export function updateDeckCardCount(deckId: string): void {
  const count = getCardsByDeck(deckId).length;
  updateDeck(deckId, { cardCount: count });
}

export function getReviews(): Review[] {
  return getFromStorage<Review[]>(STORAGE_KEYS.REVIEWS, []);
}

export function saveReviews(reviews: Review[]): void {
  saveToStorage(STORAGE_KEYS.REVIEWS, reviews);
}

export function addReview(review: Omit<Review, "id">): Review {
  const reviews = getReviews();
  const newReview: Review = {
    ...review,
    id: generateId(),
  };
  reviews.push(newReview);
  saveReviews(reviews);
  return newReview;
}

export function getSettings(): Settings {
  return getFromStorage<Settings>(STORAGE_KEYS.SETTINGS, {
    weekendLearnerMode: false,
    weekdayNewCards: 5,
    weekendNewCards: 15,
    weekdayReviewCards: 20,
    weekendReviewCards: 50,
    prioritizeStarred: true,
    weeklyCardTarget: 50,
  });
}

export function saveSettings(settings: Settings): void {
  saveToStorage(STORAGE_KEYS.SETTINGS, settings);
}

export function importCards(
  cardsData: Array<{ armenian: string; russian: string; sentence?: string; association?: string }>,
  deckId: string,
  updateExisting: boolean = true
): { imported: number; updated: number; skipped: number } {
  const existingCards = getCards();
  let imported = 0;
  let updated = 0;
  let skipped = 0;

  for (const data of cardsData) {
    const existing = existingCards.find(
      (c) => c.armenian === data.armenian && c.deckId === deckId
    );

    if (existing) {
      if (updateExisting) {
        updateCard(existing.id, {
          russian: data.russian,
          sentence: data.sentence || "",
          association: data.association || "",
        });
        updated++;
      } else {
        skipped++;
      }
    } else {
      createCard({
        armenian: data.armenian,
        russian: data.russian,
        sentence: data.sentence || "",
        association: data.association || "",
        deckId,
        isStarred: false,
        tags: [],
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
      });
      imported++;
    }
  }

  return { imported, updated, skipped };
}

export function exportAllData(): ExportData {
  return {
    cards: getCards(),
    decks: getDecks(),
    reviews: getReviews(),
    settings: getSettings(),
    exportedAt: new Date().toISOString(),
  };
}

export function exportCardsToCSV(cards: Card[]): string {
  const headers = ["armenian", "russian", "sentence", "association", "isStarred"];
  const rows = cards.map((card) => [
    escapeCSV(card.armenian),
    escapeCSV(card.russian),
    escapeCSV(card.sentence || ""),
    escapeCSV(card.association || ""),
    card.isStarred ? "true" : "false",
  ]);
  
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export function exportReviewsToCSV(reviews: Review[]): string {
  const headers = ["cardId", "quality", "reviewedAt", "previousInterval", "newInterval"];
  const cards = getCards();
  
  const rows = reviews.map((review) => {
    const card = cards.find((c) => c.id === review.cardId);
    return [
      card?.armenian || review.cardId,
      review.quality.toString(),
      review.reviewedAt,
      review.previousInterval.toString(),
      review.newInterval.toString(),
    ];
  });
  
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function parseCSV(csv: string, separator: "," | ";" = ","): Array<{ armenian: string; russian: string; sentence?: string; association?: string }> {
  const lines = csv.trim().split("\n");
  const results: Array<{ armenian: string; russian: string; sentence?: string; association?: string }> = [];
  
  const startIndex = lines[0]?.toLowerCase().includes("armenian") ? 1 : 0;
  
  for (let i = startIndex; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], separator);
    if (values.length >= 2 && values[0].trim() && values[1].trim()) {
      results.push({
        armenian: values[0].trim(),
        russian: values[1].trim(),
        sentence: values[2]?.trim() || undefined,
        association: values[3]?.trim() || undefined,
      });
    }
  }
  
  return results;
}

function parseCSVLine(line: string, separator: "," | ";" = ","): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  
  return result;
}

export function importFullData(data: ExportData): void {
  saveCards(data.cards);
  saveDecks(data.decks);
  saveReviews(data.reviews);
  saveSettings(data.settings);
}

export function initializeSampleData(): void {
  const decks = getDecks();
  if (decks.length > 0) return;
  
  const sampleDeck = createDeck({
    name: "Week 1",
    description: "First week vocabulary",
  });
  
  const sampleCards = [
    { armenian: "գիրք", russian: "книга", sentence: "Իմ գիրքը սեղանի վրա է։", association: "гирька упала на книгу" },
    { armenian: "սուրճ", russian: "кофе", sentence: "Ես սուրճ եմ խմում առավոտյան։", association: "" },
    { armenian: "ջուր", russian: "вода", sentence: "Խնդրում եմ ինձ ջուր տվեք։", association: "" },
    { armenian: "սեղան", russian: "стол", sentence: "Գիրքը սեղանի վրա է։", association: "сэр жан сидит за столом" },
    { armenian: "դուռ", russian: "дверь", sentence: "Բաց դուռը։", association: "" },
  ];
  
  for (const cardData of sampleCards) {
    createCard({
      ...cardData,
      deckId: sampleDeck.id,
      isStarred: false,
      tags: [],
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
    });
  }
}
