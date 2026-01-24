import { useState } from "react";
import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Card as FlashCard, QualityRating } from "@shared/schema";
import { simpleQualityRatings } from "@shared/schema";
import { cn } from "@/lib/utils";
import { formatInterval, getCardStatus, getDaysUntilReview } from "@/lib/sm2";

interface FlashcardProps {
  card: FlashCard;
  onRate?: (quality: QualityRating) => void;
  onToggleStar?: () => void;
  showAnswer: boolean;
  onFlip: () => void;
  practiceMode?: boolean;
}

export function Flashcard({ card, onRate, onToggleStar, showAnswer, onFlip, practiceMode = false }: FlashcardProps) {
  const status = getCardStatus(card);
  const daysUntil = getDaysUntilReview(card);
  
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
          
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
            <div className="w-full">
              <p className="text-sm text-muted-foreground mb-2">Armenian</p>
              <p className="font-armenian text-4xl md:text-5xl font-medium leading-relaxed" data-testid="text-armenian-word">
                {card.armenian}
              </p>
            </div>
            
            {showAnswer && (
              <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-2">Russian</p>
                  <p className="text-2xl md:text-3xl font-medium" data-testid="text-russian-translation">
                    {card.russian}
                  </p>
                </div>
                
                {card.sentence && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-2">Example</p>
                    <p className="font-armenian text-lg text-muted-foreground" data-testid="text-example-sentence">
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
                "min-w-[80px]",
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
