import { z } from "zod";

export const cardSchema = z.object({
  id: z.string(),
  armenian: z.string().min(1, "Armenian word is required"),
  russian: z.string().min(1, "Russian translation is required"),
  sentence: z.string().optional().default(""),
  association: z.string().optional().default(""),
  isStarred: z.boolean().default(false),
  deckId: z.string(),
  tags: z.array(z.string()).default([]),
  easeFactor: z.number().default(2.5),
  interval: z.number().default(0),
  repetitions: z.number().default(0),
  nextReviewDate: z.string(),
  lastReviewDate: z.string().optional(),
  createdAt: z.string(),
});

export const insertCardSchema = cardSchema.omit({ id: true, createdAt: true }).extend({
  nextReviewDate: z.string().optional(),
});

export type Card = z.infer<typeof cardSchema>;
export type InsertCard = z.infer<typeof insertCardSchema>;

export const deckSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Deck name is required"),
  description: z.string().optional().default(""),
  createdAt: z.string(),
  cardCount: z.number().default(0),
});

export const insertDeckSchema = deckSchema.omit({ id: true, createdAt: true, cardCount: true });

export type Deck = z.infer<typeof deckSchema>;
export type InsertDeck = z.infer<typeof insertDeckSchema>;

export const reviewSchema = z.object({
  id: z.string(),
  cardId: z.string(),
  quality: z.number().min(0).max(5),
  reviewedAt: z.string(),
  previousInterval: z.number(),
  newInterval: z.number(),
});

export type Review = z.infer<typeof reviewSchema>;

export const settingsSchema = z.object({
  weekendLearnerMode: z.boolean().default(false),
  weekdayNewCards: z.number().default(5),
  weekendNewCards: z.number().default(15),
  weekdayReviewCards: z.number().default(20),
  weekendReviewCards: z.number().default(50),
  prioritizeStarred: z.boolean().default(true),
  weeklyCardTarget: z.number().default(50),
});

export type Settings = z.infer<typeof settingsSchema>;

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

export const exportDataSchema = z.object({
  cards: z.array(cardSchema),
  decks: z.array(deckSchema),
  reviews: z.array(reviewSchema),
  settings: settingsSchema,
  exportedAt: z.string(),
});

export type ExportData = z.infer<typeof exportDataSchema>;

export const cardFilterSchema = z.object({
  filter: z.enum(["all", "due", "new", "starred"]).default("all"),
  deckId: z.string().optional(),
  searchQuery: z.string().optional(),
});

export type CardFilter = z.infer<typeof cardFilterSchema>;

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
