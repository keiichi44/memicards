import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppSidebar } from "@/components/app-sidebar";
import { BottomNavBar } from "@/components/bottom-nav-bar";
import { ProjectProvider } from "@/lib/project-context";
import { ProjectSelector } from "@/components/project-selector";
import { ClerkProvider, SignedIn, SignedOut, UserButton, useUser } from "@clerk/clerk-react";
import logoImg from "@assets/memi_1770479923554.png";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import DeckPage from "@/pages/deck";
import ReviewPage from "@/pages/review";
import PracticePage from "@/pages/practice";
import Import from "@/pages/import";
import Progress from "@/pages/progress";
import Settings from "@/pages/settings";
import AuthPage from "@/pages/auth";
import { useEffect, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function DataMigration() {
  const { user } = useUser();
  const claimed = useRef(false);

  useEffect(() => {
    if (user && !claimed.current) {
      claimed.current = true;
      apiRequest("POST", "/api/auth/claim-data", {})
        .then(res => res.json())
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
          queryClient.invalidateQueries({ queryKey: ["/api/decks"] });
        })
        .catch(() => {});
    }
  }, [user]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/deck/:id" component={DeckPage} />
      <Route path="/deck/:id/review" component={ReviewPage} />
      <Route path="/deck/:id/practice" component={PracticePage} />
      <Route path="/review" component={ReviewPage} />
      <Route path="/practice" component={PracticePage} />
      <Route path="/import" component={Import} />
      <Route path="/progress" component={Progress} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <>
      <DataMigration />
      <ProjectProvider>
        <SidebarProvider style={sidebarStyle as React.CSSProperties}>
          <div className="flex min-h-screen w-full">
            <div className="hidden md:block">
              <AppSidebar />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <header className="flex items-center justify-between gap-2 p-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
                <div className="hidden md:flex items-center gap-2">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <ProjectSelector />
                </div>
                <div className="md:hidden flex items-center gap-1">
                  <img src={logoImg} alt="memicards" className="w-7 h-7 rounded-md object-cover" data-testid="img-logo-mobile" />
                  <ProjectSelector />
                </div>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <UserButton
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        avatarBox: "h-8 w-8",
                      },
                    }}
                  />
                </div>
              </header>
              <main className="flex-1 overflow-auto pb-16 md:pb-0">
                <Router />
              </main>
            </div>
          </div>
          <BottomNavBar />
        </SidebarProvider>
      </ProjectProvider>
    </>
  );
}

function App() {
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            <SignedIn>
              <AuthenticatedApp />
            </SignedIn>
            <SignedOut>
              <AuthPage />
            </SignedOut>
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default App;
