import { useLocation } from "wouter";
import { DeckList } from "@/components/deck-list";

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div className="p-6">
      <DeckList
        onSelectDeck={(deckId) => setLocation(`/deck/${deckId}`)}
        onStartReview={(deckId) => deckId ? setLocation(`/deck/${deckId}/review`) : setLocation("/review")}
        onStartPractice={(deckId) => deckId ? setLocation(`/deck/${deckId}/practice`) : setLocation("/practice")}
      />
    </div>
  );
}
