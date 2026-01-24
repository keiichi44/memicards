import type { Card, QualityRating } from "@shared/schema";

export interface SM2Result {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: string;
}

export function calculateSM2(card: Card, quality: QualityRating): SM2Result {
  let { easeFactor, interval, repetitions } = card;

  if (quality < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  }

  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  return {
    easeFactor: Math.round(easeFactor * 100) / 100,
    interval,
    repetitions,
    nextReviewDate: nextReviewDate.toISOString(),
  };
}

export function isDueToday(card: { nextReviewDate: Date | string }): boolean {
  const now = new Date();
  const reviewDate = new Date(card.nextReviewDate);
  return reviewDate <= now;
}

export function isNewCard(card: { repetitions: number; lastReviewDate?: Date | string | null }): boolean {
  return card.repetitions === 0 && !card.lastReviewDate;
}

export function getCardStatus(card: { repetitions: number; interval: number; lastReviewDate?: Date | string | null }): "new" | "learning" | "review" | "graduated" {
  if (card.repetitions === 0 && !card.lastReviewDate) return "new";
  if (card.repetitions < 3) return "learning";
  if (card.interval >= 21) return "graduated";
  return "review";
}

export function formatInterval(days: number): string {
  if (days === 0) return "Now";
  if (days === 1) return "1 day";
  if (days < 7) return `${days} days`;
  if (days < 30) {
    const weeks = Math.round(days / 7);
    return weeks === 1 ? "1 week" : `${weeks} weeks`;
  }
  if (days < 365) {
    const months = Math.round(days / 30);
    return months === 1 ? "1 month" : `${months} months`;
  }
  const years = Math.round(days / 365);
  return years === 1 ? "1 year" : `${years} years`;
}

export function getDaysUntilReview(card: { nextReviewDate: Date | string }): number {
  const now = new Date();
  const reviewDate = new Date(card.nextReviewDate);
  const diffTime = reviewDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function sortCardsByPriority<T extends { isStarred: boolean; nextReviewDate: Date | string }>(
  cards: T[], 
  prioritizeStarred: boolean = true
): T[] {
  return [...cards].sort((a, b) => {
    if (prioritizeStarred && a.isStarred !== b.isStarred) {
      return a.isStarred ? -1 : 1;
    }
    const dateA = new Date(a.nextReviewDate).getTime();
    const dateB = new Date(b.nextReviewDate).getTime();
    return dateA - dateB;
  });
}

export function isWeekend(): boolean {
  const day = new Date().getDay();
  return day === 0 || day === 6;
}
