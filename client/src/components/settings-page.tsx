import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Save, Download, Loader2, Trash2, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
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
import { useReviewGuard } from "@/lib/review-guard-context";

export function SettingsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { activeProject, projects } = useProject();
  const [, setLocation] = useLocation();
  const { setHasUnsavedChanges } = useReviewGuard();
  const [isSaved, setIsSaved] = useState(true);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [projectName, setProjectName] = useState(activeProject?.name ?? "");
  const [isRenamingProject, setIsRenamingProject] = useState(false);

  useEffect(() => {
    setProjectName(activeProject?.name ?? "");
    setIsRenamingProject(false);
  }, [activeProject?.name]);

  useEffect(() => {
    return () => {
      setHasUnsavedChanges(false);
    };
  }, [setHasUnsavedChanges]);

  const renameProjectMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!activeProject?.id) throw new Error("No active project");
      const res = await apiRequest("PATCH", `/api/projects/${activeProject.id}`, { name });
      return res.json();
    },
    onSuccess: (_data, name) => {
      setProjectName(name);
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsRenamingProject(false);
      toast({
        title: t("settings.projectRenamedTitle"),
        description: t("settings.projectRenamedDesc"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("settings.renameFailedTitle"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
      setHasUnsavedChanges(false);
      toast({
        title: t("settings.settingsSavedTitle"),
        description: t("settings.settingsSavedDesc"),
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
        title: t("settings.projectDeletedTitle"),
        description: t("settings.projectDeletedDesc"),
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
    setHasUnsavedChanges(true);
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
      title: t("settings.dataExportedTitle"),
      description: t("settings.dataExportedDesc"),
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
      title: t("settings.cardsExportedTitle"),
      description: t("settings.cardsExportedDesc", { n: allCards.length }),
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
      title: t("settings.reviewsExportedTitle"),
      description: t("settings.reviewsExportedDesc", { n: allReviews.length }),
    });
  };

  const canDeleteProject = projects.length > 1;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-2xl font-semibold mb-2" data-testid="text-settings-title">{t("settings.title")}</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.projectNameTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isRenamingProject ? (
            <div className="flex items-center flex-wrap gap-2">
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder={t("projectSelector.projectNamePlaceholder")}
                className="flex-1 min-w-[200px]"
                data-testid="input-project-name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && projectName.trim() && projectName !== activeProject?.name) {
                    renameProjectMutation.mutate(projectName.trim());
                  }
                  if (e.key === "Escape") {
                    setProjectName(activeProject?.name ?? "");
                    setIsRenamingProject(false);
                  }
                }}
              />
              <Button
                onClick={() => renameProjectMutation.mutate(projectName.trim())}
                disabled={!projectName.trim() || projectName === activeProject?.name || renameProjectMutation.isPending}
                data-testid="button-save-project-name"
              >
                {renameProjectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {t("settings.save")}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setProjectName(activeProject?.name ?? "");
                  setIsRenamingProject(false);
                }}
                data-testid="button-cancel-rename"
              >
                {t("settings.cancel")}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm font-medium" data-testid="text-project-name">{activeProject?.name}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setProjectName(activeProject?.name ?? "");
                  setIsRenamingProject(true);
                }}
                data-testid="button-rename-project"
              >
                <Pencil className="h-4 w-4 mr-2" />
                {t("settings.rename")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.weekendModeTitle")}</CardTitle>
          <CardDescription>
            {t("settings.weekendModeDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="weekend-mode">{t("settings.enableWeekendMode")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("settings.enableWeekendModeDesc")}
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
                  <h4 className="font-medium">{t("settings.weekdays")}</h4>
                  <div className="space-y-2">
                    <Label htmlFor="weekday-new">{t("settings.newCardsPerDay")}</Label>
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
                    <Label htmlFor="weekday-review">{t("settings.reviewCardsPerDay")}</Label>
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
                  <h4 className="font-medium">{t("settings.weekends")}</h4>
                  <div className="space-y-2">
                    <Label htmlFor="weekend-new">{t("settings.newCardsPerDay")}</Label>
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
                    <Label htmlFor="weekend-review">{t("settings.reviewCardsPerDay")}</Label>
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
          <CardTitle>{t("settings.reviewPrefsTitle")}</CardTitle>
          <CardDescription>
            {t("settings.reviewPrefsDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="prioritize-starred">{t("settings.prioritizeStarred")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("settings.prioritizeStarredDesc")}
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
            <Label htmlFor="weekly-target">{t("settings.weeklyTarget")}</Label>
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
              {t("settings.weeklyTargetDesc")}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.dataManagementTitle")}</CardTitle>
          <CardDescription>
            {t("settings.dataManagementDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-md bg-muted/50">
            <p className="text-sm">
              {t("settings.currentData", { decks: allDecks.length, cards: allCards.length, reviews: allReviews.length })}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleExportData} data-testid="button-export-all">
              <Download className="h-4 w-4 mr-2" />
              {t("settings.exportAll")}
            </Button>
            <Button variant="outline" onClick={handleExportCards} data-testid="button-export-cards">
              <Download className="h-4 w-4 mr-2" />
              {t("settings.exportCards")}
            </Button>
            <Button variant="outline" onClick={handleExportReviews} data-testid="button-export-reviews">
              <Download className="h-4 w-4 mr-2" />
              {t("settings.exportReviews")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className={canDeleteProject ? "border-destructive/30" : ""}>
        <CardHeader>
          <CardTitle>{t("settings.deleteProjectTitle")}</CardTitle>
          <CardDescription>
            {canDeleteProject
              ? t("settings.deleteProjectDesc", { name: activeProject?.name ?? "" })
              : t("settings.deleteProjectOnlyOne")}
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
            {t("settings.deleteProject")}
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
          {isSaved ? t("settings.settingsSaved") : t("settings.saveSettings")}
        </Button>
      </div>

      <AlertDialog open={isDeletingProject} onOpenChange={setIsDeletingProject}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings.deleteProjectConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings.deleteProjectConfirmDesc", { name: activeProject?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => activeProject && deleteProjectMutation.mutate(activeProject.id)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete-project"
            >
              {t("settings.deleteProject")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
