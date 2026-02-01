import { useLocation, Link } from "wouter";
import { Layers, Upload, BarChart3, Settings } from "lucide-react";

const navItems = [
  {
    title: "Decks",
    url: "/",
    icon: Layers,
  },
  {
    title: "Import",
    url: "/import",
    icon: Upload,
  },
  {
    title: "Progress",
    url: "/progress",
    icon: BarChart3,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function BottomNavBar() {
  const [location] = useLocation();

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location === item.url;
          
          return (
            <Link
              key={item.title}
              href={item.url}
              data-testid={`nav-mobile-${item.title.toLowerCase()}`}
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
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
