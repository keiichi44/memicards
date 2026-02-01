import { pgTable, text, boolean, real, integer, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Drizzle Tables
export const decks = pgTable("decks", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  language: text("language").notNull().default("Language"),
  description: text("description").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cards = pgTable("cards", {
  id: text("id").primaryKey(),
  armenian: text("armenian").notNull(),
  russian: text("russian").notNull(),
  sentence: text("sentence").default(""),
  association: text("association").default(""),
  isStarred: boolean("is_starred").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  deckId: text("deck_id").notNull().references(() => decks.id, { onDelete: "cascade" }),
  easeFactor: real("ease_factor").default(2.5).notNull(),
  interval: integer("interval").default(0).notNull(),
  repetitions: integer("repetitions").default(0).notNull(),
  nextReviewDate: timestamp("next_review_date").defaultNow().notNull(),
  lastReviewDate: timestamp("last_review_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reviews = pgTable("reviews", {
  id: text("id").primaryKey(),
  cardId: text("card_id").notNull().references(() => cards.id, { onDelete: "cascade" }),
  quality: integer("quality").notNull(),
  reviewedAt: timestamp("reviewed_at").defaultNow().notNull(),
  previousInterval: integer("previous_interval").notNull(),
  newInterval: integer("new_interval").notNull(),
});

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  weekendLearnerMode: boolean("weekend_learner_mode").default(false).notNull(),
  weekdayNewCards: integer("weekday_new_cards").default(5).notNull(),
  weekendNewCards: integer("weekend_new_cards").default(15).notNull(),
  weekdayReviewCards: integer("weekday_review_cards").default(20).notNull(),
  weekendReviewCards: integer("weekend_review_cards").default(50).notNull(),
  prioritizeStarred: boolean("prioritize_starred").default(true).notNull(),
  weeklyCardTarget: integer("weekly_card_target").default(50).notNull(),
});

// Relations
export const decksRelations = relations(decks, ({ many }) => ({
  cards: many(cards),
}));

export const cardsRelations = relations(cards, ({ one, many }) => ({
  deck: one(decks, {
    fields: [cards.deckId],
    references: [decks.id],
  }),
  reviews: many(reviews),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  card: one(cards, {
    fields: [reviews.cardId],
    references: [cards.id],
  }),
}));

// Insert schemas using drizzle-zod
export const insertDeckSchema = createInsertSchema(decks).omit({ id: true, createdAt: true });
export const insertCardSchema = createInsertSchema(cards).omit({ id: true, createdAt: true }).extend({
  nextReviewDate: z.date().optional(),
});
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, reviewedAt: true });
export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true });

// Update schemas (partial versions for PATCH endpoints)
export const updateDeckSchema = insertDeckSchema.partial();
export const updateCardSchema = insertCardSchema.partial();

// Types
export type Deck = typeof decks.$inferSelect;
export type InsertDeck = z.infer<typeof insertDeckSchema>;

export type Card = typeof cards.$inferSelect;
export type InsertCard = z.infer<typeof insertCardSchema>;

export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;

export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

// Batch import schema (kept as Zod)
export const batchImportSchema = z.object({
  cards: z.array(z.object({
    armenian: z.string().min(1),
    russian: z.string().min(1),
    sentence: z.string().optional(),
    association: z.string().optional(),
  })),
  deckId: z.string(),
  updateExisting: z.boolean().default(true),
});

export type BatchImport = z.infer<typeof batchImportSchema>;

// Export data schema
export const exportDataSchema = z.object({
  cards: z.array(z.any()),
  decks: z.array(z.any()),
  reviews: z.array(z.any()),
  settings: z.any(),
  exportedAt: z.string(),
});

export type ExportData = z.infer<typeof exportDataSchema>;

// Card filter schema
export const cardFilterSchema = z.object({
  filter: z.enum(["all", "due", "new", "starred"]).default("all"),
  deckId: z.string().optional(),
  searchQuery: z.string().optional(),
});

export type CardFilter = z.infer<typeof cardFilterSchema>;

// Quality rating types
export type QualityRating = 0 | 1 | 2 | 3 | 4 | 5;

export const qualityLabels: Record<QualityRating, string> = {
  0: "Complete blackout",
  1: "Incorrect, but recognized",
  2: "Incorrect, but easy to recall",
  3: "Hard",
  4: "Good",
  5: "Easy",
};

export const simpleQualityRatings = [
  { quality: 1 as QualityRating, label: "Again", color: "destructive" },
  { quality: 2 as QualityRating, label: "Hard", color: "secondary" },
  { quality: 4 as QualityRating, label: "Good", color: "default" },
  { quality: 5 as QualityRating, label: "Easy", color: "accent" },
] as const;

// Stats interfaces
export interface DailyStats {
  date: string;
  cardsReviewed: number;
  cardsLearned: number;
  correctAnswers: number;
  totalAnswers: number;
}

export interface WeeklyProgress {
  cardsLearned: number;
  target: number;
  daysRemaining: number;
}
