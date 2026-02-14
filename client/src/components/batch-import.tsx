import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Upload, FileText, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Deck, Project } from "@shared/schema";
import { parseCSV, importCards } from "@/lib/storage";
import { queryClient } from "@/lib/queryClient";
import { useProject } from "@/lib/project-context";

interface BatchImportProps {
  onComplete: () => void;
}

export function BatchImport({ onComplete }: BatchImportProps) {
  const { activeProject, projects } = useProject();
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
  
  const [selectedDeckId, setSelectedDeckId] = useState<string>("");
  const [updateExisting, setUpdateExisting] = useState(true);
  const [csvContent, setCsvContent] = useState("");
  const [separator, setSeparator] = useState<"," | ";">(",");
  const [result, setResult] = useState<{ imported: number; updated: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
  
  const sampleCSV = separator === ","
    ? `word,translation,sentence,association
hello,привет,Hello! How are you?,greeting word
book,книга,The book is on the table,reading material
water,вода,Can I have some water?,essential liquid`
    : `word;translation;sentence;association
hello;привет;Hello! How are you?;greeting word
book;книга;The book is on the table;reading material
water;вода;Can I have some water?;essential liquid`;
  
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Batch Import</h2>
        <p className="text-muted-foreground">
          Import multiple cards at once from a CSV file or paste directly.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">CSV Format</CardTitle>
          <CardDescription>1. Prepare a spreadsheet with the following columns: word, translation, sentence (optional), association (optional). Each row represents each card, e.g.:2. Save it as CSV</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto font-mono">
            {sampleCSV}
          </pre>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="deck-select">Target Deck *</Label>
            <Select value={selectedDeckId} onValueChange={setSelectedDeckId}>
              <SelectTrigger id="deck-select" data-testid="select-import-deck">
                <SelectValue placeholder="Select a deck" />
              </SelectTrigger>
              <SelectContent>
                {sortedDecks.map((deck) => (
                  <SelectItem key={deck.id} value={deck.id} data-testid={`select-deck-${deck.id}`}>
                    {deck.name} ({projectMap.get(deck.projectId || "")?.name || "No project"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {sortedDecks.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No decks available. Create a deck first.
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="separator-select">CSV Separator</Label>
            <Select value={separator} onValueChange={(val) => setSeparator(val as "," | ";")}>
              <SelectTrigger id="separator-select" data-testid="select-separator">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=",">Comma (,)</SelectItem>
                <SelectItem value=";">Semicolon (;)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Choose the separator used in your CSV file
            </p>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="update-existing">Update existing cards</Label>
              <p className="text-sm text-muted-foreground">
                If a card with the same word exists, update it
              </p>
            </div>
            <Switch
              id="update-existing"
              checked={updateExisting}
              onCheckedChange={setUpdateExisting}
              data-testid="switch-update-existing"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Upload CSV File</Label>
            <div className="border-2 border-dashed rounded-md p-6 text-center">
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                ref={fileInputRef}
                className="hidden"
                id="file-upload"
                data-testid="input-file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  CSV or TXT files
                </p>
              </label>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="csv-content">Or paste CSV content directly</Label>
            <Textarea
              id="csv-content"
              placeholder="word,translation,sentence,association&#10;hello,привет,Hello! How are you?,greeting"
              value={csvContent}
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
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {result && (
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle>Import Complete</AlertTitle>
              <AlertDescription>
                {result.imported} cards imported, {result.updated} updated
                {result.skipped > 0 && `, ${result.skipped} skipped`}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onComplete} data-testid="button-cancel-import">
              {result ? "Done" : "Cancel"}
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={!selectedDeckId || !csvContent.trim() || importMutation.isPending}
              data-testid="button-import-cards"
            >
              {importMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
              {importMutation.isPending ? "Importing..." : "Import Cards"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
