import { useLocation } from "wouter";
import { Layers, Upload, BarChart3, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useReviewGuard } from "@/lib/review-guard-context";
import { MobileUpdatesFloater } from "@/components/updates-indicator";

export function BottomNavBar() {
  const { t } = useTranslation();
  const [location, navigate] = useLocation();
  const { isInSession, hasUnsavedChanges, requestNavigation } = useReviewGuard();

  const navItems = [
    { title: t("bottomNav.decks"), url: "/", icon: Layers },
    { title: t("bottomNav.import"), url: "/import", icon: Upload },
    { title: t("bottomNav.progress"), url: "/progress", icon: BarChart3 },
    { title: t("bottomNav.settings"), url: "/settings", icon: Settings },
  ];

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden"
        role="navigation"
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const isActive = location === item.url;

            return (
              <a
                key={item.url}
                href={item.url}
                onClick={(e) => {
                  e.preventDefault();
                  if (isInSession || hasUnsavedChanges) {
                    requestNavigation(() => navigate(item.url));
                  } else {
                    navigate(item.url);
                  }
                }}
                data-testid={`nav-mobile-${item.url === "/" ? "decks" : item.url.replace("/", "")}`}
                aria-label={`Navigate to ${item.title}`}
                aria-current={isActive ? "page" : undefined}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
                <span className={`text-xs ${isActive ? "font-semibold" : "font-medium"}`}>{item.title}</span>
              </a>
            );
          })}
        </div>
      </nav>
      <div className="md:hidden">
        <MobileUpdatesFloater />
      </div>
    </>
  );
}
