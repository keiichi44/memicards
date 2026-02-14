import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Save, Download, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
import { useToast } from "@/hooks/use-toast";
import type { Settings, Card as FlashCard, Deck, Review } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { exportCardsToCSV, exportReviewsToCSV } from "@/lib/storage";
import { useProject } from "@/lib/project-context";
import { useLocation } from "wouter";

export function SettingsPage() {
  const { toast } = useToast();
  const { activeProject, projects } = useProject();
  const [, setLocation] = useLocation();
  const [isSaved, setIsSaved] = useState(true);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  
  const { data: settings, isLoading: settingsLoading } = useQuery<Settings>({
    queryKey: ["/api/settings", { projectId: activeProject?.id }],
    queryFn: async () => {
      const url = activeProject?.id ? `/api/settings?projectId=${activeProject.id}` : "/api/settings";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch settings");
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
  
  const { data: allDecks = [] } = useQuery<Deck[]>({
    queryKey: ["/api/decks", { projectId: activeProject?.id }],
    queryFn: async () => {
      const url = activeProject?.id ? `/api/decks?projectId=${activeProject.id}` : "/api/decks";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch decks");
      return res.json();
    },
    enabled: !!activeProject,
  });
  
  const { data: allReviews = [] } = useQuery<Review[]>({
    queryKey: ["/api/reviews", { projectId: activeProject?.id }],
    queryFn: async () => {
      const url = activeProject?.id ? `/api/reviews?projectId=${activeProject.id}` : "/api/reviews";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch reviews");
      return res.json();
    },
    enabled: !!activeProject,
  });
  
  const [localSettings, setLocalSettings] = useState<Partial<Settings>>({});
  
  const updateMutation = useMutation({
    mutationFn: async (newSettings: Partial<Settings>) => {
      const url = activeProject?.id ? `/api/settings?projectId=${activeProject.id}` : "/api/settings";
      const res = await apiRequest("PATCH", url, newSettings);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      setIsSaved(true);
      setLocalSettings({});
      toast({
        title: "Settings saved",
        description: "Your preferences have been updated.",
      });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      await apiRequest("DELETE", `/api/projects/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/decks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
      setIsDeletingProject(false);
      setLocation("/");
      toast({
        title: "Project deleted",
        description: "The project and all its data have been removed.",
      });
    },
  });
  
  if (settingsLoading || !settings) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  const currentSettings = { ...settings, ...localSettings };
  
  const handleChange = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setIsSaved(false);
  };
  
  const handleSave = () => {
    updateMutation.mutate(localSettings);
  };
  
  const handleExportData = async () => {
    const url = activeProject?.id ? `/api/export?projectId=${activeProject.id}` : "/api/export";
    const res = await fetch(url);
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `memicards-backup-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    
    toast({
      title: "Data exported",
      description: "Your complete backup has been downloaded.",
    });
  };
  
  const handleExportCards = () => {
    const csv = exportCardsToCSV(allCards);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `cards-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    
    toast({
      title: "Cards exported",
      description: `${allCards.length} cards exported to CSV.`,
    });
  };
  
  const handleExportReviews = () => {
    const csv = exportReviewsToCSV(allReviews, allCards);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `review-history-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    
    toast({
      title: "Reviews exported",
      description: `${allReviews.length} review records exported to CSV.`,
    });
  };

  const canDeleteProject = projects.length > 1;
  
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-2xl font-semibold mb-2" data-testid="text-settings-title">Project Settings</h2>
        <p className="text-muted-foreground">Configure preferences for "{activeProject?.name}"</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Weekend Learner Mode</CardTitle>
          <CardDescription>
            Adjust your daily card limits based on the day of the week
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="weekend-mode">Enable weekend learner mode</Label>
              <p className="text-sm text-muted-foreground">
                Higher review load on weekends, lighter on weekdays
              </p>
            </div>
            <Switch
              id="weekend-mode"
              checked={currentSettings.weekendLearnerMode}
              onCheckedChange={(checked) => handleChange("weekendLearnerMode", checked)}
              data-testid="switch-weekend-mode"
            />
          </div>
          
          {currentSettings.weekendLearnerMode && (
            <>
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="font-medium">Weekdays (Mon-Fri)</h4>
                  <div className="space-y-2">
                    <Label htmlFor="weekday-new">New cards per day</Label>
                    <Input
                      id="weekday-new"
                      type="number"
                      min={0}
                      max={50}
                      value={currentSettings.weekdayNewCards}
                      onChange={(e) => handleChange("weekdayNewCards", parseInt(e.target.value) || 0)}
                      data-testid="input-weekday-new"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weekday-review">Review cards per day</Label>
                    <Input
                      id="weekday-review"
                      type="number"
                      min={0}
                      max={200}
                      value={currentSettings.weekdayReviewCards}
                      onChange={(e) => handleChange("weekdayReviewCards", parseInt(e.target.value) || 0)}
                      data-testid="input-weekday-review"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium">Weekends (Sat-Sun)</h4>
                  <div className="space-y-2">
                    <Label htmlFor="weekend-new">New cards per day</Label>
                    <Input
                      id="weekend-new"
                      type="number"
                      min={0}
                      max={100}
                      value={currentSettings.weekendNewCards}
                      onChange={(e) => handleChange("weekendNewCards", parseInt(e.target.value) || 0)}
                      data-testid="input-weekend-new"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weekend-review">Review cards per day</Label>
                    <Input
                      id="weekend-review"
                      type="number"
                      min={0}
                      max={300}
                      value={currentSettings.weekendReviewCards}
                      onChange={(e) => handleChange("weekendReviewCards", parseInt(e.target.value) || 0)}
                      data-testid="input-weekend-review"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Review Preferences</CardTitle>
          <CardDescription>
            Customize how your review sessions work
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="prioritize-starred">Prioritize starred cards</Label>
              <p className="text-sm text-muted-foreground">
                Show difficult (starred) cards first in review sessions
              </p>
            </div>
            <Switch
              id="prioritize-starred"
              checked={currentSettings.prioritizeStarred}
              onCheckedChange={(checked) => handleChange("prioritizeStarred", checked)}
              data-testid="switch-prioritize-starred"
            />
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <Label htmlFor="weekly-target">Weekly card target</Label>
            <Input
              id="weekly-target"
              type="number"
              min={10}
              max={200}
              value={currentSettings.weeklyCardTarget}
              onChange={(e) => handleChange("weeklyCardTarget", parseInt(e.target.value) || 50)}
              data-testid="input-weekly-target"
            />
            <p className="text-sm text-muted-foreground">
              Goal for new cards to learn each week
            </p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>
            Export your data for backup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-md bg-muted/50">
            <p className="text-sm">
              <strong>Current data:</strong> {allDecks.length} decks, {allCards.length} cards, {allReviews.length} reviews
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleExportData} data-testid="button-export-all">
              <Download className="h-4 w-4 mr-2" />
              Export All Data (JSON)
            </Button>
            <Button variant="outline" onClick={handleExportCards} data-testid="button-export-cards">
              <Download className="h-4 w-4 mr-2" />
              Export Cards (CSV)
            </Button>
            <Button variant="outline" onClick={handleExportReviews} data-testid="button-export-reviews">
              <Download className="h-4 w-4 mr-2" />
              Export Reviews (CSV)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className={canDeleteProject ? "border-destructive/30" : ""}>
        <CardHeader>
          <CardTitle>Delete Project</CardTitle>
          <CardDescription>
            {canDeleteProject
              ? `Permanently delete "${activeProject?.name}" and all its decks, cards, and review history.`
              : "You cannot delete your only project. Create another project first."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            disabled={!canDeleteProject || deleteProjectMutation.isPending}
            onClick={() => setIsDeletingProject(true)}
            data-testid="button-delete-project"
          >
            {deleteProjectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Delete Project
          </Button>
        </CardContent>
      </Card>
      
      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={isSaved || updateMutation.isPending}
          data-testid="button-save-settings"
        >
          {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          {isSaved ? "Settings Saved" : "Save Settings"}
        </Button>
      </div>

      <AlertDialog open={isDeletingProject} onOpenChange={setIsDeletingProject}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{activeProject?.name}" and all its decks, cards, and review history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => activeProject && deleteProjectMutation.mutate(activeProject.id)} 
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete-project"
            >
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
