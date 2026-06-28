import { useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const CURRENT_VERSION = "1.0.0";

type LocaleKey = "en" | "ru" | "es" | "de" | "sr";

const UPDATES_CONTENT: Record<LocaleKey, Array<{ title: string; body: string }>> = {
  en: [
    {
      title: "Deck cards swap",
      body: `Now you can swap the fronts and backs of the cards to improve your memorization. Use the "Flip deck" option in the Deck menu to place the translation on the front and the original word on the back. You can flip it back at any time.`,
    },
    {
      title: "Duplicate and swap",
      body: `Use "Duplicate and flip cards" to create a copy of the deck with reversed cards.`,
    },
    {
      title: "Disable decks",
      body: `Is the deck learned? Put it off from statistics by clicking the "Pause" button on the deck card. The deck will also not appear when the "Start Review" button is clicked.`,
    },
  ],
  ru: [
    {
      title: "Переворот карточек",
      body: `Теперь можно менять местами лицевую и обратную стороны карточек для более эффективного запоминания. Используйте опцию «Перевернуть колоду» в меню колоды, чтобы поставить перевод на лицевую сторону, а исходное слово — на обратную. Вернуть порядок можно в любой момент.`,
    },
    {
      title: "Дублировать и перевернуть",
      body: `Используйте «Дублировать и перевернуть карточки», чтобы создать копию колоды с перевёрнутыми карточками.`,
    },
    {
      title: "Отключить колоду",
      body: `Колода уже выучена? Уберите её из статистики, нажав кнопку «Приостановить» на карточке колоды. Колода также не будет включена в сессию при нажатии кнопки «Заучивать».`,
    },
  ],
  es: [
    {
      title: "Volteo de tarjetas",
      body: `Ahora puede intercambiar el anverso y el reverso de las tarjetas para mejorar su memorización. Use la opción «Invertir mazo» en el menú del mazo para mostrar la traducción al frente y la palabra original detrás. Puede revertirlo en cualquier momento.`,
    },
    {
      title: "Duplicar e invertir",
      body: `Use «Duplicar con inversión» para crear una copia del mazo con las tarjetas invertidas.`,
    },
    {
      title: "Desactivar mazos",
      body: `¿Ya aprendió el mazo? Retírelo de las estadísticas haciendo clic en el botón «Pausar» de la tarjeta del mazo. El mazo tampoco aparecerá al pulsar «Iniciar repaso».`,
    },
  ],
  de: [
    {
      title: "Karten spiegeln",
      body: `Sie können jetzt Vorder- und Rückseite der Karten tauschen, um das Einprägen zu verbessern. Verwenden Sie die Option «Karten spiegeln» im Deck-Menü, um die Übersetzung vorne und das Originalwort hinten anzuzeigen. Sie können dies jederzeit rückgängig machen.`,
    },
    {
      title: "Duplizieren und umkehren",
      body: `Verwenden Sie «Duplizieren und umkehren», um eine Kopie des Decks mit umgekehrten Karten zu erstellen.`,
    },
    {
      title: "Decks deaktivieren",
      body: `Haben Sie ein Deck bereits gelernt? Blenden Sie es aus der Statistik aus, indem Sie auf «Pausieren» klicken. Das Deck erscheint auch nicht, wenn Sie auf «Wiederholung starten» klicken.`,
    },
  ],
  sr: [
    {
      title: "Okretanje karata",
      body: `Sada možete zameniti prednju i zadnju stranu karata radi boljeg pamćenja. Koristite opciju «Okreni špil» u meniju špila da postavite prevod napred, a originalnu reč pozadi. Možete ga okrenuti nazad u bilo kom trenutku.`,
    },
    {
      title: "Dupliciraj i obrni",
      body: `Koristite «Dupliciraj i obrni» da napravite kopiju špila sa obrnutim kartama.`,
    },
    {
      title: "Onemogući špilove",
      body: `Da li je špil već naučen? Isključite ga iz statistike klikom na dugme «Pauziraj» na kartici špila. Špil se takođe neće prikazati kada kliknete na «Započni ponavljanje».`,
    },
  ],
};

export function UpdatesIndicator() {
  const { user } = useUser();
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const userId = user?.id ?? "guest";
  const storageKey = `updates_seen_${userId}_v${CURRENT_VERSION}`;
  const isSeen = typeof window !== "undefined" && !!localStorage.getItem(storageKey);

  const [seen, setSeen] = useState(isSeen);

  const locale = (i18n.language?.slice(0, 2) ?? "en") as LocaleKey;
  const bullets = UPDATES_CONTENT[locale] ?? UPDATES_CONTENT.en;

  const handleOpen = () => {
    localStorage.setItem(storageKey, "1");
    setSeen(true);
    setOpen(true);
  };

  if (seen) {
    return (
      <>
        <button
          onClick={handleOpen}
          data-testid="button-updates-seen"
          className="w-full flex flex-col items-start gap-0.5 rounded-md border border-border bg-muted/40 px-3 py-2 text-left hover:bg-muted transition-colors"
        >
          <span className="text-xs font-semibold text-foreground leading-tight">
            {t("updates.seenHeader")}
          </span>
          <span className="text-xs text-muted-foreground">v{CURRENT_VERSION}</span>
        </button>

        <UpdatesDialog
          open={open}
          onClose={() => setOpen(false)}
          bullets={bullets}
          t={t}
        />
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleOpen}
        data-testid="button-updates-unseen"
        className="w-full flex flex-col items-start gap-0.5 rounded-md border border-primary/50 bg-primary/5 px-3 py-2 text-left hover:bg-primary/10 transition-colors"
      >
        <span className="text-xs font-semibold text-primary leading-tight">
          {t("updates.newFeaturesHeader")}
        </span>
        <span className="text-xs text-muted-foreground">v{CURRENT_VERSION}</span>
        <span className="text-xs text-muted-foreground">{t("updates.teaser")}</span>
      </button>

      <UpdatesDialog
        open={open}
        onClose={() => setOpen(false)}
        bullets={bullets}
        t={t}
      />
    </>
  );
}

export function MobileUpdatesFloater() {
  const { user } = useUser();
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const userId = user?.id ?? "guest";
  const storageKey = `updates_seen_${userId}_v${CURRENT_VERSION}`;
  const isSeen = typeof window !== "undefined" && !!localStorage.getItem(storageKey);

  const [seen, setSeen] = useState(isSeen);

  const locale = (i18n.language?.slice(0, 2) ?? "en") as LocaleKey;
  const bullets = UPDATES_CONTENT[locale] ?? UPDATES_CONTENT.en;

  const handleOpen = () => {
    localStorage.setItem(storageKey, "1");
    setSeen(true);
    setOpen(true);
  };

  if (seen && !open) return null;

  return (
    <>
      {!seen && (
        <button
          onClick={handleOpen}
          data-testid="button-updates-mobile-floater"
          className="fixed bottom-20 right-4 z-50 flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 shadow-lg text-primary-foreground text-xs font-semibold hover:opacity-90 active:opacity-80 transition-opacity"
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          {t("updates.newFeaturesHeader")}
        </button>
      )}
      <UpdatesDialog
        open={open}
        onClose={() => setOpen(false)}
        bullets={bullets}
        t={t}
      />
    </>
  );
}

function UpdatesDialog({
  open,
  onClose,
  bullets,
  t,
}: {
  open: boolean;
  onClose: () => void;
  bullets: Array<{ title: string; body: string }>;
  t: (key: string, opts?: Record<string, string>) => string;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent data-testid="dialog-updates">
        <DialogHeader>
          <DialogTitle>
            {t("updates.dialogTitle", { version: CURRENT_VERSION })}
          </DialogTitle>
        </DialogHeader>
        <ul className="space-y-3 py-2">
          {bullets.map((item, idx) => (
            <li key={idx} className="text-sm leading-relaxed">
              <strong>{item.title}</strong> — {item.body}
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button onClick={onClose} data-testid="button-updates-close">
            {t("updates.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
