import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ReviewGuardContextType {
  isInSession: boolean;
  setInSession: (active: boolean) => void;
  requestNavigation: (callback: () => void) => void;
}

const ReviewGuardContext = createContext<ReviewGuardContextType>({
  isInSession: false,
  setInSession: () => {},
  requestNavigation: () => {},
});

export function ReviewGuardProvider({ children }: { children: ReactNode }) {
  const [isInSession, setIsInSession] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const pendingAction = useRef<(() => void) | null>(null);

  const setInSession = useCallback((active: boolean) => {
    setIsInSession(active);
  }, []);

  const requestNavigation = useCallback((callback: () => void) => {
    if (isInSession) {
      pendingAction.current = callback;
      setDialogOpen(true);
    } else {
      callback();
    }
  }, [isInSession]);

  const handleInterrupt = () => {
    setIsInSession(false);
    setDialogOpen(false);
    if (pendingAction.current) {
      pendingAction.current();
      pendingAction.current = null;
    }
  };

  const handleStay = () => {
    setDialogOpen(false);
    pendingAction.current = null;
  };

  return (
    <ReviewGuardContext.Provider value={{ isInSession, setInSession, requestNavigation }}>
      {children}
      <AlertDialog open={dialogOpen} onOpenChange={(open) => { if (!open) handleStay(); }}>
        <AlertDialogContent data-testid="dialog-interrupt-session">
          <AlertDialogHeader>
            <AlertDialogTitle>Do you want to interrupt the learning session?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress has been saved, by the way.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleStay} data-testid="button-stay-here">
              Stay here
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleInterrupt} data-testid="button-interrupt-and-go">
              Interrupt and go
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ReviewGuardContext.Provider>
  );
}

export function useReviewGuard() {
  return useContext(ReviewGuardContext);
}
