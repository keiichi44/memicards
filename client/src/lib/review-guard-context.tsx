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
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  requestNavigation: (callback: () => void) => void;
}

const ReviewGuardContext = createContext<ReviewGuardContextType>({
  isInSession: false,
  setInSession: () => {},
  hasUnsavedChanges: false,
  setHasUnsavedChanges: () => {},
  requestNavigation: () => {},
});

export function ReviewGuardProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [isInSession, setIsInSession] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false);
  const pendingAction = useRef<(() => void) | null>(null);

  const setInSession = useCallback((active: boolean) => {
    setIsInSession(active);
  }, []);

  const requestNavigation = useCallback((callback: () => void) => {
    if (isInSession) {
      pendingAction.current = callback;
      setSessionDialogOpen(true);
    } else if (hasUnsavedChanges) {
      pendingAction.current = callback;
      setUnsavedDialogOpen(true);
    } else {
      callback();
    }
  }, [isInSession, hasUnsavedChanges]);

  const handleInterrupt = () => {
    setIsInSession(false);
    setSessionDialogOpen(false);
    if (pendingAction.current) {
      pendingAction.current();
      pendingAction.current = null;
    }
  };

  const handleSessionStay = () => {
    setSessionDialogOpen(false);
    pendingAction.current = null;
  };

  const handleLeaveAnyway = () => {
    setHasUnsavedChanges(false);
    setUnsavedDialogOpen(false);
    if (pendingAction.current) {
      pendingAction.current();
      pendingAction.current = null;
    }
  };

  const handleUnsavedStay = () => {
    setUnsavedDialogOpen(false);
    pendingAction.current = null;
  };

  return (
    <ReviewGuardContext.Provider value={{ isInSession, setInSession, hasUnsavedChanges, setHasUnsavedChanges, requestNavigation }}>
      {children}
      <AlertDialog open={sessionDialogOpen} onOpenChange={(open) => { if (!open) handleSessionStay(); }}>
        <AlertDialogContent data-testid="dialog-interrupt-session">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("reviewGuard.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("reviewGuard.desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleSessionStay} data-testid="button-stay-here">
              {t("reviewGuard.stayHere")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleInterrupt} data-testid="button-interrupt-and-go">
              {t("reviewGuard.interruptAndGo")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={unsavedDialogOpen} onOpenChange={(open) => { if (!open) handleUnsavedStay(); }}>
        <AlertDialogContent data-testid="dialog-unsaved-changes">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("unsavedGuard.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("unsavedGuard.desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleUnsavedStay} data-testid="button-unsaved-stay-here">
              {t("unsavedGuard.stayHere")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleLeaveAnyway} data-testid="button-leave-anyway">
              {t("unsavedGuard.leaveAnyway")}
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
