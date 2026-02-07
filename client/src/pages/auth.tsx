import { SignIn, SignUp } from "@clerk/clerk-react";
import { useState } from "react";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthPage() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");

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

      {mode === "sign-in" ? (
        <SignIn
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-md",
            },
          }}
          signUpUrl="#sign-up"
          fallbackRedirectUrl="/"
        />
      ) : (
        <SignUp
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-md",
            },
          }}
          signInUrl="#sign-in"
          fallbackRedirectUrl="/"
        />
      )}

      <div className="mt-4">
        {mode === "sign-in" ? (
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Button
              variant="ghost"
              className="p-0 h-auto underline"
              onClick={() => setMode("sign-up")}
              data-testid="link-switch-to-signup"
            >
              Sign up
            </Button>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Button
              variant="ghost"
              className="p-0 h-auto underline"
              onClick={() => setMode("sign-in")}
              data-testid="link-switch-to-signin"
            >
              Sign in
            </Button>
          </p>
        )}
      </div>
    </div>
  );
}
