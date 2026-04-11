import { useState } from "react";
import { Star, HelpCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Card as FlashCard, QualityRating } from "@shared/schema";
import { simpleQualityRatings } from "@shared/schema";
import { cn } from "@/lib/utils";
import { formatInterval, getCardStatus, getDaysUntilReview } from "@/lib/sm2";

const HINT_STORAGE_KEY = "review_hint_seen";

interface FlashcardProps {
  card: FlashCard;
  languageName?: string;
  onRate?: (quality: QualityRating) => void;
  onToggleStar?: () => void;
  showAnswer: boolean;
  onFlip: () => void;
  practiceMode?: boolean;
}

export function Flashcard({ card, languageName = "Word", onRate, onToggleStar, showAnswer, onFlip, practiceMode = false }: FlashcardProps) {
  const status = getCardStatus(card);
  const daysUntil = getDaysUntilReview(card);
  const [showHint, setShowHint] = useState(() => !localStorage.getItem(HINT_STORAGE_KEY));

  const handleDismissHint = () => {
    localStorage.setItem(HINT_STORAGE_KEY, "true");
    setShowHint(false);
  };

  const handleShowHint = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowHint(true);
  };

  if (showHint && !practiceMode) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <Card className="min-h-[400px] flex flex-col" data-testid="card-review-hint">
          <CardContent className="flex-1 flex flex-col p-6 gap-4">
            <div className="flex-1 flex flex-col justify-center gap-4">
              <h3 className="text-xl font-semibold text-center italic">How to use the card</h3>
              <p className="text-muted-foreground text-center">
                Try to recall what's on the reverse and hit the button:
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex gap-2">
                  <span className="font-semibold text-destructive shrink-0">Again</span>
                  <span className="text-muted-foreground">— Didn't remember. Will show up again soon.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold shrink-0">Hard</span>
                  <span className="text-muted-foreground">— Remembered, but with effort. Will appear more frequently.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold shrink-0">Good</span>
                  <span className="text-muted-foreground">— Remembered well. On track.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-accent shrink-0">Easy</span>
                  <span className="text-muted-foreground">— Remembered instantly. Will appear much later.</span>
                </li>
              </ul>
            </div>
            <div className="flex justify-center">
              <Button onClick={handleDismissHint} data-testid="button-got-it">
                Got it
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card 
        className="min-h-[400px] flex flex-col cursor-pointer"
        onClick={!showAnswer ? onFlip : undefined}
        data-testid="card-flashcard"
      >
        <CardContent className="flex-1 flex flex-col p-6 gap-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant={status === "new" ? "default" : status === "learning" ? "secondary" : "outline"}>
                {status === "new" ? "New" : status === "learning" ? "Learning" : status === "graduated" ? "Graduated" : "Review"}
              </Badge>
              {daysUntil > 0 && (
                <span className="text-xs text-muted-foreground">
                  Next: {formatInterval(daysUntil)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {!practiceMode && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleShowHint}
                  data-testid="button-show-hint"
                >
                  <HelpCircle className="h-5 w-5 text-muted-foreground" />
                </Button>
              )}
              {onToggleStar && !practiceMode && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleStar();
                  }}
                  data-testid="button-star-card"
                >
                  <Star 
                    className={cn(
                      "h-5 w-5",
                      card.isStarred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                    )} 
                  />
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
            <div className="w-full">
              <p className="text-sm text-muted-foreground mb-2">{languageName}</p>
              <p className="font-sans text-4xl md:text-5xl font-medium leading-relaxed" data-testid="text-armenian-word">
                {card.armenian}
              </p>
            </div>
            
            {showAnswer && (
              <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-2">Translation</p>
                  <p className="text-2xl md:text-3xl font-medium" data-testid="text-russian-translation">
                    {card.russian}
                  </p>
                </div>
                
                {card.sentence && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-2">Example</p>
                    <p className="font-sans text-lg text-muted-foreground" data-testid="text-example-sentence">
                      {card.sentence}
                    </p>
                  </div>
                )}
                
                {card.association && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-2">Association</p>
                    <p className="text-base italic text-muted-foreground" data-testid="text-association">
                      {card.association}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {!showAnswer && (
            <p className="text-center text-sm text-muted-foreground">
              Click to reveal answer
            </p>
          )}
        </CardContent>
      </Card>
      
      {showAnswer && onRate && !practiceMode && (
        <div className="mt-4 flex justify-center gap-2 flex-wrap animate-in fade-in slide-in-from-bottom-4 duration-300">
          {simpleQualityRatings.map(({ quality, label, color }) => (
            <Button
              key={quality}
              variant={color === "destructive" ? "destructive" : color === "accent" ? "default" : "secondary"}
              className={cn(
                "min-w-[60px] md:min-w-[80px]",
                color === "accent" && "bg-accent text-accent-foreground"
              )}
              onClick={() => onRate(quality)}
              data-testid={`button-rate-${label.toLowerCase()}`}
            >
              {label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
