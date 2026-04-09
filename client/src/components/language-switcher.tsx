import { Globe, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const languages = [
  { code: "en", label: "English" },
  { code: "ru", label: "Русский" },
  { code: "es", label: "Español" },
];

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const currentLang = i18n.language?.split("-")[0] || "en";

  const handleChange = (code: string) => {
    i18n.changeLanguage(code);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" data-testid="button-language-switcher" title={t("languageSwitcher.changeLanguage")}>
          <Globe className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map(({ code, label }) => (
          <DropdownMenuItem
            key={code}
            onClick={() => handleChange(code)}
            className="flex items-center gap-2"
            data-testid={`menu-lang-${code}`}
          >
            <Check className={`h-4 w-4 shrink-0 ${currentLang === code ? "opacity-100" : "opacity-0"}`} />
            <span className={currentLang === code ? "font-semibold" : ""}>{label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
