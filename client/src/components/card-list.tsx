import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Plus, Star, Search, Filter, Edit2, Trash2, Download, Loader2, Copy, ChevronDown, ArrowRightLeft } from "lucide-react";
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

interface CardListProps {
  deckId: string;
  onBack: () => void;
}

export function CardList({ deckId, onBack }: CardListProps) {
  const [filter, setFilter] = useState<CardFilter["filter"]>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<FlashCard | null>(null);
  const [deletingCard, setDeletingCard] = useState<FlashCard | null>(null);
  
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
            Back
          </Button>
          <div>
            <h2 className="text-xl font-semibold">{deck?.name || "Cards"}</h2>
            <p className="text-sm text-muted-foreground">{cards.length} cards total</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} data-testid="button-export-cards">
            <Download className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Export CSV</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={duplicateMutation.isPending} data-testid="button-duplicate-deck">
                {duplicateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 md:mr-2 animate-spin" />
                ) : (
                  <Copy className="h-4 w-4 md:mr-2" />
                )}
                <span className="hidden md:inline">Duplicate...</span>
                <ChevronDown className="h-4 w-4 md:ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() => duplicateMutation.mutate({ swap: false })}
                data-testid="button-duplicate-as-is"
              >
                <Copy className="h-4 w-4 mr-2" />
                Duplicate as is
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => duplicateMutation.mutate({ swap: true })}
                data-testid="button-duplicate-swapped"
              >
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Duplicate swapping original and translation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-card">
                <Plus className="h-4 w-4 mr-2" />
                Add Card
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Card</DialogTitle>
                <DialogDescription>
                  Create a new flashcard for this deck.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="armenian">{deck?.language || "Word"} *</Label>
                  <Input
                    id="armenian"
                    placeholder="e.g., գիdelays"
                    value={formData.armenian}
                    onChange={(e) => setFormData(prev => ({ ...prev, armenian: e.target.value }))}
                    className="font-sans text-xl"
                    data-testid="input-card-armenian"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="russian">Translation *</Label>
                  <Input
                    id="russian"
                    placeholder="e.g., книга"
                    value={formData.russian}
                    onChange={(e) => setFormData(prev => ({ ...prev, russian: e.target.value }))}
                    data-testid="input-card-russian"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sentence">Example Sentence (optional)</Label>
                  <Textarea
                    id="sentence"
                    placeholder="Example sentence using this word"
                    value={formData.sentence}
                    onChange={(e) => setFormData(prev => ({ ...prev, sentence: e.target.value }))}
                    className="font-sans"
                    data-testid="input-card-sentence"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="association">Association/Mnemonic (optional)</Label>
                  <Textarea
                    id="association"
                    placeholder="Memory aid"
                    value={formData.association}
                    onChange={(e) => setFormData(prev => ({ ...prev, association: e.target.value }))}
                    data-testid="input-card-association"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { resetForm(); setIsCreateOpen(false); }}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateCard} 
                  disabled={!formData.armenian.trim() || !formData.russian.trim() || createMutation.isPending}
                  data-testid="button-confirm-add-card"
                >
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Add Card
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-cards"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as CardFilter["filter"])}>
          <SelectTrigger className="w-full md:w-[180px]" data-testid="select-card-filter">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cards</SelectItem>
            <SelectItem value="due">Due Today</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="starred">Starred</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {filteredCards.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {cards.length === 0 
                ? "No cards in this deck yet. Add your first card!"
                : "No cards match your filter."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Active</TableHead>
                <TableHead className="w-12"></TableHead>
                <TableHead>{deck?.language || "Word"}</TableHead>
                <TableHead>Translation</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
                <TableHead className="hidden lg:table-cell">Interval</TableHead>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Card</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-armenian">{deck?.language || "Word"} *</Label>
              <Input
                id="edit-armenian"
                value={formData.armenian}
                onChange={(e) => setFormData(prev => ({ ...prev, armenian: e.target.value }))}
                className="font-sans text-xl"
                data-testid="input-edit-card-armenian"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-russian">Translation *</Label>
              <Input
                id="edit-russian"
                value={formData.russian}
                onChange={(e) => setFormData(prev => ({ ...prev, russian: e.target.value }))}
                data-testid="input-edit-card-russian"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-sentence">Example Sentence</Label>
              <Textarea
                id="edit-sentence"
                value={formData.sentence}
                onChange={(e) => setFormData(prev => ({ ...prev, sentence: e.target.value }))}
                className="font-sans"
                data-testid="input-edit-card-sentence"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-association">Association/Mnemonic</Label>
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
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateCard}
              disabled={!formData.armenian.trim() || !formData.russian.trim() || updateMutation.isPending}
              data-testid="button-confirm-edit-card"
            >
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deletingCard} onOpenChange={(open) => !open && setDeletingCard(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Card?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this card and its review history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteCard} 
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete-card"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
