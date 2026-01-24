import { useState } from "react";
import { DeckList } from "@/components/deck-list";
import { CardList } from "@/components/card-list";
import { ReviewSession } from "@/components/review-session";
import { PracticeSession } from "@/components/practice-session";

type View = "decks" | "cards" | "review" | "practice";

export default function Home() {
  const [view, setView] = useState<View>("decks");
  const [selectedDeckId, setSelectedDeckId] = useState<string | undefined>();
  const [reviewDeckId, setReviewDeckId] = useState<string | undefined>();
  const [practiceDeckId, setPracticeDeckId] = useState<string | undefined>();
  
  const handleSelectDeck = (deckId: string) => {
    setSelectedDeckId(deckId);
    setView("cards");
  };
  
  const handleStartReview = (deckId?: string) => {
    setReviewDeckId(deckId);
    setView("review");
  };
  
  const handleStartPractice = (deckId?: string) => {
    setPracticeDeckId(deckId);
    setView("practice");
  };
  
  const handleBackToDecks = () => {
    setSelectedDeckId(undefined);
    setReviewDeckId(undefined);
    setPracticeDeckId(undefined);
    setView("decks");
  };
  
  if (view === "practice") {
    return (
      <div className="p-6">
        <PracticeSession
          deckId={practiceDeckId}
          onBack={handleBackToDecks}
        />
      </div>
    );
  }
  
  if (view === "review") {
    return (
      <div className="p-6">
        <ReviewSession
          deckId={reviewDeckId}
          onComplete={handleBackToDecks}
          onBack={handleBackToDecks}
        />
      </div>
    );
  }
  
  if (view === "cards" && selectedDeckId) {
    return (
      <div className="p-6">
        <CardList
          deckId={selectedDeckId}
          onBack={handleBackToDecks}
        />
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <DeckList
        onSelectDeck={handleSelectDeck}
        onStartReview={handleStartReview}
        onStartPractice={handleStartPractice}
      />
    </div>
  );
}
