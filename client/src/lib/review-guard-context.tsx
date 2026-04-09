import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
            <AlertDialogTitle>{t("reviewGuard.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("reviewGuard.desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleStay} data-testid="button-stay-here">
              {t("reviewGuard.stayHere")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleInterrupt} data-testid="button-interrupt-and-go">
              {t("reviewGuard.interruptAndGo")}
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
