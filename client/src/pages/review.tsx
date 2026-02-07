import { useParams, useLocation } from "wouter";
import { ReviewSession } from "@/components/review-session";

export default function ReviewPage() {
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
      <ReviewSession
        deckId={id}
        onComplete={handleBack}
        onBack={handleBack}
      />
    </div>
  );
}
