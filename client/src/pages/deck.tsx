import { useParams, useLocation } from "wouter";
import { CardList } from "@/components/card-list";

export default function DeckPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  if (!id) {
    setLocation("/");
    return null;
  }

  return (
    <div className="p-6">
      <CardList
        deckId={id}
        onBack={() => setLocation("/")}
      />
    </div>
  );
}
