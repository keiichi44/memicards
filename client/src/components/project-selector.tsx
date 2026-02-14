import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { apiRequest, queryClient } from "@/lib/queryClient";

function truncateName(name: string, maxLength = 18): string {
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength) + "...";
}

export function ProjectSelector() {
  const { projects, activeProject, setActiveProjectId } = useProject();
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
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setActiveProjectId(project.id);
      setIsCreateOpen(false);
      setIsListOpen(false);
      setNewName("");
      setCreateError("");
    },
    onError: (error: Error) => {
      try {
        const text = error.message.replace(/^\d+:\s*/, "");
        const parsed = JSON.parse(text);
        setCreateError(parsed.error || "Failed to create project");
      } catch {
        setCreateError("Failed to create project");
      }
    },
  });

  const getNextName = () => {
    const base = "Learning project";
    const existingNumbers = projects
      .map(p => {
        const match = p.name.match(/^Learning project\s*(\d*)$/);
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
    setCreateError("");
    createMutation.mutate(newName.trim());
  };

  const handleSelectProject = (projectId: string) => {
    setActiveProjectId(projectId);
    setIsListOpen(false);
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
            <DialogTitle>Select Project</DialogTitle>
            <DialogDescription>
              Switch between your learning projects.
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
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) setCreateError(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Projects help you organize different learning goals separately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                value={newName}
                onChange={(e) => { setNewName(e.target.value); setCreateError(""); }}
                placeholder="e.g., Spanish Course"
                data-testid="input-project-name"
              />
              {createError && (
                <p className="text-sm text-destructive" data-testid="text-project-create-error">{createError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newName.trim() || createMutation.isPending}
              data-testid="button-confirm-create-project"
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
