import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";

interface AddDeckPickerProps {
  open: boolean;
  onClose: () => void;
  onCreateDeck: () => void;
}

export function AddDeckPicker({ open, onClose, onCreateDeck }: AddDeckPickerProps) {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

  const handleCreateDeck = () => {
    onClose();
    onCreateDeck();
  };

  const handleImportCSV = () => {
    onClose();
    setLocation("/import");
  };

  const handleChooseLibrary = () => {
    onClose();
    setLocation("/import/lib");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm p-6">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">{t("addDeckPicker.title")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-2">
          <button
            onClick={handleCreateDeck}
            className="flex items-center gap-4 rounded-xl border p-4 text-left hover:bg-muted/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="button-picker-create-deck"
          >
            <img src="/images/deck-new.png" alt="Create deck" className="w-14 h-14 object-contain shrink-0" />
            <div>
              <p className="font-semibold">{t("addDeckPicker.createDeck")}</p>
              <p className="text-sm text-muted-foreground">{t("addDeckPicker.createDeckDesc")}</p>
            </div>
          </button>

          <button
            onClick={handleImportCSV}
            className="flex items-center gap-4 rounded-xl border p-4 text-left hover:bg-muted/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="button-picker-import-csv"
          >
            <img src="/images/deck-csv.png" alt="Import CSV" className="w-14 h-14 object-contain shrink-0" />
            <div>
              <p className="font-semibold">{t("addDeckPicker.importCSV")}</p>
              <p className="text-sm text-muted-foreground">{t("addDeckPicker.importCSVDesc")}</p>
            </div>
          </button>

          <button
            onClick={handleChooseLibrary}
            className="flex items-center gap-4 rounded-xl border p-4 text-left hover:bg-muted/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="button-picker-library"
          >
            <img src="/images/deck-lib.png" alt="Decks Library" className="w-14 h-14 object-contain shrink-0" />
            <div>
              <p className="font-semibold">{t("addDeckPicker.chooseLibrary")}</p>
              <p className="text-sm text-muted-foreground">{t("addDeckPicker.chooseLibraryDesc")}</p>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
