import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDeckSchema, insertCardSchema, batchImportSchema, insertSettingsSchema, updateDeckSchema, updateCardSchema } from "@shared/schema";
import { nanoid } from "nanoid";
import { calculateSM2 } from "./sm2";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", message: "Armenian SRS API is running" });
  });

  // === DECKS ===
  app.get("/api/decks", async (_req, res) => {
    try {
      const decks = await storage.getDecks();
      const decksWithCounts = await Promise.all(
        decks.map(async (deck) => {
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

  app.get("/api/decks/:id", async (req, res) => {
    try {
      const deck = await storage.getDeck(req.params.id);
      if (!deck) {
        return res.status(404).json({ error: "Deck not found" });
      }
      const deckCards = await storage.getCards(deck.id);
      res.json({ ...deck, cardCount: deckCards.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch deck" });
    }
  });

  app.post("/api/decks", async (req, res) => {
    try {
      const parsed = insertDeckSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }
      const deck = await storage.createDeck(parsed.data);
      res.status(201).json({ ...deck, cardCount: 0 });
    } catch (error) {
      res.status(500).json({ error: "Failed to create deck" });
    }
  });

  app.patch("/api/decks/:id", async (req, res) => {
    try {
      const parsed = updateDeckSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }
      const deck = await storage.updateDeck(req.params.id, parsed.data);
      if (!deck) {
        return res.status(404).json({ error: "Deck not found" });
      }
      res.json(deck);
    } catch (error) {
      res.status(500).json({ error: "Failed to update deck" });
    }
  });

  app.delete("/api/decks/:id", async (req, res) => {
    try {
      const success = await storage.deleteDeck(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Deck not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete deck" });
    }
  });

  // === CARDS ===
  app.get("/api/cards", async (req, res) => {
    try {
      const deckId = req.query.deckId as string | undefined;
      const filter = req.query.filter as string | undefined;
      
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

  app.get("/api/cards/:id", async (req, res) => {
    try {
      const card = await storage.getCard(req.params.id);
      if (!card) {
        return res.status(404).json({ error: "Card not found" });
      }
      res.json(card);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch card" });
    }
  });

  app.post("/api/cards", async (req, res) => {
    try {
      const parsed = insertCardSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
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

  app.patch("/api/cards/:id", async (req, res) => {
    try {
      const parsed = updateCardSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }
      const card = await storage.updateCard(req.params.id, parsed.data);
      if (!card) {
        return res.status(404).json({ error: "Card not found" });
      }
      res.json(card);
    } catch (error) {
      res.status(500).json({ error: "Failed to update card" });
    }
  });

  app.delete("/api/cards/:id", async (req, res) => {
    try {
      const success = await storage.deleteCard(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Card not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete card" });
    }
  });

  // === REVIEW ===
  app.post("/api/cards/:id/review", async (req, res) => {
    try {
      const { quality } = req.body;
      if (typeof quality !== "number" || quality < 0 || quality > 5) {
        return res.status(400).json({ error: "Quality must be between 0 and 5" });
      }

      const card = await storage.getCard(req.params.id);
      if (!card) {
        return res.status(404).json({ error: "Card not found" });
      }

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
  app.post("/api/import", async (req, res) => {
    try {
      const parsed = batchImportSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }

      const { cards: importCards, deckId, updateExisting } = parsed.data;
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
  app.get("/api/export", async (_req, res) => {
    try {
      const [allDecks, allCards, allReviews, currentSettings] = await Promise.all([
        storage.getDecks(),
        storage.getCards(),
        storage.getReviews(),
        storage.getSettings(),
      ]);

      res.json({
        decks: allDecks,
        cards: allCards,
        reviews: allReviews,
        settings: currentSettings,
        exportedAt: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  // === REVIEWS ===
  app.get("/api/reviews", async (req, res) => {
    try {
      const cardId = req.query.cardId as string | undefined;
      const reviewsList = await storage.getReviews(cardId);
      res.json(reviewsList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  // === SETTINGS ===
  app.get("/api/settings", async (_req, res) => {
    try {
      const currentSettings = await storage.getSettings();
      res.json(currentSettings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.patch("/api/settings", async (req, res) => {
    try {
      const parsed = insertSettingsSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }
      const updatedSettings = await storage.updateSettings(parsed.data);
      res.json(updatedSettings);
    } catch (error) {
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // === STATS ===
  app.get("/api/stats/daily", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const reviewsList = await storage.getReviews();
      
      const stats: { [date: string]: { cardsReviewed: number; cardsLearned: number; correctAnswers: number; totalAnswers: number } } = {};
      
      const now = new Date();
      for (let i = 0; i < days; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        stats[dateStr] = { cardsReviewed: 0, cardsLearned: 0, correctAnswers: 0, totalAnswers: 0 };
      }

      for (const review of reviewsList) {
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

  app.get("/api/stats/weekly", async (_req, res) => {
    try {
      const currentSettings = await storage.getSettings();
      const reviewsList = await storage.getReviews();
      
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      let cardsLearned = 0;
      for (const review of reviewsList) {
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

  return httpServer;
}
