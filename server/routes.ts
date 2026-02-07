import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDeckSchema, insertCardSchema, batchImportSchema, insertSettingsSchema, updateDeckSchema, updateCardSchema, duplicateDeckSchema } from "@shared/schema";
import { nanoid } from "nanoid";
import { calculateSM2 } from "./sm2";
import { clerkMiddleware, getAuth, requireAuth } from "@clerk/express";

function getUserId(req: Request): string {
  const auth = getAuth(req);
  if (!auth?.userId) {
    throw new Error("Unauthorized");
  }
  return auth.userId;
}

async function verifyCardOwnership(cardId: string, userId: string): Promise<{ card: any; deck: any } | null> {
  const card = await storage.getCard(cardId);
  if (!card) return null;
  const deck = await storage.getDeck(card.deckId);
  if (!deck || deck.userId !== userId) return null;
  return { card, deck };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.use(clerkMiddleware());
  
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", message: "Armenian SRS API is running" });
  });

  // === DECKS ===
  app.get("/api/decks", requireAuth(), async (req, res) => {
    try {
      const userId = getUserId(req);
      const allDecks = await storage.getDecks(userId);
      const decksWithCounts = await Promise.all(
        allDecks.map(async (deck) => {
          const [deckCards, dueCards, starredCards, inactiveCards] = await Promise.all([
            storage.getCards(deck.id),
            storage.getDueCards(deck.id),
            storage.getStarredCards(deck.id),
            storage.getInactiveCards(deck.id),
          ]);
          return { 
            ...deck, 
            cardCount: deckCards.length,
            dueCount: dueCards.length,
            starredCount: starredCards.length,
            inactiveCount: inactiveCards.length,
          };
        })
      );
      res.json(decksWithCounts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch decks" });
    }
  });

  app.get("/api/decks/:id", requireAuth(), async (req, res) => {
    try {
      const userId = getUserId(req);
      const deck = await storage.getDeck(req.params.id as string);
      if (!deck || deck.userId !== userId) {
        return res.status(404).json({ error: "Deck not found" });
      }
      const deckCards = await storage.getCards(deck.id);
      res.json({ ...deck, cardCount: deckCards.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch deck" });
    }
  });

  app.post("/api/decks", requireAuth(), async (req, res) => {
    try {
      const userId = getUserId(req);
      const parsed = insertDeckSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }
      const deck = await storage.createDeck({ ...parsed.data, userId });
      res.status(201).json({ ...deck, cardCount: 0 });
    } catch (error) {
      res.status(500).json({ error: "Failed to create deck" });
    }
  });

  app.patch("/api/decks/:id", requireAuth(), async (req, res) => {
    try {
      const userId = getUserId(req);
      const deck = await storage.getDeck(req.params.id as string);
      if (!deck || deck.userId !== userId) {
        return res.status(404).json({ error: "Deck not found" });
      }
      const parsed = updateDeckSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }
      const updated = await storage.updateDeck(req.params.id as string, parsed.data);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update deck" });
    }
  });

  app.delete("/api/decks/:id", requireAuth(), async (req, res) => {
    try {
      const userId = getUserId(req);
      const deck = await storage.getDeck(req.params.id as string);
      if (!deck || deck.userId !== userId) {
        return res.status(404).json({ error: "Deck not found" });
      }
      const success = await storage.deleteDeck(req.params.id as string);
      if (!success) {
        return res.status(404).json({ error: "Deck not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete deck" });
    }
  });

  app.post("/api/decks/:id/duplicate", requireAuth(), async (req, res) => {
    try {
      const userId = getUserId(req);
      const parsed = duplicateDeckSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }
      const { swap } = parsed.data;
      const originalDeck = await storage.getDeck(req.params.id as string);
      if (!originalDeck || originalDeck.userId !== userId) {
        return res.status(404).json({ error: "Deck not found" });
      }

      const namePrefix = swap ? "Swapped copy of " : "Copy of ";
      const newDeck = await storage.createDeck({
        name: namePrefix + originalDeck.name,
        language: originalDeck.language,
        description: originalDeck.description || "",
        userId,
      });

      const originalCards = await storage.getCards(originalDeck.id);
      
      for (const card of originalCards) {
        await storage.createCard({
          deckId: newDeck.id,
          armenian: swap ? card.russian : card.armenian,
          russian: swap ? card.armenian : card.russian,
          sentence: card.sentence || "",
          association: card.association || "",
          isStarred: card.isStarred,
          isActive: card.isActive,
          easeFactor: 2.5,
          interval: 0,
          repetitions: 0,
          nextReviewDate: new Date(),
        });
      }

      const deckCards = await storage.getCards(newDeck.id);
      res.status(201).json({ ...newDeck, cardCount: deckCards.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to duplicate deck" });
    }
  });

  // === CARDS ===
  app.get("/api/cards", requireAuth(), async (req, res) => {
    try {
      const userId = getUserId(req);
      const deckId = req.query.deckId as string | undefined;
      const filter = req.query.filter as string | undefined;

      if (deckId) {
        const deck = await storage.getDeck(deckId);
        if (!deck || deck.userId !== userId) {
          return res.status(404).json({ error: "Deck not found" });
        }
      }
      
      if (!deckId) {
        const userDecks = await storage.getDecks(userId);
        const userDeckIds = new Set(userDecks.map(d => d.id));
        let allCards: any[];
        if (filter === "due") {
          allCards = await storage.getDueCards();
        } else if (filter === "new") {
          allCards = await storage.getNewCards();
        } else if (filter === "starred") {
          allCards = await storage.getStarredCards();
        } else {
          allCards = await storage.getCards();
        }
        return res.json(allCards.filter(c => userDeckIds.has(c.deckId)));
      }

      let cardsList;
      if (filter === "due") {
        cardsList = await storage.getDueCards(deckId);
      } else if (filter === "new") {
        cardsList = await storage.getNewCards(deckId);
      } else if (filter === "starred") {
        cardsList = await storage.getStarredCards(deckId);
      } else {
        cardsList = await storage.getCards(deckId);
      }
      res.json(cardsList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cards" });
    }
  });

  app.get("/api/cards/:id", requireAuth(), async (req, res) => {
    try {
      const userId = getUserId(req);
      const result = await verifyCardOwnership(req.params.id as string, userId);
      if (!result) {
        return res.status(404).json({ error: "Card not found" });
      }
      res.json(result.card);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch card" });
    }
  });

  app.post("/api/cards", requireAuth(), async (req, res) => {
    try {
      const userId = getUserId(req);
      const parsed = insertCardSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }
      const deck = await storage.getDeck(parsed.data.deckId);
      if (!deck || deck.userId !== userId) {
        return res.status(404).json({ error: "Deck not found" });
      }
      const card = await storage.createCard({
        ...parsed.data,
        nextReviewDate: new Date(),
      });
      res.status(201).json(card);
    } catch (error) {
      res.status(500).json({ error: "Failed to create card" });
    }
  });

  app.patch("/api/cards/:id", requireAuth(), async (req, res) => {
    try {
      const userId = getUserId(req);
      const result = await verifyCardOwnership(req.params.id as string, userId);
      if (!result) {
        return res.status(404).json({ error: "Card not found" });
      }
      const parsed = updateCardSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }
      const card = await storage.updateCard(req.params.id as string, parsed.data);
      res.json(card);
    } catch (error) {
      res.status(500).json({ error: "Failed to update card" });
    }
  });

  app.delete("/api/cards/:id", requireAuth(), async (req, res) => {
    try {
      const userId = getUserId(req);
      const result = await verifyCardOwnership(req.params.id as string, userId);
      if (!result) {
        return res.status(404).json({ error: "Card not found" });
      }
      const success = await storage.deleteCard(req.params.id as string);
      if (!success) {
        return res.status(404).json({ error: "Card not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete card" });
    }
  });

  // === REVIEW ===
  app.post("/api/cards/:id/review", requireAuth(), async (req, res) => {
    try {
      const userId = getUserId(req);
      const { quality } = req.body;
      if (typeof quality !== "number" || quality < 0 || quality > 5) {
        return res.status(400).json({ error: "Quality must be between 0 and 5" });
      }

      const result = await verifyCardOwnership(req.params.id as string, userId);
      if (!result) {
        return res.status(404).json({ error: "Card not found" });
      }
      const card = result.card;

      const previousInterval = card.interval;
      const sm2Result = calculateSM2(card, quality);
      
      const updatedCard = await storage.updateCard(card.id, {
        easeFactor: sm2Result.easeFactor,
        interval: sm2Result.interval,
        repetitions: sm2Result.repetitions,
        nextReviewDate: sm2Result.nextReviewDate,
        lastReviewDate: new Date(),
      });

      await storage.createReview({
        cardId: card.id,
        quality,
        previousInterval,
        newInterval: sm2Result.interval,
      });

      res.json(updatedCard);
    } catch (error) {
      res.status(500).json({ error: "Failed to record review" });
    }
  });

  // === BATCH IMPORT ===
  app.post("/api/import", requireAuth(), async (req, res) => {
    try {
      const userId = getUserId(req);
      const parsed = batchImportSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }

      const { cards: importCards, deckId, updateExisting } = parsed.data;
      
      const deck = await storage.getDeck(deckId);
      if (!deck || deck.userId !== userId) {
        return res.status(404).json({ error: "Deck not found" });
      }

      let created = 0;
      let updated = 0;
      let skipped = 0;

      for (const importCard of importCards) {
        const existing = await storage.getCardByArmenian(importCard.armenian, deckId);
        
        if (existing) {
          if (updateExisting) {
            await storage.updateCard(existing.id, {
              russian: importCard.russian,
              sentence: importCard.sentence || "",
              association: importCard.association || "",
            });
            updated++;
          } else {
            skipped++;
          }
        } else {
          await storage.createCard({
            armenian: importCard.armenian,
            russian: importCard.russian,
            sentence: importCard.sentence || "",
            association: importCard.association || "",
            deckId,
            isStarred: false,
            easeFactor: 2.5,
            interval: 0,
            repetitions: 0,
            nextReviewDate: new Date(),
          });
          created++;
        }
      }

      res.json({ created, updated, skipped });
    } catch (error) {
      res.status(500).json({ error: "Failed to import cards" });
    }
  });

  // === EXPORT ===
  app.get("/api/export", requireAuth(), async (req, res) => {
    try {
      const userId = getUserId(req);
      const [allDecks, allCards, allReviews, currentSettings] = await Promise.all([
        storage.getDecks(userId),
        storage.getCards(),
        storage.getReviews(),
        storage.getSettings(userId),
      ]);

      const userDeckIds = new Set(allDecks.map(d => d.id));
      const userCards = allCards.filter(c => userDeckIds.has(c.deckId));
      const userCardIds = new Set(userCards.map(c => c.id));
      const userReviews = allReviews.filter(r => userCardIds.has(r.cardId));

      res.json({
        decks: allDecks,
        cards: userCards,
        reviews: userReviews,
        settings: currentSettings,
        exportedAt: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  // === REVIEWS ===
  app.get("/api/reviews", requireAuth(), async (req, res) => {
    try {
      const cardId = req.query.cardId as string | undefined;
      const reviewsList = await storage.getReviews(cardId);
      res.json(reviewsList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  // === SETTINGS ===
  app.get("/api/settings", requireAuth(), async (req, res) => {
    try {
      const userId = getUserId(req);
      const currentSettings = await storage.getSettings(userId);
      res.json(currentSettings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.patch("/api/settings", requireAuth(), async (req, res) => {
    try {
      const userId = getUserId(req);
      const parsed = insertSettingsSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }
      const updatedSettings = await storage.updateSettings(userId, parsed.data);
      res.json(updatedSettings);
    } catch (error) {
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // === STATS ===
  app.get("/api/stats/daily", requireAuth(), async (req, res) => {
    try {
      const userId = getUserId(req);
      const days = parseInt(req.query.days as string) || 7;
      const userDecks = await storage.getDecks(userId);
      const userDeckIds = new Set(userDecks.map(d => d.id));
      const allCards = await storage.getCards();
      const userCardIds = new Set(allCards.filter(c => userDeckIds.has(c.deckId)).map(c => c.id));
      const reviewsList = await storage.getReviews();
      const userReviews = reviewsList.filter(r => userCardIds.has(r.cardId));
      
      const stats: { [date: string]: { cardsReviewed: number; cardsLearned: number; correctAnswers: number; totalAnswers: number } } = {};
      
      const now = new Date();
      for (let i = 0; i < days; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        stats[dateStr] = { cardsReviewed: 0, cardsLearned: 0, correctAnswers: 0, totalAnswers: 0 };
      }

      for (const review of userReviews) {
        const dateStr = new Date(review.reviewedAt).toISOString().split('T')[0];
        if (stats[dateStr]) {
          stats[dateStr].cardsReviewed++;
          stats[dateStr].totalAnswers++;
          if (review.quality >= 3) {
            stats[dateStr].correctAnswers++;
          }
          if (review.previousInterval === 0 && review.newInterval > 0) {
            stats[dateStr].cardsLearned++;
          }
        }
      }

      const result = Object.entries(stats).map(([date, data]) => ({ date, ...data })).reverse();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch daily stats" });
    }
  });

  app.get("/api/stats/weekly", requireAuth(), async (req, res) => {
    try {
      const userId = getUserId(req);
      const currentSettings = await storage.getSettings(userId);
      const userDecks = await storage.getDecks(userId);
      const userDeckIds = new Set(userDecks.map(d => d.id));
      const allCards = await storage.getCards();
      const userCardIds = new Set(allCards.filter(c => userDeckIds.has(c.deckId)).map(c => c.id));
      const reviewsList = await storage.getReviews();
      const userReviews = reviewsList.filter(r => userCardIds.has(r.cardId));
      
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      let cardsLearned = 0;
      for (const review of userReviews) {
        if (new Date(review.reviewedAt) >= startOfWeek && review.previousInterval === 0 && review.newInterval > 0) {
          cardsLearned++;
        }
      }
      
      const daysRemaining = 7 - now.getDay();

      res.json({
        cardsLearned,
        target: currentSettings.weeklyCardTarget,
        daysRemaining,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch weekly stats" });
    }
  });

  // === MIGRATION (first login) ===
  app.post("/api/auth/claim-data", requireAuth(), async (req, res) => {
    try {
      const userId = getUserId(req);
      const existingDecks = await storage.getDecks(userId);
      if (existingDecks.length > 0) {
        return res.json({ assigned: 0 });
      }
      const assigned = await storage.assignUnownedDecks(userId);
      res.json({ assigned });
    } catch (error) {
      res.status(500).json({ error: "Failed to claim data" });
    }
  });

  return httpServer;
}
