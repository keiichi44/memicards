import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Shuffle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Flashcard } from "@/components/flashcard";
import type { Card as FlashCard } from "@shared/schema";
import { getCards, getCardsByDeck } from "@/lib/storage";

interface PracticeSessionProps {
  deckId?: string;
  onBack: () => void;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function PracticeSession({ deckId, onBack }: PracticeSessionProps) {
  const [cards, setCards] = useState<FlashCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [practiceCount, setPracticeCount] = useState(0);

  const loadCards = useCallback(() => {
    let allCards = deckId ? getCardsByDeck(deckId) : getCards();
    setCards(shuffleArray(allCards));
    setCurrentIndex(0);
    setShowAnswer(false);
    setPracticeCount(0);
  }, [deckId]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const currentCard = cards[currentIndex];

  const handleNext = () => {
    setPracticeCount(prev => prev + 1);
    setShowAnswer(false);
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handleShuffle = () => {
    setCards(shuffleArray(cards));
    setCurrentIndex(0);
    setShowAnswer(false);
  };

  const handleRestart = () => {
    loadCards();
  };

  if (cards.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-practice-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-2xl font-semibold">Practice Mode</h2>
        </div>
        
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No cards available to practice.</p>
            <Button variant="outline" onClick={onBack} className="mt-4">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-practice-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-semibold">Practice Mode</h2>
            <p className="text-sm text-muted-foreground">
              Card {currentIndex + 1} of {cards.length} • {practiceCount} practiced
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handleShuffle} title="Shuffle cards" data-testid="button-shuffle">
            <Shuffle className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleRestart} title="Restart" data-testid="button-restart">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="text-center text-sm text-muted-foreground bg-muted/50 py-2 px-4 rounded-md">
        Practice mode - results are not saved
      </div>

      <Flashcard
        card={currentCard}
        showAnswer={showAnswer}
        onFlip={() => setShowAnswer(!showAnswer)}
        practiceMode={true}
      />

      <div className="flex justify-center">
        {!showAnswer ? (
          <Button 
            size="lg" 
            onClick={() => setShowAnswer(true)}
            className="min-w-[200px]"
            data-testid="button-show-answer"
          >
            Show Answer
          </Button>
        ) : (
          <Button 
            size="lg" 
            onClick={handleNext}
            className="min-w-[200px]"
            data-testid="button-next-card"
          >
            Next Card
          </Button>
        )}
      </div>
    </div>
  );
}
