import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Flashcard } from "@/components/flashcard";
import type { Card as FlashCard, QualityRating, Settings } from "@shared/schema";
import { isDueToday, isNewCard, sortCardsByPriority, isWeekend } from "@/lib/sm2";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
  const [isInitialized, setIsInitialized] = useState(false);
  
  const { data: allCards = [], isLoading: cardsLoading } = useQuery<FlashCard[]>({
    queryKey: deckId ? ["/api/cards", deckId] : ["/api/cards"],
    queryFn: async () => {
      const url = deckId ? `/api/cards?deckId=${deckId}` : "/api/cards";
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch cards: ${res.status}`);
      return res.json();
    },
  });
  
  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });
  
  const reviewMutation = useMutation({
    mutationFn: async ({ cardId, quality }: { cardId: string; quality: number }) => {
      const res = await apiRequest("POST", `/api/cards/${cardId}/review`, { quality });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cards"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
    },
  });
  
  const starMutation = useMutation({
    mutationFn: async ({ cardId, isStarred }: { cardId: string; isStarred: boolean }) => {
      const res = await apiRequest("PATCH", `/api/cards/${cardId}`, { isStarred });
      return res.json();
    },
    onSuccess: (updatedCard) => {
      setQueue(prev => prev.map(c => c.id === updatedCard.id ? updatedCard : c));
      queryClient.invalidateQueries({ queryKey: ["/api/cards"], refetchType: "all" });
    },
  });
  
  const loadReviewQueue = useCallback(() => {
    if (!settings || allCards.length === 0) return;
    
    // Only include active cards in review sessions
    const activeCards = allCards.filter(c => c.isActive);
    const dueCards = activeCards.filter(c => isDueToday(c));
    const newCards = activeCards.filter(c => isNewCard(c));
    
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
    setIsInitialized(true);
  }, [allCards, settings]);
  
  useEffect(() => {
    if (!isInitialized && settings && allCards.length >= 0 && !cardsLoading) {
      loadReviewQueue();
    }
  }, [allCards, settings, cardsLoading, isInitialized, loadReviewQueue]);
  
  const currentCard = queue[currentIndex];
  
  const handleRate = (quality: QualityRating) => {
    if (!currentCard) return;
    
    reviewMutation.mutate({ cardId: currentCard.id, quality });
    
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
    starMutation.mutate({ cardId: currentCard.id, isStarred: !currentCard.isStarred });
  };
  
  const progressPercent = queue.length > 0 ? (completed / queue.length) * 100 : 100;
  
  if (cardsLoading || !isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
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
          <Button onClick={() => { setIsInitialized(false); }} variant="outline" data-testid="button-review-again">
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
