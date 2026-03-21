import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
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
        title: "Deck imported",
        description: `"${data?.name}" has been added to ${activeProject?.name || "your project"}.`,
      });
    },
    onError: () => {
      toast({ title: "Import failed", description: "Something went wrong.", variant: "destructive" });
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
        <p>Deck not found.</p>
        <Button variant="outline" onClick={() => setLocation("/import/lib")}>
          Back to Library
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
            <p className="text-sm text-muted-foreground">{data.cards.length} cards</p>
          </div>
        </div>
        <Button onClick={() => setShowImportDialog(true)} data-testid="button-import-library-deck-header">
          <Download className="h-4 w-4 mr-2" />
          Import to {activeProject?.name || "project"}
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Word</TableHead>
              <TableHead>Translation</TableHead>
              <TableHead className="hidden md:table-cell">Example</TableHead>
              <TableHead className="hidden lg:table-cell">Association</TableHead>
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
            <AlertDialogTitle>Import deck?</AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to copy "{data.name}" to your "{activeProject?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-library-import-detail">No</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => importMutation.mutate()}
              disabled={importMutation.isPending}
              data-testid="button-confirm-library-import-detail"
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
