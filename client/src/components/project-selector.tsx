import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Plus, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

export function ProjectSelector() {
  const { projects, activeProject, setActiveProjectId } = useProject();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/projects", { name });
      return res.json();
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setActiveProjectId(project.id);
      setIsCreateOpen(false);
      setNewName("");
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
    setIsCreateOpen(true);
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    createMutation.mutate(newName.trim());
  };

  if (!activeProject) return null;

  return (
    <>
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="font-semibold text-base gap-1 px-2" data-testid="button-project-selector">
              <span className="truncate max-w-[180px]">{activeProject.name}</span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => setActiveProjectId(project.id)}
                data-testid={`menu-project-${project.id}`}
                className={project.id === activeProject.id ? "bg-accent" : ""}
              >
                <span className="truncate">{project.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="icon" onClick={handleOpenCreate} data-testid="button-add-project">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
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
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Spanish Course"
                data-testid="input-project-name"
              />
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
