import { useState } from "react";
import { Plus, Folder, Play, Trash2, Edit2 } from "lucide-react";
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
import type { Deck } from "@shared/schema";
import { getDecks, createDeck, updateDeck, deleteDeck, getCardsByDeck, getCards } from "@/lib/storage";
import { isDueToday, isNewCard } from "@/lib/sm2";
import { cn } from "@/lib/utils";

interface DeckListProps {
  onSelectDeck: (deckId: string) => void;
  onStartReview: (deckId?: string) => void;
}

export function DeckList({ onSelectDeck, onStartReview }: DeckListProps) {
  const [decks, setDecks] = useState<Deck[]>(() => getDecks());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [deletingDeck, setDeletingDeck] = useState<Deck | null>(null);
  const [newDeckName, setNewDeckName] = useState("");
  const [newDeckDescription, setNewDeckDescription] = useState("");
  
  const refreshDecks = () => setDecks(getDecks());
  
  const allCards = getCards();
  const totalDue = allCards.filter(isDueToday).length;
  const totalNew = allCards.filter(isNewCard).length;
  
  const handleCreateDeck = () => {
    if (!newDeckName.trim()) return;
    createDeck({ name: newDeckName.trim(), description: newDeckDescription.trim() });
    setNewDeckName("");
    setNewDeckDescription("");
    setIsCreateOpen(false);
    refreshDecks();
  };
  
  const handleUpdateDeck = () => {
    if (!editingDeck || !newDeckName.trim()) return;
    updateDeck(editingDeck.id, { name: newDeckName.trim(), description: newDeckDescription.trim() });
    setEditingDeck(null);
    setNewDeckName("");
    setNewDeckDescription("");
    refreshDecks();
  };
  
  const handleDeleteDeck = () => {
    if (!deletingDeck) return;
    deleteDeck(deletingDeck.id);
    setDeletingDeck(null);
    refreshDecks();
  };
  
  const openEditDialog = (deck: Deck) => {
    setEditingDeck(deck);
    setNewDeckName(deck.name);
    setNewDeckDescription(deck.description);
  };
  
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
            <Button 
              onClick={() => onStartReview()} 
              disabled={totalDue === 0 && totalNew === 0}
              data-testid="button-start-all-review"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Review
            </Button>
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
                <Label htmlFor="deck-name">Name</Label>
                <Input
                  id="deck-name"
                  placeholder="e.g., Week 2"
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  data-testid="input-deck-name"
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
              <Button onClick={handleCreateDeck} disabled={!newDeckName.trim()} data-testid="button-confirm-create-deck">
                Create Deck
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {decks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No decks yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first deck to start organizing your flashcards.
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Deck
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => {
            const cards = getCardsByDeck(deck.id);
            const dueCount = cards.filter(isDueToday).length;
            const newCount = cards.filter(isNewCard).length;
            const starredCount = cards.filter(c => c.isStarred).length;
            
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
                    <Badge variant="outline">{cards.length} cards</Badge>
                    {dueCount > 0 && <Badge variant="default">{dueCount} due</Badge>}
                    {newCount > 0 && <Badge variant="secondary">{newCount} new</Badge>}
                    {starredCount > 0 && <Badge variant="outline" className="text-yellow-600">{starredCount} starred</Badge>}
                  </div>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    disabled={dueCount === 0 && newCount === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartReview(deck.id);
                    }}
                    data-testid={`button-review-deck-${deck.id}`}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Study
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      
      <Dialog open={!!editingDeck} onOpenChange={(open) => !open && setEditingDeck(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Deck</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-deck-name">Name</Label>
              <Input
                id="edit-deck-name"
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
                data-testid="input-edit-deck-name"
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
            <Button onClick={handleUpdateDeck} disabled={!newDeckName.trim()} data-testid="button-confirm-edit-deck">
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
            <AlertDialogAction onClick={handleDeleteDeck} className="bg-destructive text-destructive-foreground" data-testid="button-confirm-delete-deck">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
