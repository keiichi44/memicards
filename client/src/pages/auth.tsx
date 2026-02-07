import { SignIn } from "@clerk/clerk-react";
import { BookOpen } from "lucide-react";

export default function AuthPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-12 h-12 rounded-md bg-primary flex items-center justify-center">
          <BookOpen className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold leading-tight" data-testid="text-auth-title">memicards</h1>
          <p className="text-sm text-muted-foreground">Spaced Repetition System</p>
        </div>
      </div>

      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-md",
            footer: { display: "none" },
          },
        }}
        fallbackRedirectUrl="/"
      />
    </div>
  );
}
