import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Flashcard } from "@/components/flashcard";
import type { Card as FlashCard, QualityRating } from "@shared/schema";
import { calculateSM2, isDueToday, isNewCard, sortCardsByPriority, isWeekend } from "@/lib/sm2";
import { getCards, updateCard, addReview, getSettings } from "@/lib/storage";

interface ReviewSessionProps {
  deckId?: string;
  onComplete: () => void;
  onBack: () => void;
}

export function ReviewSession({ deckId, onComplete, onBack }: ReviewSessionProps) {
  const [queue, setQueue] = useState<FlashCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });
  
  useEffect(() => {
    loadReviewQueue();
  }, [deckId]);
  
  const loadReviewQueue = useCallback(() => {
    const settings = getSettings();
    let cards = getCards();
    
    if (deckId) {
      cards = cards.filter(c => c.deckId === deckId);
    }
    
    const dueCards = cards.filter(isDueToday);
    const newCards = cards.filter(isNewCard);
    
    const weekendMode = settings.weekendLearnerMode;
    const isWeekendDay = isWeekend();
    
    const maxNewCards = weekendMode 
      ? (isWeekendDay ? settings.weekendNewCards : settings.weekdayNewCards)
      : 10;
    const maxReviewCards = weekendMode
      ? (isWeekendDay ? settings.weekendReviewCards : settings.weekdayReviewCards)
      : 50;
    
    const sortedDue = sortCardsByPriority(dueCards, settings.prioritizeStarred);
    const sortedNew = sortCardsByPriority(newCards.filter(c => !isDueToday(c)), settings.prioritizeStarred);
    
    const reviewQueue = [
      ...sortedDue.slice(0, maxReviewCards),
      ...sortedNew.slice(0, maxNewCards),
    ];
    
    setQueue(reviewQueue);
    setCurrentIndex(0);
    setCompleted(0);
    setShowAnswer(false);
  }, [deckId]);
  
  const currentCard = queue[currentIndex];
  
  const handleRate = (quality: QualityRating) => {
    if (!currentCard) return;
    
    const result = calculateSM2(currentCard, quality);
    
    updateCard(currentCard.id, {
      ...result,
      lastReviewDate: new Date().toISOString(),
    });
    
    addReview({
      cardId: currentCard.id,
      quality,
      reviewedAt: new Date().toISOString(),
      previousInterval: currentCard.interval,
      newInterval: result.interval,
    });
    
    setSessionStats(prev => ({
      correct: prev.correct + (quality >= 3 ? 1 : 0),
      total: prev.total + 1,
    }));
    
    setCompleted(prev => prev + 1);
    setShowAnswer(false);
    
    if (currentIndex < queue.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setQueue([]);
    }
  };
  
  const handleToggleStar = () => {
    if (!currentCard) return;
    const updated = updateCard(currentCard.id, { isStarred: !currentCard.isStarred });
    if (updated) {
      setQueue(prev => prev.map(c => c.id === currentCard.id ? updated : c));
    }
  };
  
  const progressPercent = queue.length > 0 ? (completed / queue.length) * 100 : 100;
  
  if (queue.length === 0 && completed === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <CheckCircle className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">No cards to review</h2>
        <p className="text-muted-foreground text-center max-w-md">
          All caught up! Add new cards or wait for scheduled reviews.
        </p>
        <Button onClick={onBack} variant="outline" data-testid="button-back-to-decks">
          Back to Decks
        </Button>
      </div>
    );
  }
  
  if (queue.length === 0 && completed > 0) {
    const accuracy = sessionStats.total > 0 
      ? Math.round((sessionStats.correct / sessionStats.total) * 100)
      : 0;
    
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
        <CheckCircle className="h-20 w-20 text-green-500" />
        <h2 className="text-3xl font-semibold">Session Complete!</h2>
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-primary">{completed}</p>
                <p className="text-sm text-muted-foreground">Cards reviewed</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-accent">{accuracy}%</p>
                <p className="text-sm text-muted-foreground">Accuracy</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex gap-2">
          <Button onClick={onComplete} data-testid="button-finish-session">
            Done
          </Button>
          <Button onClick={loadReviewQueue} variant="outline" data-testid="button-review-again">
            Review Again
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" onClick={onBack} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1 max-w-md">
          <div className="flex justify-between text-sm text-muted-foreground mb-1">
            <span>{completed} / {queue.length}</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      </div>
      
      {currentCard && (
        <Flashcard
          card={currentCard}
          onRate={handleRate}
          onToggleStar={handleToggleStar}
          showAnswer={showAnswer}
          onFlip={() => setShowAnswer(true)}
        />
      )}
    </div>
  );
}
