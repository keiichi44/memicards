import { SignIn } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";
import { LanguageSelectorAnon } from "@/components/language-selector";
import logoImg from "@assets/memi_1770479923554.png";

export default function AuthPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4">
        <LanguageSelectorAnon />
      </div>
      <div className="mb-8 flex items-center gap-3">
        <img src={logoImg} alt="memicards" className="w-12 h-12 rounded-md object-cover" />
        <div>
          <h1 className="text-2xl font-bold leading-tight" data-testid="text-auth-title">memicards</h1>
          <p className="text-sm text-muted-foreground">{t("auth.subtitle")}</p>
        </div>
      </div>

      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-md",
            footer: { display: "none" },
          },
        }}
        fallbackRedirectUrl="/"
      />
    </div>
  );
}
