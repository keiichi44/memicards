import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { BatchImport } from "@/components/batch-import";
import { LibraryList } from "@/components/library-list";
import { Button } from "@/components/ui/button";

type Tab = "batch" | "library";

export default function Import() {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("tab") === "library" ? "library" : "batch";
    }
    return "batch";
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlTab = params.get("tab") === "library" ? "library" : "batch";
    if (urlTab !== tab) {
      setTab(urlTab);
    }
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        <Button
          variant={tab === "batch" ? "default" : "ghost"}
          size="sm"
          onClick={() => setTab("batch")}
          data-testid="button-tab-batch-import"
        >
          Batch Import
        </Button>
        <Button
          variant={tab === "library" ? "default" : "ghost"}
          size="sm"
          onClick={() => setTab("library")}
          data-testid="button-tab-decks-library"
        >
          Decks Library
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
