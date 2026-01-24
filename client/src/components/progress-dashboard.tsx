import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Star, Target, TrendingUp, Calendar, BookOpen, CheckCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import type { Card as FlashCard, Review, DailyStats } from "@shared/schema";
import { getCards, getReviews, getSettings } from "@/lib/storage";
import { isDueToday, isNewCard, getCardStatus } from "@/lib/sm2";

export function ProgressDashboard() {
  const cards = useMemo(() => getCards(), []);
  const reviews = useMemo(() => getReviews(), []);
  const settings = useMemo(() => getSettings(), []);
  
  const stats = useMemo(() => {
    const totalCards = cards.length;
    const dueToday = cards.filter(isDueToday).length;
    const newCards = cards.filter(isNewCard).length;
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
        target: settings.weeklyCardTarget,
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
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Progress Dashboard</h2>
        <p className="text-muted-foreground">Track your Armenian learning journey</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Cards</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCards}</div>
            <p className="text-xs text-muted-foreground">
              {stats.graduatedCards} graduated, {stats.learningCards} learning
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Due Today</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.dueToday}</div>
            <p className="text-xs text-muted-foreground">
              {stats.newCards} new cards available
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Retention Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.retentionRate}%</div>
            <p className="text-xs text-muted-foreground">
              From {stats.totalReviews} total reviews
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Difficult Cards</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.starredCards}</div>
            <p className="text-xs text-muted-foreground">
              Marked for extra practice
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
                Weekly Goal
              </CardTitle>
              <CardDescription>
                {stats.weeklyProgress.cardsLearned} of {stats.weeklyProgress.target} cards this week
              </CardDescription>
            </div>
            <Badge variant={progressPercent >= 100 ? "default" : "secondary"}>
              {stats.weeklyProgress.daysRemaining} days left
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={progressPercent} className="h-3" />
          <p className="text-sm text-muted-foreground mt-2">
            {progressPercent >= 100 
              ? "Goal reached! Great work this week!"
              : `${Math.round(progressPercent)}% complete`}
          </p>
        </CardContent>
      </Card>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily Reviews</CardTitle>
            <CardDescription>Cards reviewed over the past week</CardDescription>
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
            <CardTitle>Accuracy Trend</CardTitle>
            <CardDescription>Correct answers over time</CardDescription>
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
              Difficult Words
            </CardTitle>
            <CardDescription>Cards you've marked for extra practice</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2">
              {starredList.map((card) => (
                <div 
                  key={card.id} 
                  className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                >
                  <div>
                    <p className="font-armenian text-lg">{card.armenian}</p>
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
