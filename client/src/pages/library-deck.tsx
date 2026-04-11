import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Download, Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

interface LibraryCard {
  word: string;
  translation: string;
  sentence: string;
  association: string;
}

interface LibraryDeckData {
  name: string;
  language: string;
  cards: LibraryCard[];
}

export default function LibraryDeckPage() {
  const { filename } = useParams<{ filename: string }>();
  const [, setLocation] = useLocation();
  const { activeProject } = useProject();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [showImportDialog, setShowImportDialog] = useState(false);

  const { data, isLoading, isError } = useQuery<LibraryDeckData>({
    queryKey: ["/api/library", filename, "cards"],
    queryFn: async () => {
      const res = await fetch(`/api/library/${encodeURIComponent(filename!)}/cards`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!filename,
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/library/${encodeURIComponent(filename!)}/import`, {
        projectId: activeProject?.id,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/decks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
      setShowImportDialog(false);
      toast({
        title: t("library.toastImportedTitle"),
        description: t("library.toastImportedDesc", { deckName: data?.name || "", projectName: activeProject?.name || "" }),
      });
    },
    onError: () => {
      toast({ title: t("library.toastFailedTitle"), description: t("library.toastFailedDesc"), variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 flex flex-col items-center gap-4 text-muted-foreground">
        <BookOpen className="h-12 w-12" />
        <p>{t("library.deckNotFound")}</p>
        <Button variant="outline" onClick={() => setLocation("/import/lib")}>
          {t("library.backToLibrary")}
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/import/lib")}
            data-testid="button-back-library"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{data.name}</h1>
              <Badge variant="secondary">{data.language}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{t("library.cards", { n: data.cards.length })}</p>
          </div>
        </div>
        <Button variant="secondary" onClick={() => setShowImportDialog(true)} data-testid="button-import-library-deck-header">
          <Download className="h-4 w-4 mr-2" />
          {t("library.importTo", { projectName: activeProject?.name || "" })}
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("library.colWord")}</TableHead>
              <TableHead>{t("library.colTranslation")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("library.colExample")}</TableHead>
              <TableHead className="hidden lg:table-cell">{t("library.colAssociation")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.cards.map((card, idx) => (
              <TableRow key={idx} data-testid={`row-library-card-${idx}`}>
                <TableCell className="font-medium">{card.word}</TableCell>
                <TableCell>{card.translation}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                  {card.sentence || "—"}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground text-sm italic">
                  {card.association || "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("library.importDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("library.importDialogDesc", { deckName: data.name, projectName: activeProject?.name || "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-library-import-detail">{t("library.no")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => importMutation.mutate()}
              disabled={importMutation.isPending}
              data-testid="button-confirm-library-import-detail"
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
