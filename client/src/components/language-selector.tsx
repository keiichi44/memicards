import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useUser } from "@clerk/clerk-react";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "ru", label: "RU" },
  { code: "es", label: "ES" },
];

function getLangKey(userId?: string) {
  return userId ? `lang_${userId}` : null;
}

export function LanguageSelector() {
  const { i18n } = useTranslation();
  const { user } = useUser();

  useEffect(() => {
    const key = getLangKey(user?.id);
    if (key) {
      const saved = localStorage.getItem(key);
      if (saved && saved !== i18n.language) {
        i18n.changeLanguage(saved);
      }
    }
  }, [user?.id, i18n]);

  const handleSelect = (code: string) => {
    i18n.changeLanguage(code);
    const key = getLangKey(user?.id);
    if (key) {
      localStorage.setItem(key, code);
    }
    localStorage.setItem("i18nextLng", code);
  };

  const currentLang = LANGUAGES.find(l => i18n.language?.startsWith(l.code))?.label ?? "EN";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 gap-1" data-testid="button-language-selector">
          <Globe className="h-4 w-4" />
          <span className="text-xs font-medium">{currentLang}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGUAGES.map(lang => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleSelect(lang.code)}
            data-testid={`menu-item-lang-${lang.code}`}
            className={i18n.language?.startsWith(lang.code) ? "font-semibold" : ""}
          >
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LanguageSelectorAnon() {
  const { i18n } = useTranslation();

  const handleSelect = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem("i18nextLng", code);
  };

  const currentLang = LANGUAGES.find(l => i18n.language?.startsWith(l.code))?.label ?? "EN";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 gap-1" data-testid="button-language-selector-anon">
          <Globe className="h-4 w-4" />
          <span className="text-xs font-medium">{currentLang}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGUAGES.map(lang => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleSelect(lang.code)}
            data-testid={`menu-item-lang-anon-${lang.code}`}
            className={i18n.language?.startsWith(lang.code) ? "font-semibold" : ""}
          >
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
