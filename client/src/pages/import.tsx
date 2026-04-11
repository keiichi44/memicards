import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { BatchImport } from "@/components/batch-import";
import { LibraryList } from "@/components/library-list";
import { Button } from "@/components/ui/button";

export default function Import() {
  const [location, setLocation] = useLocation();
  const { t } = useTranslation();
  const tab = location === "/import/lib" ? "library" : "batch";

  return (
    <div className="p-6 space-y-6">
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        <Button
          variant={tab === "batch" ? "default" : "ghost"}
          size="sm"
          onClick={() => setLocation("/import")}
          data-testid="button-tab-batch-import"
        >
          {t("import.tabBatchImport")}
        </Button>
        <Button
          variant={tab === "library" ? "default" : "ghost"}
          size="sm"
          onClick={() => setLocation("/import/lib")}
          data-testid="button-tab-decks-library"
        >
          {t("import.tabDecksLibrary")}
        </Button>
      </div>

      {tab === "batch" ? (
        <BatchImport onComplete={() => setLocation("/")} />
      ) : (
        <LibraryList />
      )}
    </div>
  );
}
