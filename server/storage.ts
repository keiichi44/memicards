import { 
  projects, decks, cards, reviews, settings,
  type Project, type InsertProject,
  type Deck, type InsertDeck,
  type Card, type InsertCard,
  type Review, type InsertReview,
  type Settings, type InsertSettings,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, lte, desc, isNull, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface IStorage {
  getProjects(userId: string): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;

  getDecks(userId: string, projectId?: string): Promise<Deck[]>;
  getDeck(id: string): Promise<Deck | undefined>;
  createDeck(deck: InsertDeck): Promise<Deck>;
  updateDeck(id: string, deck: Partial<InsertDeck>): Promise<Deck | undefined>;
  deleteDeck(id: string): Promise<boolean>;
  
  getCards(deckId?: string): Promise<Card[]>;
  getCardsByProject(projectId: string, userId: string): Promise<Card[]>;
  getCard(id: string): Promise<Card | undefined>;
  getCardByArmenian(armenian: string, deckId: string): Promise<Card | undefined>;
  getDueCards(deckId?: string): Promise<Card[]>;
  getNewCards(deckId?: string): Promise<Card[]>;
  getStarredCards(deckId?: string): Promise<Card[]>;
  getInactiveCards(deckId?: string): Promise<Card[]>;
  createCard(card: InsertCard): Promise<Card>;
  updateCard(id: string, card: Partial<Card>): Promise<Card | undefined>;
  deleteCard(id: string): Promise<boolean>;
  
  getReviews(cardId?: string): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  
  getSettings(userId: string, projectId?: string): Promise<Settings>;
  updateSettings(userId: string, newSettings: Partial<InsertSettings>, projectId?: string): Promise<Settings>;

  assignUnownedDecks(userId: string): Promise<number>;
  ensureDefaultProject(userId: string): Promise<Project>;
  migrateDataToProject(userId: string, projectId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getProjects(userId: string): Promise<Project[]> {
    return db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.createdAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values({
      id: nanoid(),
      ...project,
    }).returning();
    return newProject;
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined> {
    const [updated] = await db.update(projects).set(project).where(eq(projects.id, id)).returning();
    return updated || undefined;
  }

  async deleteProject(id: string): Promise<boolean> {
    const projectDecks = await db.select().from(decks).where(eq(decks.projectId, id));
    for (const deck of projectDecks) {
      await db.delete(decks).where(eq(decks.id, deck.id));
    }
    await db.delete(settings).where(eq(settings.projectId, id));
    const result = await db.delete(projects).where(eq(projects.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async ensureDefaultProject(userId: string): Promise<Project> {
    const existing = await this.getProjects(userId);
    if (existing.length > 0) {
      return existing[existing.length - 1];
    }
    const project = await this.createProject({
      name: "Learning project",
      userId,
    });
    return project;
  }

  async migrateDataToProject(userId: string, projectId: string): Promise<void> {
    await db.update(decks).set({ projectId }).where(
      and(eq(decks.userId, userId), isNull(decks.projectId))
    );
    await db.update(settings).set({ projectId }).where(
      and(eq(settings.userId, userId), isNull(settings.projectId))
    );
  }

  async getDecks(userId: string, projectId?: string): Promise<Deck[]> {
    if (projectId) {
      return db.select().from(decks).where(
        and(eq(decks.userId, userId), eq(decks.projectId, projectId))
      ).orderBy(desc(decks.createdAt));
    }
    return db.select().from(decks).where(eq(decks.userId, userId)).orderBy(desc(decks.createdAt));
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
  
  async getCards(deckId?: string): Promise<Card[]> {
    if (deckId) {
      return db.select().from(cards).where(eq(cards.deckId, deckId)).orderBy(desc(cards.createdAt));
    }
    return db.select().from(cards).orderBy(desc(cards.createdAt));
  }

  async getCardsByProject(projectId: string, userId: string): Promise<Card[]> {
    const projectDecks = await db.select().from(decks).where(
      and(eq(decks.userId, userId), eq(decks.projectId, projectId))
    );
    if (projectDecks.length === 0) return [];
    const deckIds = projectDecks.map(d => d.id);
    return db.select().from(cards).where(inArray(cards.deckId, deckIds)).orderBy(desc(cards.createdAt));
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
  
  async getSettings(userId: string, projectId?: string): Promise<Settings> {
    if (projectId) {
      const [existingSettings] = await db.select().from(settings).where(
        and(eq(settings.userId, userId), eq(settings.projectId, projectId))
      );
      if (existingSettings) return existingSettings;
      const nextId = Date.now();
      const [defaultSettings] = await db.insert(settings).values({
        id: nextId,
        userId,
        projectId,
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
    const [existingSettings] = await db.select().from(settings).where(eq(settings.userId, userId));
    if (existingSettings) return existingSettings;
    const [oldSettings] = await db.select().from(settings).where(isNull(settings.userId));
    if (oldSettings) {
      const [claimed] = await db.update(settings).set({ userId }).where(eq(settings.id, oldSettings.id)).returning();
      return claimed;
    }
    const nextId = Date.now();
    const [defaultSettings] = await db.insert(settings).values({
      id: nextId,
      userId,
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
  
  async updateSettings(userId: string, newSettings: Partial<InsertSettings>, projectId?: string): Promise<Settings> {
    await this.getSettings(userId, projectId);
    if (projectId) {
      const [updated] = await db.update(settings).set(newSettings).where(
        and(eq(settings.userId, userId), eq(settings.projectId, projectId))
      ).returning();
      return updated;
    }
    const [updated] = await db.update(settings).set(newSettings).where(eq(settings.userId, userId)).returning();
    return updated;
  }

  async assignUnownedDecks(userId: string): Promise<number> {
    const unowned = await db.select().from(decks).where(isNull(decks.userId));
    if (unowned.length === 0) return 0;
    await db.update(decks).set({ userId }).where(isNull(decks.userId));
    return unowned.length;
  }
}

export const storage = new DatabaseStorage();
