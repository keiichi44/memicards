import { useParams, useLocation } from "wouter";
import { PracticeSession } from "@/components/practice-session";

export default function PracticePage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const handleBack = () => {
    if (id) {
      setLocation(`/deck/${id}`);
    } else {
      setLocation("/");
    }
  };

  return (
    <div className="p-6">
      <PracticeSession
        deckId={id}
        onBack={handleBack}
      />
    </div>
  );
}
