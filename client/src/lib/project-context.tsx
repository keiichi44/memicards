import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Project } from "@shared/schema";

interface ProjectContextType {
  projects: Project[];
  activeProject: Project | null;
  setActiveProjectId: (id: string) => void;
  isLoading: boolean;
}

const ProjectContext = createContext<ProjectContextType>({
  projects: [],
  activeProject: null,
  setActiveProjectId: () => {},
  isLoading: true,
});

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    return localStorage.getItem("activeProjectId");
  });

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  useEffect(() => {
    if (projects.length > 0 && !activeProjectId) {
      const lastProject = projects[projects.length - 1];
      setActiveProjectId(lastProject.id);
      localStorage.setItem("activeProjectId", lastProject.id);
    }
    if (activeProjectId && projects.length > 0 && !projects.find(p => p.id === activeProjectId)) {
      const lastProject = projects[projects.length - 1];
      setActiveProjectId(lastProject.id);
      localStorage.setItem("activeProjectId", lastProject.id);
    }
  }, [projects, activeProjectId]);

  const handleSetActiveProjectId = (id: string) => {
    setActiveProjectId(id);
    localStorage.setItem("activeProjectId", id);
  };

  const activeProject = projects.find(p => p.id === activeProjectId) || (projects.length > 0 ? projects[projects.length - 1] : null);

  return (
    <ProjectContext.Provider value={{ projects, activeProject, setActiveProjectId: handleSetActiveProjectId, isLoading }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  return useContext(ProjectContext);
}
