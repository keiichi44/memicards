import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BookOpen, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { useProject } from "@/lib/project-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface LibraryDeck {
  filename: string;
  name: string;
  language: string;
  cardCount: number;
}

export function LibraryList() {
  const { activeProject } = useProject();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [importingDeck, setImportingDeck] = useState<LibraryDeck | null>(null);

  const { data: decks = [], isLoading } = useQuery<LibraryDeck[]>({
    queryKey: ["/api/library"],
  });

  const importMutation = useMutation({
    mutationFn: async (deck: LibraryDeck) => {
      const res = await apiRequest("POST", `/api/library/${encodeURIComponent(deck.filename)}/import`, {
        projectId: activeProject?.id,
      });
      return res.json();
    },
    onSuccess: (_, deck) => {
      queryClient.invalidateQueries({ queryKey: ["/api/decks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
      setImportingDeck(null);
      toast({
        title: "Deck imported",
        description: `"${deck.name}" has been added to ${activeProject?.name || "your project"}.`,
      });
    },
    onError: () => {
      toast({ title: "Import failed", description: "Something went wrong.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (decks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] text-muted-foreground gap-2">
        <BookOpen className="h-10 w-10" />
        <p>No decks in the library yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Decks Library</h2>
        <p className="text-muted-foreground">
          Browse and import ready-made decks into your project.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {decks.map((deck) => (
          <Card
            key={deck.filename}
            className="hover-elevate cursor-pointer"
            onClick={() => setLocation(`/library/${encodeURIComponent(deck.filename)}`)}
            data-testid={`card-library-deck-${deck.filename}`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg">{deck.name}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline">{deck.cardCount} cards</Badge>
                <Badge variant="secondary">{deck.language}</Badge>
              </div>
              <Button
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  setImportingDeck(deck);
                }}
                data-testid={`button-import-library-deck-${deck.filename}`}
              >
                <Download className="h-4 w-4 mr-2" />
                Import
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!importingDeck} onOpenChange={(open) => { if (!open) setImportingDeck(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import deck?</AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to copy "{importingDeck?.name}" to your "{activeProject?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-library-import">No</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => importingDeck && importMutation.mutate(importingDeck)}
              disabled={importMutation.isPending}
              data-testid="button-confirm-library-import"
            >
              {importMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
