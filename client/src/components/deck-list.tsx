import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Lightbulb, Play, Trash2, Edit2, Eye, Loader2, BookOpen, Search, X, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Onboarding } from "@/components/onboarding";
import { AddDeckPicker } from "@/components/add-deck-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getCardStatus, formatInterval } from "@/lib/sm2";
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
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");

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

  const deckMap = useMemo(() => {
    const map = new Map<string, DeckWithCount>();
    decks.forEach(d => map.set(d.id, d));
    return map;
  }, [decks]);

  const globalSearchResults = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    if (!q) return [];
    return allCards.filter(c =>
      c.armenian.toLowerCase().includes(q) ||
      c.russian.toLowerCase().includes(q) ||
      c.sentence?.toLowerCase().includes(q) ||
      c.association?.toLowerCase().includes(q)
    );
  }, [allCards, globalSearchQuery]);

  const globalSearchDeckCount = useMemo(() => {
    const ids = new Set(globalSearchResults.map(c => c.deckId));
    return ids.size;
  }, [globalSearchResults]);

  const parseMutationError = (error: Error): string => {
    try {
      const text = error.message.replace(/^\d+:\s*/, "");
      const parsed = JSON.parse(text);
      return parsed.error || "Something went wrong";
    } catch {
      return "Something went wrong";
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
        <CardContent className="pt-6 space-y-3">
          <div>
            <h3 className="font-semibold text-lg" data-testid="text-all-decks-review">{t("deckList.allDecksReview")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("deckList.dueToday", { n: totalDue, m: totalNew })}
            </p>
          </div>
          <div className="flex gap-2">
            <div className="flex gap-2 flex-shrink-0">
              <Button
                onClick={() => onStartReview()}
                disabled={totalDue === 0 && totalNew === 0}
                size="icon"
                className="h-10 w-10 sm:w-auto sm:px-4"
                title={t("deckList.startReview")}
                data-testid="button-start-all-review"
              >
                <Play className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t("deckList.startReview")}</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10"
                onClick={() => onStartPractice()}
                disabled={allCards.length === 0}
                title={t("deckList.practiceMode")}
                data-testid="button-start-all-practice"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                placeholder={t("deckList.searchPlaceholder")}
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-8 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                data-testid="input-global-search"
              />
              {globalSearchQuery && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setGlobalSearchQuery("")}
                  data-testid="button-clear-global-search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      {globalSearchQuery.trim() ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground" data-testid="text-global-search-summary">
            {t("deckList.searchSummary", { results: globalSearchResults.length, decks: globalSearchDeckCount })}
          </p>
          {globalSearchResults.length === 0 ? (
            <div className="text-center py-12 space-y-4" data-testid="text-global-search-empty">
              <p className="text-muted-foreground">{t("deckList.searchEmpty")}</p>
              <Button variant="outline" onClick={() => setGlobalSearchQuery("")} data-testid="button-back-to-decks">
                {t("deckList.backToDecks")}
              </Button>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>{t("deckList.colWord")}</TableHead>
                    <TableHead>{t("deckList.colTranslation")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("deckList.colStatus")}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t("deckList.colInterval")}</TableHead>
                    <TableHead>{t("deckList.colDeck")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {globalSearchResults.map((card) => {
                    const status = getCardStatus(card);
                    const deck = deckMap.get(card.deckId);
                    return (
                      <TableRow key={card.id} data-testid={`row-global-card-${card.id}`}>
                        <TableCell>
                          <Star className={cn(
                            "h-4 w-4",
                            card.isStarred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                          )} />
                        </TableCell>
                        <TableCell className="font-sans text-lg">{card.armenian}</TableCell>
                        <TableCell>{card.russian}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant={status === "new" ? "default" : status === "learning" ? "secondary" : "outline"}>
                            {status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {formatInterval(card.interval)}
                        </TableCell>
                        <TableCell>
                          {deck ? (
                            <button
                              className="text-primary hover:underline text-sm font-medium"
                              onClick={() => {
                                setGlobalSearchQuery("");
                                onSelectDeck(deck.id);
                              }}
                              data-testid={`link-deck-${deck.id}-card-${card.id}`}
                            >
                              {deck.name}
                            </button>
                          ) : (
                            <span className="text-muted-foreground text-sm">{t("deckList.unknownDeck")}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      ) : (
      <>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">{t("deckList.yourDecks")}</h2>
        <Button onClick={() => setIsPickerOpen(true)} data-testid="button-create-deck">
          <Plus className="h-4 w-4 mr-2" />
          {t("deckList.newDeck")}
        </Button>
      </div>
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
      </>
      )}
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
              {t("deckList.deleteDeckDesc", { name: deletingDeck?.name ?? "" })}
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
