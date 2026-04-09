import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Lightbulb, Play, Trash2, Edit2, Eye, Loader2, BookOpen } from "lucide-react";
import { Onboarding } from "@/components/onboarding";
import { AddDeckPicker } from "@/components/add-deck-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import type { Deck, Card as FlashCard } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isDueToday, isNewCard } from "@/lib/sm2";
import { useProject } from "@/lib/project-context";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

interface DeckWithCount extends Deck {
  cardCount: number;
  dueCount: number;
  starredCount: number;
  inactiveCount: number;
}

interface DeckListProps {
  onSelectDeck: (deckId: string) => void;
  onStartReview: (deckId?: string) => void;
  onStartPractice: (deckId?: string) => void;
}

export function DeckList({ onSelectDeck, onStartReview, onStartPractice }: DeckListProps) {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const [, setLocation] = useLocation();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [deletingDeck, setDeletingDeck] = useState<Deck | null>(null);
  const [newDeckName, setNewDeckName] = useState("");
  const [newDeckLanguage, setNewDeckLanguage] = useState("");
  const [newDeckDescription, setNewDeckDescription] = useState("");
  const [deckError, setDeckError] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);

  const onboardingKey = activeProject ? `onboarding_done_${activeProject.id}` : null;

  const { data: decks = [], isLoading: decksLoading } = useQuery<DeckWithCount[]>({
    queryKey: ["/api/decks", { projectId: activeProject?.id }],
    queryFn: async () => {
      const url = activeProject?.id ? `/api/decks?projectId=${activeProject.id}` : "/api/decks";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch decks");
      return res.json();
    },
    enabled: !!activeProject,
  });

  const { data: allCards = [] } = useQuery<FlashCard[]>({
    queryKey: ["/api/cards", { projectId: activeProject?.id }],
    queryFn: async () => {
      const url = activeProject?.id ? `/api/cards?projectId=${activeProject.id}` : "/api/cards";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch cards");
      return res.json();
    },
    enabled: !!activeProject,
  });

  useEffect(() => {
    if (!decksLoading && decks.length === 0 && onboardingKey) {
      const done = localStorage.getItem(onboardingKey);
      if (!done) {
        setShowOnboarding(true);
      }
    }
  }, [decksLoading, decks.length, onboardingKey]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    if (onboardingKey) {
      localStorage.setItem(onboardingKey, "true");
    }
  };

  const handleOnboardingCreateDeck = () => {
    setIsPickerOpen(true);
  };

  const activeCards = allCards.filter(c => c.isActive);
  const totalDue = activeCards.filter(c => isDueToday(c)).length;
  const totalNew = activeCards.filter(c => isNewCard(c)).length;

  const parseMutationError = (error: Error): string => {
    try {
      const text = error.message.replace(/^\d+:\s*/, "");
      const parsed = JSON.parse(text);
      return parsed.error || t("batchImport.somethingWentWrong");
    } catch {
      return t("batchImport.somethingWentWrong");
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; language: string; description: string }) => {
      const res = await apiRequest("POST", "/api/decks", { ...data, projectId: activeProject?.id });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/decks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
      setIsCreateOpen(false);
      setNewDeckName("");
      setNewDeckLanguage("");
      setNewDeckDescription("");
      setDeckError("");
    },
    onError: (error: Error) => {
      setDeckError(parseMutationError(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; language: string; description: string } }) => {
      const res = await apiRequest("PATCH", `/api/decks/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/decks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
      setEditingDeck(null);
      setNewDeckName("");
      setNewDeckLanguage("");
      setNewDeckDescription("");
      setDeckError("");
    },
    onError: (error: Error) => {
      setDeckError(parseMutationError(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/decks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/decks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
      setDeletingDeck(null);
    },
  });

  const handleCreateDeck = () => {
    if (!newDeckName.trim() || !newDeckLanguage.trim()) return;
    setDeckError("");
    createMutation.mutate({ name: newDeckName.trim(), language: newDeckLanguage.trim(), description: newDeckDescription.trim() });
  };

  const handleUpdateDeck = () => {
    if (!editingDeck || !newDeckName.trim() || !newDeckLanguage.trim()) return;
    setDeckError("");
    updateMutation.mutate({
      id: editingDeck.id,
      data: { name: newDeckName.trim(), language: newDeckLanguage.trim(), description: newDeckDescription.trim() }
    });
  };

  const handleDeleteDeck = () => {
    if (!deletingDeck) return;
    deleteMutation.mutate(deletingDeck.id);
  };

  const openEditDialog = (deck: Deck) => {
    setEditingDeck(deck);
    setNewDeckName(deck.name);
    setNewDeckLanguage(deck.language || "");
    setNewDeckDescription(deck.description || "");
  };

  if (decksLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-lg" data-testid="text-all-decks-review">{t("deckList.allDecksReview")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("deckList.dueToday", { n: totalDue, m: totalNew })}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => onStartReview()}
                disabled={totalDue === 0 && totalNew === 0}
                data-testid="button-start-all-review"
              >
                <Play className="h-4 w-4 mr-2" />
                {t("deckList.startReview")}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onStartPractice()}
                disabled={allCards.length === 0}
                title={t("deckList.practiceMode")}
                data-testid="button-start-all-practice"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">{t("deckList.yourDecks")}</h2>
        <Button onClick={() => setIsPickerOpen(true)} data-testid="button-create-deck">
          <Plus className="h-4 w-4 mr-2" />
          {t("deckList.newDeck")}
        </Button>
      </div>
      <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) setDeckError(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deckList.createDeck")}</DialogTitle>
            <DialogDescription>
              {t("deckList.createDeckDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deck-name">{t("deckList.deckName")}</Label>
              <Input
                id="deck-name"
                placeholder={t("deckList.deckNamePlaceholder")}
                value={newDeckName}
                onChange={(e) => { setNewDeckName(e.target.value); setDeckError(""); }}
                data-testid="input-deck-name"
              />
              {deckError && (
                <p className="text-sm text-destructive" data-testid="text-deck-create-error">{deckError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="deck-language">{t("deckList.deckLanguage")}</Label>
              <Input
                id="deck-language"
                placeholder={t("deckList.deckLanguagePlaceholder")}
                value={newDeckLanguage}
                onChange={(e) => setNewDeckLanguage(e.target.value)}
                data-testid="input-deck-language"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deck-description">{t("deckList.deckDescription")}</Label>
              <Textarea
                id="deck-description"
                placeholder={t("deckList.deckDescriptionPlaceholder")}
                value={newDeckDescription}
                onChange={(e) => setNewDeckDescription(e.target.value)}
                data-testid="input-deck-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              {t("deckList.cancel")}
            </Button>
            <Button
              onClick={handleCreateDeck}
              disabled={!newDeckName.trim() || !newDeckLanguage.trim() || createMutation.isPending}
              data-testid="button-confirm-create-deck"
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("deckList.createDeck")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {decks.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => {
            const deckCards = allCards.filter(c => c.deckId === deck.id);
            const newCount = deckCards.filter(c => isNewCard(c)).length;

            return (
              <Card
                key={deck.id}
                className="hover-elevate cursor-pointer"
                onClick={() => onSelectDeck(deck.id)}
                data-testid={`card-deck-${deck.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{deck.name}</CardTitle>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(deck);
                        }}
                        data-testid={`button-edit-deck-${deck.id}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingDeck(deck);
                        }}
                        data-testid={`button-delete-deck-${deck.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {deck.description && (
                    <p className="text-sm text-muted-foreground">{deck.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="outline">{t("deckList.cards", { n: deck.cardCount })}</Badge>
                    {deck.dueCount > 0 && <Badge variant="default">{t("deckList.due", { n: deck.dueCount })}</Badge>}
                    {newCount > 0 && <Badge variant="secondary">{t("deckList.new_badge", { n: newCount })}</Badge>}
                    {deck.starredCount > 0 && <Badge variant="outline" className="text-yellow-600">{t("deckList.starred", { n: deck.starredCount })}</Badge>}
                    {deck.inactiveCount > 0 && <Badge variant="outline" className="text-muted-foreground">{t("deckList.off", { n: deck.inactiveCount })}</Badge>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      variant="outline"
                      disabled={deck.dueCount === 0 && newCount === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartReview(deck.id);
                      }}
                      data-testid={`button-review-deck-${deck.id}`}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      {t("deckList.study")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={deck.cardCount === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartPractice(deck.id);
                      }}
                      title={t("deckList.practiceMode")}
                      data-testid={`button-practice-deck-${deck.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <Card data-testid="card-tips">
        <CardContent className="py-8">
          <div className="flex items-start gap-4">
            <Lightbulb className="h-8 w-8 text-muted-foreground flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold mb-3" data-testid="text-tips-heading">{t("deckList.tipsHeading")}</h3>
              <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside" data-testid="list-tips">
                <li data-testid="text-tip-1">{t("deckList.tip1")}</li>
                <li data-testid="text-tip-2">{t("deckList.tip2")}</li>
                <li data-testid="text-tip-3">{t("deckList.tip3")}</li>
                <li data-testid="text-tip-4">{t("deckList.tip4")}</li>
                <li data-testid="text-tip-5">{t("deckList.tip5")}</li>
              </ul>
              <div className="mt-4 flex gap-2 flex-wrap">
                <Button onClick={() => setIsPickerOpen(true)} data-testid="button-create-first-deck">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("deckList.addADeck")}
                </Button>
                <Button variant="outline" onClick={() => setLocation("/import/lib")} data-testid="button-decks-library">
                  <BookOpen className="h-4 w-4 mr-2" />
                  {t("deckList.decksLibrary")}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Dialog open={!!editingDeck} onOpenChange={(open) => { if (!open) { setEditingDeck(null); setDeckError(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deckList.editDeck")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-deck-name">{t("deckList.deckName")}</Label>
              <Input
                id="edit-deck-name"
                value={newDeckName}
                onChange={(e) => { setNewDeckName(e.target.value); setDeckError(""); }}
                data-testid="input-edit-deck-name"
              />
              {deckError && (
                <p className="text-sm text-destructive" data-testid="text-deck-edit-error">{deckError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-deck-language">{t("deckList.deckLanguage")}</Label>
              <Input
                id="edit-deck-language"
                value={newDeckLanguage}
                onChange={(e) => setNewDeckLanguage(e.target.value)}
                data-testid="input-edit-deck-language"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-deck-description">{t("deckList.deckDescription")}</Label>
              <Textarea
                id="edit-deck-description"
                value={newDeckDescription}
                onChange={(e) => setNewDeckDescription(e.target.value)}
                data-testid="input-edit-deck-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDeck(null)}>
              {t("deckList.cancel")}
            </Button>
            <Button
              onClick={handleUpdateDeck}
              disabled={!newDeckName.trim() || !newDeckLanguage.trim() || updateMutation.isPending}
              data-testid="button-confirm-edit-deck"
            >
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("deckList.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deletingDeck} onOpenChange={(open) => !open && setDeletingDeck(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deckList.deleteDeck")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deckList.deleteDeckDesc", { name: deletingDeck?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("deckList.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDeck}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete-deck"
            >
              {t("deckList.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Onboarding
        open={showOnboarding}
        onComplete={handleOnboardingComplete}
        onCreateDeck={handleOnboardingCreateDeck}
      />
      <AddDeckPicker
        open={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onCreateDeck={() => setIsCreateOpen(true)}
      />
    </div>
  );
}
