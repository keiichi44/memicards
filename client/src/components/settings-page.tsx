import { useState } from "react";
import { Save, Download, Upload, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import type { Settings } from "@shared/schema";
import { 
  getSettings, 
  saveSettings, 
  exportAllData, 
  importFullData, 
  exportReviewsToCSV, 
  getReviews,
  getCards,
  getDecks,
} from "@/lib/storage";

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(() => getSettings());
  const [isSaved, setIsSaved] = useState(true);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const { toast } = useToast();
  
  const handleChange = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setIsSaved(false);
  };
  
  const handleSave = () => {
    saveSettings(settings);
    setIsSaved(true);
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated.",
    });
  };
  
  const handleExportData = () => {
    const data = exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `armenian-srs-backup-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    
    toast({
      title: "Data exported",
      description: "Your complete backup has been downloaded.",
    });
  };
  
  const handleExportReviews = () => {
    const reviews = getReviews();
    const csv = exportReviewsToCSV(reviews);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `review-history-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    
    toast({
      title: "Reviews exported",
      description: `${reviews.length} review records exported to CSV.`,
    });
  };
  
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        importFullData(data);
        setSettings(getSettings());
        toast({
          title: "Data imported",
          description: "Your backup has been restored successfully.",
        });
      } catch (error) {
        toast({
          title: "Import failed",
          description: "Invalid backup file format.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };
  
  const handleResetData = () => {
    localStorage.clear();
    window.location.reload();
  };
  
  const totalCards = getCards().length;
  const totalDecks = getDecks().length;
  const totalReviews = getReviews().length;
  
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Settings</h2>
        <p className="text-muted-foreground">Configure your learning preferences</p>
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
              checked={settings.weekendLearnerMode}
              onCheckedChange={(checked) => handleChange("weekendLearnerMode", checked)}
              data-testid="switch-weekend-mode"
            />
          </div>
          
          {settings.weekendLearnerMode && (
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
                      value={settings.weekdayNewCards}
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
                      value={settings.weekdayReviewCards}
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
                      value={settings.weekendNewCards}
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
                      value={settings.weekendReviewCards}
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
              checked={settings.prioritizeStarred}
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
              value={settings.weeklyCardTarget}
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
            Export, import, or reset your data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-md bg-muted/50">
            <p className="text-sm">
              <strong>Current data:</strong> {totalDecks} decks, {totalCards} cards, {totalReviews} reviews
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleExportData} data-testid="button-export-all">
              <Download className="h-4 w-4 mr-2" />
              Export All Data (JSON)
            </Button>
            <Button variant="outline" onClick={handleExportReviews} data-testid="button-export-reviews">
              <Download className="h-4 w-4 mr-2" />
              Export Reviews (CSV)
            </Button>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="import-file">Import backup</Label>
            <Input
              id="import-file"
              type="file"
              accept=".json"
              onChange={handleImportData}
              data-testid="input-import-file"
            />
          </div>
          
          <Separator />
          
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Danger Zone</AlertTitle>
            <AlertDescription>
              <p className="mb-2">Resetting will permanently delete all your cards, decks, and progress.</p>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => setShowResetConfirm(true)}
                data-testid="button-reset-data"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Reset All Data
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
      
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaved} data-testid="button-save-settings">
          <Save className="h-4 w-4 mr-2" />
          {isSaved ? "Settings Saved" : "Save Settings"}
        </Button>
      </div>
      
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all your data including {totalCards} cards, {totalDecks} decks, 
              and {totalReviews} review records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleResetData} 
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-reset"
            >
              Yes, delete everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
