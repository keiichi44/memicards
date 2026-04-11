import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Upload, FileText, AlertCircle, CheckCircle, Loader2, Download, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Deck, Project } from "@shared/schema";
import { parseCSV, importCards } from "@/lib/storage";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useProject } from "@/lib/project-context";
import { useToast } from "@/hooks/use-toast";

interface BatchImportProps {
  onComplete: () => void;
}

export function BatchImport({ onComplete }: BatchImportProps) {
  const { t } = useTranslation();
  const { activeProject, projects } = useProject();
  const { toast } = useToast();

  const { data: allDecks = [] } = useQuery<Deck[]>({
    queryKey: ["/api/decks"],
    queryFn: async () => {
      const res = await fetch("/api/decks");
      if (!res.ok) throw new Error("Failed to fetch decks");
      return res.json();
    },
  });

  const projectMap = new Map<string, Project>();
  for (const p of projects) {
    projectMap.set(p.id, p);
  }

  const sortedDecks = [...allDecks].sort((a, b) => {
    const aIsCurrent = a.projectId === activeProject?.id ? 0 : 1;
    const bIsCurrent = b.projectId === activeProject?.id ? 0 : 1;
    if (aIsCurrent !== bIsCurrent) return aIsCurrent - bIsCurrent;
    return a.name.localeCompare(b.name);
  });

  const noDecks = sortedDecks.length === 0;

  const [selectedDeckId, setSelectedDeckId] = useState<string>("");
  const [updateExisting, setUpdateExisting] = useState(true);
  const [csvContent, setCsvContent] = useState("");
  const [separator, setSeparator] = useState<"," | ";">(",");
  const [result, setResult] = useState<{ imported: number; updated: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isCreateDeckOpen, setIsCreateDeckOpen] = useState(false);
  const [newDeckName, setNewDeckName] = useState("");
  const [newDeckLanguage, setNewDeckLanguage] = useState("");
  const [newDeckDescription, setNewDeckDescription] = useState("");
  const [deckError, setDeckError] = useState("");

  const createDeckMutation = useMutation({
    mutationFn: async (data: { name: string; language: string; description: string }) => {
      const res = await apiRequest("POST", "/api/decks", { ...data, projectId: activeProject?.id });
      return res.json() as Promise<Deck>;
    },
    onSuccess: (deck) => {
      queryClient.invalidateQueries({ queryKey: ["/api/decks"] });
      setSelectedDeckId(deck.id);
      setIsCreateDeckOpen(false);
      setNewDeckName("");
      setNewDeckLanguage("");
      setNewDeckDescription("");
      setDeckError("");
      toast({
        title: t("batchImport.createNewDeckTitle"),
        description: t("batchImport.deckCreatedDesc"),
      });
    },
    onError: (err: Error) => {
      try {
        const text = err.message.replace(/^\d+:\s*/, "");
        const parsed = JSON.parse(text);
        setDeckError(parsed.error || "Something went wrong");
      } catch {
        setDeckError("Something went wrong");
      }
    },
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const parsedCards = parseCSV(csvContent, separator);
      if (parsedCards.length === 0) {
        throw new Error(`No valid cards found in the CSV. Make sure format is: word${separator}translation${separator}sentence${separator}association`);
      }
      return importCards(parsedCards, selectedDeckId, updateExisting);
    },
    onSuccess: (data) => {
      setResult(data);
      setCsvContent("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      queryClient.invalidateQueries({ queryKey: ["/api/cards"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["/api/decks"] });
    },
    onError: (err) => {
      setError(`Import failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
      setResult(null);
      setError(null);
    };
    reader.onerror = () => {
      setError("Failed to read file");
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!selectedDeckId) {
      setError("Please select a deck");
      return;
    }
    if (!csvContent.trim()) {
      setError("Please provide CSV data");
      return;
    }
    setError(null);
    setResult(null);
    importMutation.mutate();
  };

  const handleCreateDeck = () => {
    if (!newDeckName.trim() || !newDeckLanguage.trim()) return;
    setDeckError("");
    createDeckMutation.mutate({
      name: newDeckName.trim(),
      language: newDeckLanguage.trim(),
      description: newDeckDescription.trim(),
    });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-2xl font-semibold mb-2">{t("batchImport.title")}</h2>
        <p className="text-muted-foreground">
          {t("batchImport.subtitle")}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("batchImport.howToTitle")}</CardTitle>
          <CardDescription className="text-sm text-[#000000]">{t("batchImport.howToStep1")}</CardDescription>
          <a href="/csv-template.csv" download="csv-template.csv" className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-1" data-testid="link-download-csv-template">
            <Download className="h-3 w-3" />
            {t("batchImport.downloadTemplate")}
          </a>
          <CardDescription className="text-sm text-[#000000]">{t("batchImport.howToStep2")}</CardDescription>
        </CardHeader>
        <CardContent>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("batchImport.importCSVTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="deck-select">{t("batchImport.targetDeck")}</Label>
            <Select value={selectedDeckId} onValueChange={setSelectedDeckId} disabled={noDecks}>
              <SelectTrigger id="deck-select" data-testid="select-import-deck">
                <SelectValue placeholder={noDecks ? t("batchImport.noDecksPlaceholder") : t("batchImport.selectDeckPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {sortedDecks.map((deck) => (
                  <SelectItem key={deck.id} value={deck.id} data-testid={`select-deck-${deck.id}`}>
                    {deck.name} ({projectMap.get(deck.projectId || "")?.name || "No project"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateDeckOpen(true)}
              data-testid="button-create-deck-inline"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              {t("batchImport.createNewDeck")}
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="separator-select">{t("batchImport.csvSeparator")}</Label>
            <Select
              value={separator}
              onValueChange={(val) => setSeparator(val as "," | ";")}
              disabled={noDecks}
            >
              <SelectTrigger id="separator-select" data-testid="select-separator">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=",">{t("batchImport.comma")}</SelectItem>
                <SelectItem value=";">{t("batchImport.semicolon")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">{t("batchImport.separatorHint")}</p>
          </div>

          <div className={`flex items-center justify-between ${noDecks ? "opacity-50 pointer-events-none" : ""}`}>
            <div className="space-y-0.5">
              <Label htmlFor="update-existing">{t("batchImport.updateExisting")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("batchImport.updateExistingDesc")}
              </p>
            </div>
            <Switch
              id="update-existing"
              checked={updateExisting}
              onCheckedChange={setUpdateExisting}
              disabled={noDecks}
              data-testid="switch-update-existing"
            />
          </div>

          <div className="space-y-2">
            <Label>{t("batchImport.uploadFile")}</Label>
            <div className={`border-2 border-dashed rounded-md p-6 text-center ${noDecks ? "opacity-50 pointer-events-none" : ""}`}>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                ref={fileInputRef}
                className="hidden"
                id="file-upload"
                disabled={noDecks}
                data-testid="input-file-upload"
              />
              <label htmlFor="file-upload" className={noDecks ? "cursor-default" : "cursor-pointer"}>
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {t("batchImport.clickToUpload")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("batchImport.csvOrTxt")}
                </p>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="csv-content">{t("batchImport.pasteCsv")}</Label>
            <Textarea
              id="csv-content"
              placeholder="word,translation,sentence,association&#10;hello,привет,Hello! How are you?,greeting"
              value={csvContent}
              disabled={noDecks}
              onChange={(e) => {
                setCsvContent(e.target.value);
                setResult(null);
                setError(null);
              }}
              rows={8}
              className="font-mono text-sm"
              data-testid="textarea-csv-content"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t("batchImport.errorTitle")}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle>{t("batchImport.importComplete")}</AlertTitle>
              <AlertDescription>
                {t("batchImport.importCompleteDesc", { imported: result.imported, updated: result.updated })}
                {result.skipped > 0 && t("batchImport.skipped", { n: result.skipped })}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onComplete} data-testid="button-cancel-import">
              {result ? t("batchImport.done") : t("batchImport.cancelImport")}
            </Button>
            <Button
              onClick={handleImport}
              disabled={noDecks || !selectedDeckId || !csvContent.trim() || importMutation.isPending}
              data-testid="button-import-cards"
            >
              {importMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
              {importMutation.isPending ? t("batchImport.importing") : t("batchImport.importCards")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isCreateDeckOpen} onOpenChange={(open) => { setIsCreateDeckOpen(open); if (!open) setDeckError(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("batchImport.createNewDeckTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-deck-name">{t("batchImport.nameLabel")}</Label>
              <Input
                id="new-deck-name"
                placeholder={t("batchImport.deckNamePlaceholder")}
                value={newDeckName}
                onChange={(e) => { setNewDeckName(e.target.value); setDeckError(""); }}
                data-testid="input-new-deck-name"
              />
              {deckError && (
                <p className="text-sm text-destructive">{deckError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-deck-language">{t("batchImport.languageLabel")}</Label>
              <Input
                id="new-deck-language"
                placeholder={t("batchImport.deckLanguagePlaceholder")}
                value={newDeckLanguage}
                onChange={(e) => setNewDeckLanguage(e.target.value)}
                data-testid="input-new-deck-language"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-deck-description">{t("batchImport.descriptionLabel")}</Label>
              <Textarea
                id="new-deck-description"
                placeholder={t("batchImport.deckDescriptionPlaceholder")}
                value={newDeckDescription}
                onChange={(e) => setNewDeckDescription(e.target.value)}
                data-testid="input-new-deck-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDeckOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleCreateDeck}
              disabled={!newDeckName.trim() || !newDeckLanguage.trim() || createDeckMutation.isPending}
              data-testid="button-confirm-create-deck-inline"
            >
              {createDeckMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("batchImport.createDeck")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
