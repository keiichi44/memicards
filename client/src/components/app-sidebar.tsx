import { useLocation, Link } from "wouter";
import { Upload, BarChart3, Settings, Layers, Mail } from "lucide-react";
import logoImg from "@assets/memi_1770479923554.png";
import { useTranslation } from "react-i18next";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { ProjectSelector } from "@/components/project-selector";
import { useProject } from "@/lib/project-context";
import { useReviewGuard } from "@/lib/review-guard-context";

export function AppSidebar() {
  const { t } = useTranslation();
  const [location, navigate] = useLocation();
  const { activeProject } = useProject();
  const { isInSession, requestNavigation } = useReviewGuard();

  const menuItems = [
    { title: t("nav.decks"), url: "/", icon: Layers },
    { title: t("nav.importCards"), url: "/import", icon: Upload },
    { title: t("nav.progress"), url: "/progress", icon: BarChart3 },
    { title: t("nav.projectSettings"), url: "/settings", icon: Settings },
  ];

  const handleNavClick = (e: React.MouseEvent, url: string) => {
    if (isInSession) {
      e.preventDefault();
      requestNavigation(() => navigate(url));
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-3" onClick={(e) => handleNavClick(e, "/")}>
          <img src={logoImg} alt="memicards" className="w-10 h-10 rounded-md object-cover" />
          <div>
            <h1 className="font-semibold text-lg leading-tight">memicards</h1>
            <p className="text-xs text-muted-foreground">{t("nav.spacedRepetition")}</p>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{activeProject?.name || "Project"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url ||
                  (item.url === "/" && location === "/");

                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      data-testid={`nav-${item.url === "/" ? "decks" : item.url.replace("/", "").replace(/\s+/g, "-")}`}
                    >
                      <Link href={item.url} onClick={(e) => handleNavClick(e, item.url)}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <a
          href="mailto:feedback@memicards.org"
          className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          data-testid="link-send-feedback"
        >
          <Mail className="h-3.5 w-3.5" />
          {t("nav.sendFeedback")}
        </a>
      </SidebarFooter>
    </Sidebar>
  );
}
