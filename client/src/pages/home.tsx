import { useState, useEffect } from "react";
import { DeckList } from "@/components/deck-list";
import { CardList } from "@/components/card-list";
import { ReviewSession } from "@/components/review-session";
import { initializeSampleData } from "@/lib/storage";

type View = "decks" | "cards" | "review";

export default function Home() {
  const [view, setView] = useState<View>("decks");
  const [selectedDeckId, setSelectedDeckId] = useState<string | undefined>();
  const [reviewDeckId, setReviewDeckId] = useState<string | undefined>();
  
  useEffect(() => {
    initializeSampleData();
  }, []);
  
  const handleSelectDeck = (deckId: string) => {
    setSelectedDeckId(deckId);
    setView("cards");
  };
  
  const handleStartReview = (deckId?: string) => {
    setReviewDeckId(deckId);
    setView("review");
  };
  
  const handleBackToDecks = () => {
    setSelectedDeckId(undefined);
    setReviewDeckId(undefined);
    setView("decks");
  };
  
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
      />
    </div>
  );
}
