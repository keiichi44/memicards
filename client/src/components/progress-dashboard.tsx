import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Star, Target, TrendingUp, Calendar, BookOpen, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import type { Card as FlashCard, Deck, Review, Settings, DailyStats } from "@shared/schema";
import { isDueToday, isNewCard, getCardStatus } from "@/lib/sm2";
import { useProject } from "@/lib/project-context";

interface DeckWithCount extends Deck {
  cardCount: number;
  dueCount: number;
  starredCount: number;
  inactiveCount: number;
}

export function ProgressDashboard() {
  const { t } = useTranslation();
  const { activeProject } = useProject();

  const { data: decks = [] } = useQuery<DeckWithCount[]>({
    queryKey: ["/api/decks", { projectId: activeProject?.id }],
    queryFn: async () => {
      const url = activeProject?.id ? `/api/decks?projectId=${activeProject.id}` : "/api/decks";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch decks");
      return res.json();
    },
    enabled: !!activeProject,
  });

  const { data: allCards = [], isLoading: cardsLoading } = useQuery<FlashCard[]>({
    queryKey: ["/api/cards", { projectId: activeProject?.id }],
    queryFn: async () => {
      const url = activeProject?.id ? `/api/cards?projectId=${activeProject.id}` : "/api/cards";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch cards");
      return res.json();
    },
    enabled: !!activeProject,
  });

  const inactiveDeckIds = useMemo(() => {
    const ids = new Set<string>();
    decks.forEach(d => { if (d.isActive === false) ids.add(d.id); });
    return ids;
  }, [decks]);

  const cards = useMemo(() =>
    allCards.filter(c => !inactiveDeckIds.has(c.deckId)),
    [allCards, inactiveDeckIds]
  );

  const activeCardIds = useMemo(() => new Set(cards.map(c => c.id)), [cards]);

  const { data: allReviews = [] } = useQuery<Review[]>({
    queryKey: ["/api/reviews", { projectId: activeProject?.id }],
    queryFn: async () => {
      const url = activeProject?.id ? `/api/reviews?projectId=${activeProject.id}` : "/api/reviews";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch reviews");
      return res.json();
    },
    enabled: !!activeProject,
  });

  const reviews = useMemo(() =>
    allReviews.filter(r => activeCardIds.has(r.cardId)),
    [allReviews, activeCardIds]
  );

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings", { projectId: activeProject?.id }],
    queryFn: async () => {
      const url = activeProject?.id ? `/api/settings?projectId=${activeProject.id}` : "/api/settings";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
    enabled: !!activeProject,
  });

  const stats = useMemo(() => {
    const totalCards = cards.length;
    const dueToday = cards.filter(c => isDueToday(c)).length;
    const newCards = cards.filter(c => isNewCard(c)).length;
    const starredCards = cards.filter(c => c.isStarred).length;
    const graduatedCards = cards.filter(c => getCardStatus(c) === "graduated").length;
    const learningCards = cards.filter(c => getCardStatus(c) === "learning").length;

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const thisWeekReviews = reviews.filter(r => new Date(r.reviewedAt) >= weekStart);
    const uniqueCardsReviewedThisWeek = new Set(thisWeekReviews.map(r => r.cardId)).size;

    const correctReviews = reviews.filter(r => r.quality >= 3).length;
    const retentionRate = reviews.length > 0 ? Math.round((correctReviews / reviews.length) * 100) : 0;

    const daysRemaining = 7 - now.getDay();

    return {
      totalCards,
      dueToday,
      newCards,
      starredCards,
      graduatedCards,
      learningCards,
      weeklyProgress: {
        cardsLearned: uniqueCardsReviewedThisWeek,
        target: settings?.weeklyCardTarget || 50,
        daysRemaining,
      },
      retentionRate,
      totalReviews: reviews.length,
    };
  }, [cards, reviews, settings]);

  const dailyData = useMemo(() => {
    const last7Days: DailyStats[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayReviews = reviews.filter(r => {
        const reviewDate = new Date(r.reviewedAt);
        return reviewDate >= date && reviewDate < nextDate;
      });

      const correctAnswers = dayReviews.filter(r => r.quality >= 3).length;

      last7Days.push({
        date: date.toLocaleDateString("en-US", { weekday: "short" }),
        cardsReviewed: dayReviews.length,
        cardsLearned: new Set(dayReviews.filter(r => r.previousInterval === 0).map(r => r.cardId)).size,
        correctAnswers,
        totalAnswers: dayReviews.length,
      });
    }

    return last7Days;
  }, [reviews]);

  const starredList = useMemo(() => {
    return cards.filter(c => c.isStarred).slice(0, 10);
  }, [cards]);

  const progressPercent = stats.weeklyProgress.target > 0
    ? Math.min((stats.weeklyProgress.cardsLearned / stats.weeklyProgress.target) * 100, 100)
    : 0;

  if (cardsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">{t("progress.title")}</h2>
        <p className="text-muted-foreground">{t("progress.subtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">{t("progress.totalCards")}</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCards}</div>
            <p className="text-xs text-muted-foreground">
              {t("progress.graduatedLearning", { graduated: stats.graduatedCards, learning: stats.learningCards })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">{t("progress.dueToday")}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.dueToday}</div>
            <p className="text-xs text-muted-foreground">
              {t("progress.newAvailable", { n: stats.newCards })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">{t("progress.retentionRate")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.retentionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {t("progress.fromReviews", { n: stats.totalReviews })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">{t("progress.difficultCards")}</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.starredCards}</div>
            <p className="text-xs text-muted-foreground">
              {t("progress.markedForPractice")}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                {t("progress.weeklyGoal")}
              </CardTitle>
              <CardDescription>
                {t("progress.weeklyGoalDesc", { learned: stats.weeklyProgress.cardsLearned, target: stats.weeklyProgress.target })}
              </CardDescription>
            </div>
            <Badge variant={progressPercent >= 100 ? "default" : "secondary"}>
              {t("progress.daysLeft", { n: stats.weeklyProgress.daysRemaining })}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={progressPercent} className="h-3" />
          <p className="text-sm text-muted-foreground mt-2">
            {progressPercent >= 100
              ? t("progress.goalReached")
              : t("progress.percentComplete", { n: Math.round(progressPercent) })}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("progress.dailyReviews")}</CardTitle>
            <CardDescription>{t("progress.dailyReviewsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                  <Bar dataKey="cardsReviewed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("progress.accuracyTrend")}</CardTitle>
            <CardDescription>{t("progress.accuracyTrendDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="correctAnswers"
                    stroke="hsl(var(--accent))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--accent))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {starredList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              {t("progress.difficultWordsTitle")}
            </CardTitle>
            <CardDescription>{t("progress.difficultWordsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2">
              {starredList.map((card) => (
                <div
                  key={card.id}
                  className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                >
                  <div>
                    <p className="font-sans text-lg">{card.armenian}</p>
                    <p className="text-sm text-muted-foreground">{card.russian}</p>
                  </div>
                  <Badge variant="outline">
                    {getCardStatus(card)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
