import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Plus, Star, Search, Filter, Edit2, Trash2, Download, Loader2, Copy, ArrowRightLeft, FolderInput, MoreVertical, Play, Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Card as FlashCard, Deck, CardFilter } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { exportCardsToCSV } from "@/lib/storage";
import { isDueToday, isNewCard, getCardStatus, formatInterval } from "@/lib/sm2";
import { cn } from "@/lib/utils";
import { useProject } from "@/lib/project-context";

interface CardListProps {
  deckId: string;
  onBack: () => void;
}

export function CardList({ deckId, onBack }: CardListProps) {
  const { t } = useTranslation();
  const { activeProject, projects } = useProject();
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<CardFilter["filter"]>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<FlashCard | null>(null);
  const [deletingCard, setDeletingCard] = useState<FlashCard | null>(null);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [moveError, setMoveError] = useState("");
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeletingDeck, setIsDeletingDeck] = useState(false);
  const [renameName, setRenameName] = useState("");
  const [renameLanguage, setRenameLanguage] = useState("");
  const [renameDescription, setRenameDescription] = useState("");
  const [renameError, setRenameError] = useState("");

  const [formData, setFormData] = useState({
    armenian: "",
    russian: "",
    sentence: "",
    association: "",
  });

  const { data: deck } = useQuery<Deck>({
    queryKey: ["/api/decks", deckId],
  });

  const { data: cards = [], isLoading } = useQuery<FlashCard[]>({
    queryKey: ["/api/cards", deckId],
    queryFn: async () => {
      const res = await fetch(`/api/cards?deckId=${deckId}`);
      if (!res.ok) throw new Error(`Failed to fetch cards: ${res.status}`);
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/cards", {
        armenian: data.armenian.trim(),
        russian: data.russian.trim(),
        sentence: data.sentence.trim(),
        association: data.association.trim(),
        deckId,
        isStarred: false,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cards"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["/api/decks"] });
      resetForm();
      setIsCreateOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FlashCard> }) => {
      const res = await apiRequest("PATCH", `/api/cards/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cards"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["/api/decks"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/cards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cards"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["/api/decks"] });
      setDeletingCard(null);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async ({ swap }: { swap: boolean }) => {
      const res = await apiRequest("POST", `/api/decks/${deckId}/duplicate`, { swap });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/decks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cards"], refetchType: "all" });
      onBack();
    },
  });

  const parseMoveError = (error: Error): string => {
    try {
      const text = error.message.replace(/^\d+:\s*/, "");
      const parsed = JSON.parse(text);
      return parsed.error || t("cardList.moveError");
    } catch {
      return t("cardList.moveError");
    }
  };

  const moveMutation = useMutation({
    mutationFn: async (targetProjectId: string) => {
      const res = await apiRequest("PATCH", `/api/decks/${deckId}`, { projectId: targetProjectId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/decks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cards"], refetchType: "all" });
      setIsMoveOpen(false);
      setSelectedProjectId(null);
      setMoveError("");
      onBack();
    },
    onError: (error: Error) => {
      setMoveError(parseMoveError(error));
    },
  });

  const renameMutation = useMutation({
    mutationFn: async (data: { name: string; language: string; description: string }) => {
      const res = await apiRequest("PATCH", `/api/decks/${deckId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/decks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cards"], refetchType: "all" });
      setIsRenameOpen(false);
      setRenameError("");
    },
    onError: () => {
      setRenameError(t("cardList.failedToRenameDeck"));
    },
  });

  const deleteDeckMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/decks/${deckId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/decks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cards"], refetchType: "all" });
      setIsDeletingDeck(false);
      onBack();
    },
  });

  const openRenameDialog = () => {
    setRenameName(deck?.name || "");
    setRenameLanguage(deck?.language || "");
    setRenameDescription(deck?.description || "");
    setRenameError("");
    setTimeout(() => setIsRenameOpen(true), 0);
  };

  const handleRenameDeck = () => {
    if (!renameName.trim() || !renameLanguage.trim()) return;
    renameMutation.mutate({
      name: renameName.trim(),
      language: renameLanguage.trim(),
      description: renameDescription.trim(),
    });
  };

  const filteredCards = useMemo(() => {
    let result = [...cards];

    if (filter === "due") {
      result = result.filter(c => isDueToday(c));
    } else if (filter === "new") {
      result = result.filter(c => isNewCard(c));
    } else if (filter === "starred") {
      result = result.filter(c => c.isStarred);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.armenian.toLowerCase().includes(query) ||
        c.russian.toLowerCase().includes(query) ||
        c.sentence?.toLowerCase().includes(query) ||
        c.association?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [cards, filter, searchQuery]);

  const resetForm = () => {
    setFormData({ armenian: "", russian: "", sentence: "", association: "" });
  };

  const handleCreateCard = () => {
    if (!formData.armenian.trim() || !formData.russian.trim()) return;
    createMutation.mutate(formData);
  };

  const handleUpdateCard = () => {
    if (!editingCard || !formData.armenian.trim() || !formData.russian.trim()) return;
    updateMutation.mutate({
      id: editingCard.id,
      data: {
        armenian: formData.armenian.trim(),
        russian: formData.russian.trim(),
        sentence: formData.sentence.trim(),
        association: formData.association.trim(),
      },
    });
    resetForm();
    setEditingCard(null);
  };

  const handleDeleteCard = () => {
    if (!deletingCard) return;
    deleteMutation.mutate(deletingCard.id);
  };

  const handleToggleStar = (card: FlashCard) => {
    updateMutation.mutate({ id: card.id, data: { isStarred: !card.isStarred } });
  };

  const handleToggleActive = (card: FlashCard) => {
    updateMutation.mutate({ id: card.id, data: { isActive: !card.isActive } });
  };

  const openEditDialog = (card: FlashCard) => {
    setEditingCard(card);
    setFormData({
      armenian: card.armenian,
      russian: card.russian,
      sentence: card.sentence || "",
      association: card.association || "",
    });
  };

  const handleExport = () => {
    const csv = exportCardsToCSV(filteredCards);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${deck?.name || "cards"}_export.csv`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} data-testid="button-back-to-decks">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("cardList.back")}
          </Button>
          <div>
            <h2 className="text-xl font-semibold">{deck?.name || "Cards"}</h2>
            <p className="text-sm text-muted-foreground">{t("cardList.cardsTotal", { n: cards.length })}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setLocation(`/deck/${deckId}/review`)} data-testid="button-study-deck" aria-label={t("cardList.study")}>
            <Play className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">{t("cardList.study")}</span>
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-add-card">
                <Plus className="h-4 w-4 mr-2" />
                {t("cardList.addCard")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t("cardList.addNewCard")}</DialogTitle>
                <DialogDescription>
                  {t("cardList.addNewCardDesc")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="armenian">{t("cardList.wordLabel", { language: deck?.language || "Word" })}</Label>
                  <Input
                    id="armenian"
                    placeholder={t("cardList.wordPlaceholder")}
                    value={formData.armenian}
                    onChange={(e) => setFormData(prev => ({ ...prev, armenian: e.target.value }))}
                    className="font-sans text-xl"
                    data-testid="input-card-armenian"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="russian">{t("cardList.translationLabel")}</Label>
                  <Input
                    id="russian"
                    placeholder={t("cardList.translationPlaceholder")}
                    value={formData.russian}
                    onChange={(e) => setFormData(prev => ({ ...prev, russian: e.target.value }))}
                    data-testid="input-card-russian"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sentence">{t("cardList.sentenceLabel")}</Label>
                  <Textarea
                    id="sentence"
                    placeholder={t("cardList.sentencePlaceholder")}
                    value={formData.sentence}
                    onChange={(e) => setFormData(prev => ({ ...prev, sentence: e.target.value }))}
                    className="font-sans"
                    data-testid="input-card-sentence"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="association">{t("cardList.associationLabel")}</Label>
                  <Textarea
                    id="association"
                    placeholder={t("cardList.associationPlaceholder")}
                    value={formData.association}
                    onChange={(e) => setFormData(prev => ({ ...prev, association: e.target.value }))}
                    data-testid="input-card-association"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { resetForm(); setIsCreateOpen(false); }}>
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={handleCreateCard}
                  disabled={!formData.armenian.trim() || !formData.russian.trim() || createMutation.isPending}
                  data-testid="button-confirm-add-card"
                >
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {t("cardList.addCard")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" data-testid="button-deck-menu">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setLocation(`/deck/${deckId}/practice`)}
                data-testid="button-practice-from-menu"
              >
                <Eye className="h-4 w-4 mr-2" />
                {t("cardList.practiceCards")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={openRenameDialog} data-testid="button-rename-deck">
                <Pencil className="h-4 w-4 mr-2" />
                {t("cardList.renameDeck")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => duplicateMutation.mutate({ swap: false })}
                disabled={duplicateMutation.isPending}
                data-testid="button-duplicate-as-is"
              >
                <Copy className="h-4 w-4 mr-2" />
                {t("cardList.duplicateAsIs")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => duplicateMutation.mutate({ swap: true })}
                disabled={duplicateMutation.isPending}
                data-testid="button-duplicate-swapped"
              >
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                {t("cardList.duplicateAndFlip")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => { setTimeout(() => { setIsMoveOpen(true); setSelectedProjectId(null); setMoveError(""); }, 0); }}
                disabled={projects.length <= 1}
                data-testid="button-move-deck"
              >
                <FolderInput className="h-4 w-4 mr-2" />
                {t("cardList.moveToProject")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExport} data-testid="button-export-cards">
                <Download className="h-4 w-4 mr-2" />
                {t("cardList.exportCSV")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setTimeout(() => setIsDeletingDeck(true), 0)}
                className="text-destructive focus:text-destructive"
                data-testid="button-delete-deck"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t("cardList.deleteDeck")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("cardList.searchCards")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-cards"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as CardFilter["filter"])}>
          <SelectTrigger className="w-full md:w-[180px]" data-testid="select-card-filter">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder={t("cardList.filter")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("cardList.filterAll")}</SelectItem>
            <SelectItem value="due">{t("cardList.filterDue")}</SelectItem>
            <SelectItem value="new">{t("cardList.filterNew")}</SelectItem>
            <SelectItem value="starred">{t("cardList.filterStarred")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredCards.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {cards.length === 0
                ? t("cardList.noCards")
                : t("cardList.noCardsFilter")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">{t("cardList.active")}</TableHead>
                <TableHead className="w-12"></TableHead>
                <TableHead>{deck?.language || t("cardList.word")}</TableHead>
                <TableHead>{t("cardList.translation")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("cardList.status")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("cardList.interval")}</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCards.map((card) => {
                const status = getCardStatus(card);
                return (
                  <TableRow
                    key={card.id}
                    data-testid={`row-card-${card.id}`}
                    className={cn(!card.isActive && "opacity-50")}
                  >
                    <TableCell>
                      <Checkbox
                        checked={card.isActive}
                        onCheckedChange={() => handleToggleActive(card)}
                        aria-label={`Toggle ${card.armenian} active`}
                        data-testid={`checkbox-active-${card.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleStar(card)}
                        data-testid={`button-star-${card.id}`}
                      >
                        <Star className={cn(
                          "h-4 w-4",
                          card.isStarred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                        )} />
                      </Button>
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
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(card)}
                          data-testid={`button-edit-card-${card.id}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingCard(card)}
                          data-testid={`button-delete-card-${card.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!editingCard} onOpenChange={(open) => { if (!open) { resetForm(); setEditingCard(null); } }}>
        <DialogContent className="max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{t("cardList.editCard")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-armenian">{t("cardList.wordLabel", { language: deck?.language || "Word" })}</Label>
              <Input
                id="edit-armenian"
                value={formData.armenian}
                onChange={(e) => setFormData(prev => ({ ...prev, armenian: e.target.value }))}
                className="font-sans text-xl"
                data-testid="input-edit-card-armenian"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-russian">{t("cardList.translationLabel")}</Label>
              <Input
                id="edit-russian"
                value={formData.russian}
                onChange={(e) => setFormData(prev => ({ ...prev, russian: e.target.value }))}
                data-testid="input-edit-card-russian"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-sentence">{t("cardList.sentenceLabel")}</Label>
              <Textarea
                id="edit-sentence"
                value={formData.sentence}
                onChange={(e) => setFormData(prev => ({ ...prev, sentence: e.target.value }))}
                className="font-sans"
                data-testid="input-edit-card-sentence"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-association">{t("cardList.associationLabel")}</Label>
              <Textarea
                id="edit-association"
                value={formData.association}
                onChange={(e) => setFormData(prev => ({ ...prev, association: e.target.value }))}
                data-testid="input-edit-card-association"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setEditingCard(null); }}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleUpdateCard}
              disabled={!formData.armenian.trim() || !formData.russian.trim() || updateMutation.isPending}
              data-testid="button-confirm-edit-card"
            >
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("deckList.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingCard} onOpenChange={(open) => !open && setDeletingCard(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("cardList.deleteCard")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("cardList.deleteCardDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCard}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete-card"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isMoveOpen} onOpenChange={(open) => { if (!open) { setIsMoveOpen(false); setMoveError(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("cardList.moveTitle")}</DialogTitle>
            <DialogDescription>
              {t("cardList.moveDesc", { name: deck?.name ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {projects
              .filter(p => p.id !== activeProject?.id)
              .map(project => (
                <div
                  key={project.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-md cursor-pointer hover-elevate",
                    selectedProjectId === project.id
                      ? "bg-accent"
                      : ""
                  )}
                  onClick={() => { setSelectedProjectId(project.id); setMoveError(""); }}
                  data-testid={`move-project-${project.id}`}
                >
                  <FolderInput className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium">{project.name}</span>
                </div>
              ))}
            {moveError && (
              <p className="text-sm text-destructive" data-testid="text-move-error">{moveError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMoveOpen(false)} data-testid="button-cancel-move">
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => selectedProjectId && moveMutation.mutate(selectedProjectId)}
              disabled={!selectedProjectId || moveMutation.isPending}
              data-testid="button-confirm-move"
            >
              {moveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("cardList.moveButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRenameOpen} onOpenChange={(open) => { if (!open) { setIsRenameOpen(false); setRenameError(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("cardList.renameDeckTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rename-deck-name">{t("deckList.deckName")}</Label>
              <Input
                id="rename-deck-name"
                value={renameName}
                onChange={(e) => { setRenameName(e.target.value); setRenameError(""); }}
                data-testid="input-rename-deck-name"
              />
              {renameError && (
                <p className="text-sm text-destructive" data-testid="text-rename-error">{renameError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="rename-deck-language">{t("deckList.deckLanguage")}</Label>
              <Input
                id="rename-deck-language"
                value={renameLanguage}
                onChange={(e) => setRenameLanguage(e.target.value)}
                data-testid="input-rename-deck-language"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rename-deck-description">{t("deckList.deckDescription")}</Label>
              <Textarea
                id="rename-deck-description"
                value={renameDescription}
                onChange={(e) => setRenameDescription(e.target.value)}
                data-testid="input-rename-deck-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleRenameDeck}
              disabled={!renameName.trim() || !renameLanguage.trim() || renameMutation.isPending}
              data-testid="button-confirm-rename-deck"
            >
              {renameMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("deckList.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeletingDeck} onOpenChange={(open) => !open && setIsDeletingDeck(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deckList.deleteDeck")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deckList.deleteDeckDesc", { name: deck?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDeckMutation.mutate()}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete-deck"
            >
              {deleteDeckMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
