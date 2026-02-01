import { 
  decks, cards, reviews, settings,
  type Deck, type InsertDeck,
  type Card, type InsertCard,
  type Review, type InsertReview,
  type Settings, type InsertSettings,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, lte, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface IStorage {
  // Decks
  getDecks(): Promise<Deck[]>;
  getDeck(id: string): Promise<Deck | undefined>;
  createDeck(deck: InsertDeck): Promise<Deck>;
  updateDeck(id: string, deck: Partial<InsertDeck>): Promise<Deck | undefined>;
  deleteDeck(id: string): Promise<boolean>;
  
  // Cards
  getCards(deckId?: string): Promise<Card[]>;
  getCard(id: string): Promise<Card | undefined>;
  getCardByArmenian(armenian: string, deckId: string): Promise<Card | undefined>;
  getDueCards(deckId?: string): Promise<Card[]>;
  getNewCards(deckId?: string): Promise<Card[]>;
  getStarredCards(deckId?: string): Promise<Card[]>;
  getInactiveCards(deckId?: string): Promise<Card[]>;
  createCard(card: InsertCard): Promise<Card>;
  updateCard(id: string, card: Partial<Card>): Promise<Card | undefined>;
  deleteCard(id: string): Promise<boolean>;
  
  // Reviews
  getReviews(cardId?: string): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  
  // Settings
  getSettings(): Promise<Settings>;
  updateSettings(settings: Partial<InsertSettings>): Promise<Settings>;
}

export class DatabaseStorage implements IStorage {
  // Decks
  async getDecks(): Promise<Deck[]> {
    return db.select().from(decks).orderBy(desc(decks.createdAt));
  }
  
  async getDeck(id: string): Promise<Deck | undefined> {
    const [deck] = await db.select().from(decks).where(eq(decks.id, id));
    return deck || undefined;
  }
  
  async createDeck(deck: InsertDeck): Promise<Deck> {
    const [newDeck] = await db.insert(decks).values({
      id: nanoid(),
      ...deck,
    }).returning();
    return newDeck;
  }
  
  async updateDeck(id: string, deck: Partial<InsertDeck>): Promise<Deck | undefined> {
    const [updated] = await db.update(decks).set(deck).where(eq(decks.id, id)).returning();
    return updated || undefined;
  }
  
  async deleteDeck(id: string): Promise<boolean> {
    const result = await db.delete(decks).where(eq(decks.id, id));
    return (result.rowCount ?? 0) > 0;
  }
  
  // Cards
  async getCards(deckId?: string): Promise<Card[]> {
    if (deckId) {
      return db.select().from(cards).where(eq(cards.deckId, deckId)).orderBy(desc(cards.createdAt));
    }
    return db.select().from(cards).orderBy(desc(cards.createdAt));
  }
  
  async getCard(id: string): Promise<Card | undefined> {
    const [card] = await db.select().from(cards).where(eq(cards.id, id));
    return card || undefined;
  }
  
  async getCardByArmenian(armenian: string, deckId: string): Promise<Card | undefined> {
    const [card] = await db.select().from(cards).where(
      and(eq(cards.armenian, armenian), eq(cards.deckId, deckId))
    );
    return card || undefined;
  }
  
  async getDueCards(deckId?: string): Promise<Card[]> {
    const now = new Date();
    if (deckId) {
      return db.select().from(cards).where(
        and(eq(cards.deckId, deckId), lte(cards.nextReviewDate, now), eq(cards.isActive, true))
      );
    }
    return db.select().from(cards).where(and(lte(cards.nextReviewDate, now), eq(cards.isActive, true)));
  }
  
  async getNewCards(deckId?: string): Promise<Card[]> {
    if (deckId) {
      return db.select().from(cards).where(
        and(eq(cards.deckId, deckId), eq(cards.repetitions, 0), eq(cards.isActive, true))
      );
    }
    return db.select().from(cards).where(and(eq(cards.repetitions, 0), eq(cards.isActive, true)));
  }
  
  async getInactiveCards(deckId?: string): Promise<Card[]> {
    if (deckId) {
      return db.select().from(cards).where(
        and(eq(cards.deckId, deckId), eq(cards.isActive, false))
      );
    }
    return db.select().from(cards).where(eq(cards.isActive, false));
  }
  
  async getStarredCards(deckId?: string): Promise<Card[]> {
    if (deckId) {
      return db.select().from(cards).where(
        and(eq(cards.deckId, deckId), eq(cards.isStarred, true))
      );
    }
    return db.select().from(cards).where(eq(cards.isStarred, true));
  }
  
  async createCard(card: InsertCard): Promise<Card> {
    const [newCard] = await db.insert(cards).values({
      id: nanoid(),
      ...card,
      nextReviewDate: card.nextReviewDate || new Date(),
    }).returning();
    return newCard;
  }
  
  async updateCard(id: string, card: Partial<Card>): Promise<Card | undefined> {
    const [updated] = await db.update(cards).set(card).where(eq(cards.id, id)).returning();
    return updated || undefined;
  }
  
  async deleteCard(id: string): Promise<boolean> {
    const result = await db.delete(cards).where(eq(cards.id, id));
    return (result.rowCount ?? 0) > 0;
  }
  
  // Reviews
  async getReviews(cardId?: string): Promise<Review[]> {
    if (cardId) {
      return db.select().from(reviews).where(eq(reviews.cardId, cardId)).orderBy(desc(reviews.reviewedAt));
    }
    return db.select().from(reviews).orderBy(desc(reviews.reviewedAt));
  }
  
  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db.insert(reviews).values({
      id: nanoid(),
      ...review,
    }).returning();
    return newReview;
  }
  
  // Settings
  async getSettings(): Promise<Settings> {
    const [existingSettings] = await db.select().from(settings).where(eq(settings.id, 1));
    if (existingSettings) {
      return existingSettings;
    }
    // Create default settings
    const [defaultSettings] = await db.insert(settings).values({
      id: 1,
      weekendLearnerMode: false,
      weekdayNewCards: 5,
      weekendNewCards: 15,
      weekdayReviewCards: 20,
      weekendReviewCards: 50,
      prioritizeStarred: true,
      weeklyCardTarget: 50,
    }).returning();
    return defaultSettings;
  }
  
  async updateSettings(newSettings: Partial<InsertSettings>): Promise<Settings> {
    // Ensure settings exist first
    await this.getSettings();
    const [updated] = await db.update(settings).set(newSettings).where(eq(settings.id, 1)).returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
