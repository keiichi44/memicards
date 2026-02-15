import { useState } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface OnboardingProps {
  open: boolean;
  onComplete: () => void;
  onCreateDeck: () => void;
}

const steps = [
  {
    title: "Spaced Repetition",
    description:
      "Your brain remembers things better when you review them at increasing intervals, right before you\u2019re about to forget them.\n\nThis app uses this method to figure out the optimal moment to quiz you.",
    image: "/images/onboarding-step1.svg",
  },
  {
    title: "Organize Your Learning",
    description:
      "Use projects to organise your learning tracks, e.g., \u201cChinese\u201d, \u201cSpanish\u201d, and set up a specific schedule for each.\n\nPlace 20-30 items into a single deck to smooth the learning curve.",
    image: "/images/onboarding-step2.svg",
  },
  {
    title: "Learn Anywhere",
    description:
      "Study on desktop or mobile \u2014 your progress syncs automatically. Use Practice mode for casual review without affecting your schedule.",
    image: "/images/onboarding-step3.svg",
  },
];

export function Onboarding({ open, onComplete, onCreateDeck }: OnboardingProps) {
  const [step, setStep] = useState(0);

  const isLast = step === steps.length - 1;
  const isFirst = step === 0;
  const current = steps[step];

  const handleNext = () => {
    if (isLast) {
      onComplete();
      onCreateDeck();
      setStep(0);
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (!isFirst) setStep((s) => s - 1);
  };

  const handleSkip = () => {
    onComplete();
    setStep(0);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleSkip(); }}>
      <DialogContent
        className="sm:max-w-md p-0 overflow-hidden border-0"
        style={{ backgroundColor: "#EE7C2B" }}
      >
        <div className="flex flex-col items-center px-6 pt-8 pb-6 gap-5">
          <div className="flex flex-wrap items-center gap-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all"
                style={{
                  width: i === step ? 24 : 8,
                  height: 8,
                  backgroundColor: i === step ? "white" : "rgba(255,255,255,0.4)",
                }}
                data-testid={`indicator-step-${i}`}
              />
            ))}
          </div>

          <div
            className="w-full flex items-center justify-center rounded-md p-4 bg-[#ffffff00] text-[#1f242e]"
            style={{ backgroundColor: "rgba(255,255,255,0.15)", minHeight: 140 }}
          >
            <img
              src={current.image}
              alt={current.title}
              className="max-h-[120px] w-auto"
              data-testid={`img-onboarding-step-${step}`}
            />
          </div>

          <div className="text-center space-y-2">
            <h2
              className="text-xl font-bold"
              style={{ color: "white" }}
              data-testid="text-onboarding-title"
            >
              {current.title}
            </h2>
            <p
              className="text-sm leading-relaxed text-left text-[#ffffffe6] whitespace-pre-line"
              style={{ color: "rgba(255,255,255,0.9)" }}
              data-testid="text-onboarding-description"
            >
              {current.description}
            </p>
          </div>

          <div className="flex items-center justify-between w-full gap-3">
            {!isFirst ? (
              <Button
                variant="ghost"
                onClick={handleBack}
                className="text-white no-default-hover-elevate"
                style={{ color: "white" }}
                data-testid="button-onboarding-back"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            ) : (
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="text-white no-default-hover-elevate"
                style={{ color: "white" }}
                data-testid="button-onboarding-skip"
              >
                Skip
              </Button>
            )}

            <Button
              onClick={handleNext}
              className="bg-white text-orange-600 border-white font-semibold"
              data-testid="button-onboarding-next"
            >
              {isLast ? "Create a deck" : "Next"}
              {!isLast && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
