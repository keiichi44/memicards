import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
        title: t("library.toastImportedTitle"),
        description: t("library.toastImportedDesc", { deckName: deck.name, projectName: activeProject?.name || "" }),
      });
    },
    onError: () => {
      toast({ title: t("library.toastFailedTitle"), description: t("library.toastFailedDesc"), variant: "destructive" });
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
        <p>{t("library.empty")}</p>
      </div>
    );
  }

  const languageMap = new Map<string, LibraryDeck[]>();
  for (const deck of decks) {
    const lang = deck.language || "Other";
    if (!languageMap.has(lang)) languageMap.set(lang, []);
    languageMap.get(lang)!.push(deck);
  }
  const sortedLanguages = [...languageMap.keys()].sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold mb-2">{t("library.title")}</h2>
        <p className="text-muted-foreground">
          {t("library.subtitle")}
        </p>
      </div>

      {sortedLanguages.map((language) => (
        <div key={language} className="space-y-3">
          <h3 className="text-lg font-semibold border-b pb-1">{language}</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {languageMap.get(language)!.map((deck) => (
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
                    <Badge variant="outline">{t("library.cards", { n: deck.cardCount })}</Badge>
                  </div>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImportingDeck(deck);
                    }}
                    data-testid={`button-import-library-deck-${deck.filename}`}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {t("library.import")}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      <AlertDialog open={!!importingDeck} onOpenChange={(open) => { if (!open) setImportingDeck(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("library.importDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("library.importDialogDesc", { deckName: importingDeck?.name || "", projectName: activeProject?.name || "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-library-import">{t("library.no")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => importingDeck && importMutation.mutate(importingDeck)}
              disabled={importMutation.isPending}
              data-testid="button-confirm-library-import"
            >
              {importMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("library.yes")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
