import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, ChevronDown, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProject } from "@/lib/project-context";
import { useReviewGuard } from "@/lib/review-guard-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";

function truncateName(name: string, maxLength = 18): string {
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength) + "...";
}

export function ProjectSelector() {
  const { t } = useTranslation();
  const { projects, activeProject, setActiveProjectId } = useProject();
  const { requestNavigation } = useReviewGuard();
  const [location, navigate] = useLocation();
  const [isListOpen, setIsListOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState("");

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/projects", { name });
      return res.json();
    },
    onSuccess: (project) => {
      queryClient.setQueryData(["/api/projects"], (old: any[] | undefined) => {
        return old ? [project, ...old] : [project];
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setActiveProjectId(project.id);
      setIsCreateOpen(false);
      setIsListOpen(false);
      setNewName("");
      setCreateError("");
      navigate("/");
    },
    onError: (error: Error) => {
      try {
        const text = error.message.replace(/^\d+:\s*/, "");
        const parsed = JSON.parse(text);
        setCreateError(parsed.error || t("projectSelector.createProject"));
      } catch {
        setCreateError(t("projectSelector.createProject"));
      }
    },
  });

  const getNextName = () => {
    const base = t("projectSelector.defaultProjectBase");
    const existingNumbers = projects
      .map(p => {
        const match = p.name.match(/^Learning project\s*(\d*)$/) || p.name.match(new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*(\\d*)$`));
        if (match) return match[1] ? parseInt(match[1]) : 0;
        return -1;
      })
      .filter(n => n >= 0);
    const next = existingNumbers.length === 0 ? 1 : Math.max(...existingNumbers) + 1;
    return `${base} ${next}`;
  };

  const handleOpenCreate = () => {
    setNewName(getNextName());
    setCreateError("");
    setIsListOpen(false);
    setIsCreateOpen(true);
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    const doCreate = () => {
      setCreateError("");
      createMutation.mutate(newName.trim());
    };
    requestNavigation(doCreate);
  };

  const handleSelectProject = (projectId: string) => {
    if (projectId === activeProject?.id) {
      setIsListOpen(false);
      return;
    }
    const isOnSubPage = location.startsWith("/deck/") || location.startsWith("/review") || location.startsWith("/practice");
    const doSwitch = () => {
      setActiveProjectId(projectId);
      setIsListOpen(false);
      if (isOnSubPage) {
        navigate("/");
      }
    };
    requestNavigation(doSwitch);
  };

  if (!activeProject) return null;

  return (
    <>
      <Button
        variant="ghost"
        className="font-semibold text-base gap-1 px-2"
        onClick={() => setIsListOpen(true)}
        data-testid="button-project-selector"
      >
        <span>{truncateName(activeProject.name)}</span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
      </Button>

      <Dialog open={isListOpen} onOpenChange={setIsListOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("projectSelector.selectProject")}</DialogTitle>
            <DialogDescription>
              {t("projectSelector.selectProjectDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 py-2">
            {projects.map((project) => (
              <Button
                key={project.id}
                variant="ghost"
                className="w-full justify-start gap-2"
                onClick={() => handleSelectProject(project.id)}
                data-testid={`menu-project-${project.id}`}
              >
                {project.id === activeProject.id && (
                  <Check className="h-4 w-4 shrink-0" />
                )}
                {project.id !== activeProject.id && (
                  <span className="w-4 shrink-0" />
                )}
                <span className="truncate">{project.name}</span>
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleOpenCreate}
              data-testid="button-add-project"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("projectSelector.createProject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) setCreateError(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("projectSelector.createNewProject")}</DialogTitle>
            <DialogDescription>
              {t("projectSelector.createNewProjectDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">{t("projectSelector.projectNameLabel")}</Label>
              <Input
                id="project-name"
                value={newName}
                onChange={(e) => { setNewName(e.target.value); setCreateError(""); }}
                placeholder={t("projectSelector.projectNamePlaceholder")}
                data-testid="input-project-name"
              />
              {createError && (
                <p className="text-sm text-destructive" data-testid="text-project-create-error">{createError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newName.trim() || createMutation.isPending}
              data-testid="button-confirm-create-project"
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("projectSelector.createProject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
