import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Lightbulb, Play, Trash2, Edit2, RotateCcw, Loader2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import type { Deck, Card as FlashCard } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isDueToday, isNewCard } from "@/lib/sm2";

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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [deletingDeck, setDeletingDeck] = useState<Deck | null>(null);
  const [newDeckName, setNewDeckName] = useState("");
  const [newDeckLanguage, setNewDeckLanguage] = useState("");
  const [newDeckDescription, setNewDeckDescription] = useState("");
  
  const { data: decks = [], isLoading: decksLoading } = useQuery<DeckWithCount[]>({
    queryKey: ["/api/decks"],
  });
  
  const { data: allCards = [] } = useQuery<FlashCard[]>({
    queryKey: ["/api/cards"],
  });
  
  const activeCards = allCards.filter(c => c.isActive);
  const totalDue = activeCards.filter(c => isDueToday(c)).length;
  const totalNew = activeCards.filter(c => isNewCard(c)).length;
  
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; language: string; description: string }) => {
      const res = await apiRequest("POST", "/api/decks", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/decks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cards"], refetchType: "all" });
      setIsCreateOpen(false);
      setNewDeckName("");
      setNewDeckLanguage("");
      setNewDeckDescription("");
    },
  });
  
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; language: string; description: string } }) => {
      const res = await apiRequest("PATCH", `/api/decks/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/decks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cards"], refetchType: "all" });
      setEditingDeck(null);
      setNewDeckName("");
      setNewDeckLanguage("");
      setNewDeckDescription("");
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/decks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/decks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cards"], refetchType: "all" });
      setDeletingDeck(null);
    },
  });
  
  const handleCreateDeck = () => {
    if (!newDeckName.trim() || !newDeckLanguage.trim()) return;
    createMutation.mutate({ name: newDeckName.trim(), language: newDeckLanguage.trim(), description: newDeckDescription.trim() });
  };
  
  const handleUpdateDeck = () => {
    if (!editingDeck || !newDeckName.trim() || !newDeckLanguage.trim()) return;
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
              <h3 className="font-semibold text-lg">All Cards Review</h3>
              <p className="text-sm text-muted-foreground">
                {totalDue} due today, {totalNew} new cards
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => onStartReview()} 
                disabled={totalDue === 0 && totalNew === 0}
                data-testid="button-start-all-review"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Review
              </Button>
              <Button 
                variant="outline"
                onClick={() => onStartPractice()} 
                disabled={allCards.length === 0}
                data-testid="button-start-all-practice"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Practice
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Your Decks</h2>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-deck">
              <Plus className="h-4 w-4 mr-2" />
              New Deck
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Deck</DialogTitle>
              <DialogDescription>
                Create a new deck to organize your flashcards.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="deck-name">Name *</Label>
                <Input
                  id="deck-name"
                  placeholder="e.g., Week 2"
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  data-testid="input-deck-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deck-language">Language *</Label>
                <Input
                  id="deck-language"
                  placeholder="e.g., Spanish, Japanese, Armenian"
                  value={newDeckLanguage}
                  onChange={(e) => setNewDeckLanguage(e.target.value)}
                  data-testid="input-deck-language"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deck-description">Description (optional)</Label>
                <Textarea
                  id="deck-description"
                  placeholder="What's in this deck?"
                  value={newDeckDescription}
                  onChange={(e) => setNewDeckDescription(e.target.value)}
                  data-testid="input-deck-description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateDeck} 
                disabled={!newDeckName.trim() || !newDeckLanguage.trim() || createMutation.isPending}
                data-testid="button-confirm-create-deck"
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Deck
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                    <Badge variant="outline">{deck.cardCount} cards</Badge>
                    {deck.dueCount > 0 && <Badge variant="default">{deck.dueCount} due</Badge>}
                    {newCount > 0 && <Badge variant="secondary">{newCount} new</Badge>}
                    {deck.starredCount > 0 && <Badge variant="outline" className="text-yellow-600">{deck.starredCount} starred</Badge>}
                    {deck.inactiveCount > 0 && <Badge variant="outline" className="text-muted-foreground">{deck.inactiveCount} off</Badge>}
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
                      Study
                    </Button>
                    <Button 
                      variant="ghost"
                      size="icon"
                      disabled={deck.cardCount === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartPractice(deck.id);
                      }}
                      title="Practice mode"
                      data-testid={`button-practice-deck-${deck.id}`}
                    >
                      <RotateCcw className="h-4 w-4" />
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
              <h3 className="font-semibold mb-3" data-testid="text-tips-heading">Create effective decks</h3>
              <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside" data-testid="list-tips">
                <li data-testid="text-tip-1">Creating a deck with 20-30 cards is ideal for learning.</li>
                <li data-testid="text-tip-2">If you have more than 30, divide them into decks based on complexity.</li>
                <li data-testid="text-tip-3">Begin learning 20 cards a week to get accustomed to the process.</li>
                <li data-testid="text-tip-4">Think about using Weekend mode for intensive learning.</li>
                <li data-testid="text-tip-5">Import your cards via CSV mapping or enter them manually.</li>
              </ul>
              {decks.length === 0 && (
                <Button className="mt-4" onClick={() => setIsCreateOpen(true)} data-testid="button-create-first-deck">
                  <Plus className="h-4 w-4 mr-2" />
                  Create a deck
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      <Dialog open={!!editingDeck} onOpenChange={(open) => !open && setEditingDeck(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Deck</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-deck-name">Name *</Label>
              <Input
                id="edit-deck-name"
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
                data-testid="input-edit-deck-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-deck-language">Language *</Label>
              <Input
                id="edit-deck-language"
                value={newDeckLanguage}
                onChange={(e) => setNewDeckLanguage(e.target.value)}
                data-testid="input-edit-deck-language"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-deck-description">Description</Label>
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
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateDeck} 
              disabled={!newDeckName.trim() || !newDeckLanguage.trim() || updateMutation.isPending}
              data-testid="button-confirm-edit-deck"
            >
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deletingDeck} onOpenChange={(open) => !open && setDeletingDeck(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deck?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deletingDeck?.name}" and all its cards. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteDeck} 
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete-deck"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
