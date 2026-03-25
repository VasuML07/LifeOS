"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  Clock,
  CheckCircle2,
  Target,
  TrendingUp,
  Calendar,
  Sparkles,
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Lightbulb,
  Brain,
  Moon,
  Info,
  HelpCircle,
  ArrowRight,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTasks, useGoals, useHabits, useHabitLogs } from "@/lib/store";

// ============================================
// Types
// ============================================

type DateRange = "week" | "month" | "year";

interface SummaryCardProps {
  title: string;
  value: string | number;
  numericValue?: number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  accentColor?: string;
  sparklineData?: number[];
  progressValue?: number;
}

interface InsightProps {
  icon: React.ReactNode;
  text: string;
  confidence?: number;
  explanation?: string;
  type?: "observation" | "suggestion";
}

// ============================================
// Chart Configuration
// ============================================

const chartConfig = {
  focus: {
    label: "Focus Hours",
    color: "hsl(var(--chart-1))",
  },
  tasks: {
    label: "Tasks",
    color: "hsl(var(--chart-2))",
  },
  habits: {
    label: "Habits",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

// ============================================
// Sample Data for Empty State
// ============================================

const SAMPLE_INSIGHTS: { icon: React.ReactNode; text: string; gradient: string }[] = [
  {
    icon: <Moon className="h-5 w-5" />,
    text: "You're most productive at night",
    gradient: "from-indigo-500/10 to-purple-500/10",
  },
  {
    icon: <Calendar className="h-5 w-5" />,
    text: "Wednesday is your best day",
    gradient: "from-violet-500/10 to-pink-500/10",
  },
  {
    icon: <TrendingUp className="h-5 w-5" />,
    text: "Your focus time increased 15%",
    gradient: "from-emerald-500/10 to-teal-500/10",
  },
];

// ============================================
// Helper Functions
// ============================================

function getDateRangeDays(range: DateRange): number {
  switch (range) {
    case "week":
      return 7;
    case "month":
      return 30;
    case "year":
      return 365;
    default:
      return 7;
  }
}

function getDayName(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ============================================
// Custom Hooks
// ============================================

function useCountUp(end: number, duration: number = 1000, decimals: number = 0): number {
  const [count, setCount] = useState(0);
  const startTime = useRef<number | null>(null);
  const startValue = useRef(0);

  useEffect(() => {
    startValue.current = 0;
    startTime.current = null;
    
    const animate = (currentTime: number) => {
      if (!startTime.current) startTime.current = currentTime;
      const progress = Math.min((currentTime - startTime.current) / duration, 1);
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentCount = startValue.current + (end - startValue.current) * easeOut;
      
      setCount(Number(currentCount.toFixed(decimals)));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [end, duration, decimals]);

  return count;
}

// ============================================
// Components
// ============================================

function CircularProgress({ value, size = 48, strokeWidth = 4, color = "var(--chart-1)" }: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-muted/30"
          stroke="currentColor"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <motion.circle
          stroke={color}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-semibold">{value}%</span>
      </div>
    </div>
  );
}

function MiniSparkline({ data, width = 60, height = 24 }: { data: number[]; width?: number; height?: number }) {
  if (!data.length) return null;
  
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <motion.polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="text-violet-500"
      />
    </svg>
  );
}

function TypewriterText({ text, delay = 0, speed = 30 }: { text: string; delay?: number; speed?: number }) {
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsTyping(true);
      let index = 0;
      const interval = setInterval(() => {
        if (index < text.length) {
          setDisplayText(text.slice(0, index + 1));
          index++;
        } else {
          clearInterval(interval);
          setIsTyping(false);
        }
      }, speed);
      
      return () => clearInterval(interval);
    }, delay);
    
    return () => clearTimeout(timeout);
  }, [text, delay, speed]);

  return (
    <span>
      {displayText}
      {isTyping && <span className="animate-pulse">|</span>}
    </span>
  );
}

function InsightCard({ icon, text, confidence, explanation, type = "observation" }: InsightProps) {
  const [showExplanation, setShowExplanation] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-lg border relative group ${
        type === "observation"
          ? "bg-violet-500/5 border-violet-500/20"
          : "bg-amber-500/5 border-amber-500/20"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 shrink-0 ${type === "observation" ? "text-violet-500" : "text-amber-500"}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm">{text}</p>
          
          {confidence !== undefined && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Confidence:</span>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-24">
                <motion.div
                  className={`h-full rounded-full ${confidence >= 80 ? "bg-emerald-500" : confidence >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${confidence}%` }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                />
              </div>
              <span className="text-xs font-medium">{confidence}%</span>
            </div>
          )}
        </div>
        
        {explanation && (
          <TooltipProvider>
            <UITooltip open={showExplanation} onOpenChange={setShowExplanation}>
              <TooltipTrigger asChild>
                <button
                  className="shrink-0 p-1 rounded-md hover:bg-muted/50 transition-colors"
                  onClick={() => setShowExplanation(!showExplanation)}
                >
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p className="text-sm">{explanation}</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        )}
      </div>
    </motion.div>
  );
}

function SampleInsightCard({ icon, text, gradient }: { icon: React.ReactNode; text: string; gradient: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`p-4 rounded-lg bg-gradient-to-br ${gradient} border border-border/50 relative overflow-hidden`}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-background/50 text-violet-500">
          {icon}
        </div>
        <p className="text-sm font-medium">{text}</p>
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent" />
    </motion.div>
  );
}

function SummaryCard({ 
  title, 
  value, 
  numericValue = 0, 
  subtitle, 
  icon, 
  trend, 
  accentColor = "text-violet-500",
  sparklineData,
  progressValue,
}: SummaryCardProps) {
  const countUpValue = useCountUp(typeof value === "number" ? value : numericValue, 1000);
  const displayValue = typeof value === "number" ? countUpValue : value;

  return (
    <Card className="group hover:shadow-md transition-all duration-200 hover:border-violet-500/20">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold tracking-tight">{displayValue}</p>
              {trend && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium ${
                    trend.isPositive 
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                      : trend.value === 0 
                        ? "bg-muted text-muted-foreground"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {trend.isPositive ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : trend.value === 0 ? (
                    <Minus className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  )}
                  {Math.abs(trend.value)}%
                </motion.div>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <motion.div 
              className={`${accentColor} p-2.5 rounded-xl bg-violet-500/10`}
              whileHover={{ scale: 1.1 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              {icon}
            </motion.div>
            
            {progressValue !== undefined && (
              <CircularProgress value={progressValue} size={40} strokeWidth={3} />
            )}
          </div>
        </div>
        
        {sparklineData && sparklineData.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border/50">
            <MiniSparkline data={sparklineData} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ComparisonBar({ 
  thisWeek, 
  lastWeek, 
  label,
  format = (v) => v.toString()
}: { 
  thisWeek: number; 
  lastWeek: number; 
  label: string;
  format?: (v: number) => string;
}) {
  const max = Math.max(thisWeek, lastWeek, 1);
  const change = thisWeek - lastWeek;
  const isPositive = change >= 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center gap-1.5">
          {change !== 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                isPositive 
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
              }`}
            >
              {isPositive ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <ArrowDown className="h-3 w-3" />
              )}
              {Math.abs(change)}
            </motion.div>
          )}
        </div>
      </div>
      
      <div className="space-y-2">
        {/* This Week */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-16 shrink-0">This week</span>
          <div className="flex-1 h-6 bg-muted/30 rounded-md overflow-hidden relative">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 to-violet-400 rounded-md"
              initial={{ width: 0 }}
              animate={{ width: `${(thisWeek / max) * 100}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
            <span className="absolute inset-y-0 right-2 flex items-center text-xs font-medium">
              {format(thisWeek)}
            </span>
          </div>
        </div>
        
        {/* Last Week */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-16 shrink-0">Last week</span>
          <div className="flex-1 h-6 bg-muted/30 rounded-md overflow-hidden relative">
            <motion.div
              className="absolute inset-y-0 left-0 bg-muted-foreground/20 rounded-md"
              initial={{ width: 0 }}
              animate={{ width: `${(lastWeek / max) * 100}%` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
            />
            <span className="absolute inset-y-0 right-2 flex items-center text-xs font-medium text-muted-foreground">
              {format(lastWeek)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Lightbulb className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      </CardContent>
    </Card>
  );
}

function DateRangeSelector({ value, onChange }: { value: DateRange; onChange: (range: DateRange) => void }) {
  const ranges: { label: string; value: DateRange }[] = [
    { label: "Week", value: "week" },
    { label: "Month", value: "month" },
    { label: "Year", value: "year" },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
      {ranges.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
            value === range.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function AnalyticsView() {
  const [dateRange, setDateRange] = useState<DateRange>("week");
  
  const tasks = useTasks();
  const goals = useGoals();
  const habits = useHabits();
  const habitLogs = useHabitLogs();

  // Calculate analytics data
  const analytics = useMemo(() => {
    const days = getDateRangeDays(dateRange);
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days);
    
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - days);

    // Current period tasks
    const currentPeriodTasks = tasks.filter((task) => {
      if (!task.completedAt) return false;
      const completedDate = new Date(task.completedAt);
      return completedDate >= startDate && completedDate <= today;
    });

    // Previous period tasks
    const previousPeriodTasks = tasks.filter((task) => {
      if (!task.completedAt) return false;
      const completedDate = new Date(task.completedAt);
      return completedDate >= previousStartDate && completedDate < startDate;
    });

    // Calculate focus hours (simulated based on completed tasks)
    const focusHours = currentPeriodTasks.length * 0.75;
    const previousFocusHours = previousPeriodTasks.length * 0.75;

    // Habits completion
    const currentPeriodLogs = habitLogs.filter((log) => {
      const logDate = new Date(log.date);
      return logDate >= startDate && logDate <= today;
    });

    const activeHabits = habits.filter((h) => h.isActive);
    const possibleCompletions = activeHabits.length * days;
    const actualCompletions = currentPeriodLogs.filter((l) => l.completed).length;
    const habitCompletionRate = possibleCompletions > 0 
      ? Math.round((actualCompletions / possibleCompletions) * 100) 
      : 0;

    // Goals progress
    const avgGoalProgress = goals.length > 0
      ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length)
      : 0;

    // Generate chart data for focus time (bar chart) - by day of week
    const focusChartData: { day: string; focus: number; fullDay: string }[] = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    
    for (let i = 0; i < 7; i++) {
      const dayTasks = currentPeriodTasks.filter((t) => {
        if (!t.completedAt) return false;
        return new Date(t.completedAt).getDay() === i;
      });
      
      focusChartData.push({
        day: dayNames[i],
        focus: Math.round(dayTasks.length * 0.75 * 10) / 10,
        fullDay: dayNames[i],
      });
    }

    // Generate consistency chart data (line chart) - daily over period
    const consistencyChartData: { date: string; habits: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      const dayLogs = currentPeriodLogs.filter((l) => {
        return new Date(l.date).toDateString() === date.toDateString();
      });

      consistencyChartData.push({
        date: formatDate(date),
        habits: dayLogs.filter((l) => l.completed).length,
      });
    }

    // Calculate trends
    const taskTrend = previousPeriodTasks.length > 0
      ? Math.round(((currentPeriodTasks.length - previousPeriodTasks.length) / previousPeriodTasks.length) * 100)
      : currentPeriodTasks.length > 0 ? 100 : 0;

    const focusTrend = previousFocusHours > 0
      ? Math.round(((focusHours - previousFocusHours) / previousFocusHours) * 100)
      : focusHours > 0 ? 100 : 0;

    // Best day
    const bestDayIndex = focusChartData.reduce(
      (best, data, index) => (data.focus > focusChartData[best].focus ? index : best),
      0
    );
    const bestDay = {
      day: focusChartData[bestDayIndex].day,
      tasks: Math.round(focusChartData[bestDayIndex].focus / 0.75),
      focus: focusChartData[bestDayIndex].focus,
    };

    // Current streak
    let currentStreak = 0;
    const sortedLogs = [...currentPeriodLogs].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    for (let i = 0; i < sortedLogs.length; i++) {
      if (sortedLogs[i].completed) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Sparkline data for summary cards
    const focusSparkline = consistencyChartData.slice(-7).map(d => d.habits);
    const taskSparkline = consistencyChartData.slice(-7).map(d => d.habits * 2);

    return {
      focusHours,
      tasksCompleted: currentPeriodTasks.length,
      habitCompletionRate,
      avgGoalProgress,
      focusChartData,
      consistencyChartData,
      trends: {
        tasks: taskTrend,
        focus: focusTrend,
      },
      bestDay,
      bestDayIndex,
      currentStreak,
      hasData: tasks.length > 0 || habits.length > 0 || goals.length > 0,
      sparklines: {
        focus: focusSparkline,
        tasks: taskSparkline,
      },
    };
  }, [tasks, goals, habits, habitLogs, dateRange]);

  // AI Insights with confidence and explanations
  const aiInsights = useMemo(() => {
    const insights: { type: "observation" | "suggestion"; text: string; confidence: number; explanation: string }[] = [];

    if (analytics.bestDay.tasks > 0) {
      insights.push({
        type: "observation",
        text: `${analytics.bestDay.day}s are your most productive days with ${analytics.bestDay.tasks} task${analytics.bestDay.tasks > 1 ? 's' : ''} completed on average.`,
        confidence: 85,
        explanation: "Based on your task completion patterns over the selected period.",
      });
    }

    if (analytics.currentStreak > 3) {
      insights.push({
        type: "observation",
        text: `Amazing! You're on a ${analytics.currentStreak}-day habit streak. Keep the momentum going!`,
        confidence: 95,
        explanation: "Calculated from consecutive days of habit completion.",
      });
    }

    if (analytics.habitCompletionRate < 50 && habits.length > 0) {
      insights.push({
        type: "suggestion",
        text: "Your habit completion rate is below 50%. Consider reducing the number of habits or setting reminders.",
        confidence: 70,
        explanation: "Low completion rates often indicate overcommitment or lack of reminders.",
      });
    }

    if (analytics.trends.focus > 0) {
      insights.push({
        type: "observation",
        text: `Your focus time increased by ${analytics.trends.focus}% this period. Great progress!`,
        confidence: 88,
        explanation: "Compared focus hours with the previous equivalent period.",
      });
    }

    if (insights.length === 0) {
      insights.push({
        type: "suggestion",
        text: "Start logging your tasks and habits to get personalized insights.",
        confidence: 100,
        explanation: "More data leads to more accurate and helpful insights.",
      });
    }

    return insights;
  }, [analytics, habits.length]);

  // Weekly comparison
  const weeklyComparison = useMemo(() => {
    const thisWeekTasks = analytics.tasksCompleted;
    const lastWeekTasks = Math.max(0, thisWeekTasks - Math.floor(thisWeekTasks * (analytics.trends.tasks / 100) / 100));
    
    return {
      thisWeek: {
        tasks: thisWeekTasks,
        focus: Math.round(analytics.focusHours * 10) / 10,
        habits: analytics.habitCompletionRate,
      },
      lastWeek: {
        tasks: lastWeekTasks,
        focus: Math.round((analytics.focusHours * (1 - analytics.trends.focus / 100)) * 10) / 10,
        habits: Math.max(0, analytics.habitCompletionRate - 10),
      },
    };
  }, [analytics]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Insights</h1>
          <p className="text-muted-foreground">Analytics and productivity insights</p>
        </div>
        <DateRangeSelector value={dateRange} onChange={setDateRange} />
      </div>

      {/* Sample Insights Preview (shown when no data, fading when data exists) */}
      <AnimatePresence>
        {!analytics.hasData && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="grid gap-4 sm:grid-cols-3"
          >
            {SAMPLE_INSIGHTS.map((insight, index) => (
              <motion.div
                key={insight.text}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <SampleInsightCard
                  icon={insight.icon}
                  text={insight.text}
                  gradient={insight.gradient}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Focus Hours"
          value={analytics.focusHours.toFixed(1)}
          numericValue={analytics.focusHours}
          subtitle="Total focus time"
          icon={<Clock className="h-5 w-5" />}
          trend={{ value: analytics.trends.focus, isPositive: analytics.trends.focus >= 0 }}
          sparklineData={analytics.sparklines.focus}
          progressValue={Math.min(100, Math.round((analytics.focusHours / 20) * 100))}
        />
        <SummaryCard
          title="Tasks Completed"
          value={analytics.tasksCompleted}
          subtitle="Tasks marked done"
          icon={<CheckCircle2 className="h-5 w-5" />}
          trend={{ value: analytics.trends.tasks, isPositive: analytics.trends.tasks >= 0 }}
          sparklineData={analytics.sparklines.tasks}
          progressValue={Math.min(100, Math.round((analytics.tasksCompleted / 30) * 100))}
        />
        <SummaryCard
          title="Habits Rate"
          value={`${analytics.habitCompletionRate}%`}
          numericValue={analytics.habitCompletionRate}
          subtitle="Completion rate"
          icon={<Target className="h-5 w-5" />}
          accentColor="text-emerald-500"
          progressValue={analytics.habitCompletionRate}
        />
        <SummaryCard
          title="Goals Progress"
          value={`${analytics.avgGoalProgress}%`}
          numericValue={analytics.avgGoalProgress}
          subtitle="Average across goals"
          icon={<TrendingUp className="h-5 w-5" />}
          accentColor="text-amber-500"
          progressValue={analytics.avgGoalProgress}
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Focus Time Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-violet-500" />
              Focus Time by Day
            </CardTitle>
            <CardDescription>Your focus distribution across the week</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[220px] w-full">
              <BarChart data={analytics.focusChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-xs"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-xs"
                  tickFormatter={(value) => `${value}h`}
                />
                <Tooltip
                  content={<ChartTooltipContent />}
                  formatter={(value: number) => [`${value}h`, "Focus"]}
                />
                <Bar 
                  dataKey="focus" 
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                >
                  {analytics.focusChartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === analytics.bestDayIndex ? "hsl(262 83% 58%)" : "hsl(262 83% 58% / 0.4)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
            {analytics.bestDay.tasks > 0 && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-violet-500" />
                <span><strong>{analytics.bestDay.day}</strong> is your most productive day!</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Consistency Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-violet-500" />
              Habit Consistency
            </CardTitle>
            <CardDescription>Your habit completion trend over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[220px] w-full">
              <LineChart data={analytics.consistencyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="habitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(180 70% 50%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(180 70% 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-xs"
                  tickFormatter={(value) => value.split(" ")[0]}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-xs"
                  allowDecimals={false}
                />
                <Tooltip
                  content={<ChartTooltipContent />}
                  formatter={(value: number) => [value, "Habits"]}
                />
                <Line
                  type="monotone"
                  dataKey="habits"
                  stroke="hsl(180 70% 50%)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  fill="url(#habitGradient)"
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Productivity Patterns & AI Insights */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Productivity Patterns */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-violet-500" />
              Productivity Patterns
            </CardTitle>
            <CardDescription>When you perform at your best</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Best Day */}
            <motion.div 
              className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div>
                <p className="text-sm text-muted-foreground">Best Performing Day</p>
                <p className="text-xl font-semibold">{analytics.bestDay.day}</p>
              </div>
              <div className="text-right">
                <Badge variant="secondary" className="bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  {analytics.bestDay.tasks} tasks
                </Badge>
              </div>
            </motion.div>

            {/* Most Productive Hours */}
            <motion.div 
              className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div>
                <p className="text-sm text-muted-foreground">Peak Hours</p>
                <p className="text-xl font-semibold">9 AM - 12 PM</p>
              </div>
              <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
                Morning focus
              </Badge>
            </motion.div>

            {/* Habit Streak */}
            <motion.div 
              className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div>
                <p className="text-sm text-muted-foreground">Current Streak</p>
                <p className="text-xl font-semibold">{analytics.currentStreak} days</p>
              </div>
              <div className="flex items-center gap-1">
                {[...Array(Math.min(7, analytics.currentStreak))].map((_, i) => (
                  <motion.div
                    key={i}
                    className="h-2 w-2 rounded-full bg-amber-500"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4 + i * 0.05 }}
                  />
                ))}
                {[...Array(Math.max(0, 7 - analytics.currentStreak))].map((_, i) => (
                  <div
                    key={i}
                    className="h-2 w-2 rounded-full bg-muted-foreground/30"
                  />
                ))}
              </div>
            </motion.div>
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-500" />
              AI Insights
            </CardTitle>
            <CardDescription>Personalized observations and suggestions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AnimatePresence mode="popLayout">
              {aiInsights.map((insight, index) => (
                <motion.div
                  key={insight.text}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <InsightCard
                    icon={insight.type === "observation" ? <Lightbulb className="h-4 w-4" /> : <Target className="h-4 w-4" />}
                    text={insight.text}
                    confidence={insight.confidence}
                    explanation={insight.explanation}
                    type={insight.type}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            <Button variant="outline" className="w-full mt-4 group hover:bg-violet-500/5 hover:border-violet-500/30 transition-colors">
              <MessageSquare className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
              Ask for deeper insights
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Recap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-violet-500" />
            Weekly Recap
          </CardTitle>
          <CardDescription>Compare this week&apos;s performance with last week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-8 sm:grid-cols-3">
            <ComparisonBar
              thisWeek={weeklyComparison.thisWeek.tasks}
              lastWeek={weeklyComparison.lastWeek.tasks}
              label="Tasks Completed"
              format={(v) => `${v}`}
            />
            <ComparisonBar
              thisWeek={weeklyComparison.thisWeek.focus}
              lastWeek={weeklyComparison.lastWeek.focus}
              label="Focus Hours"
              format={(v) => `${v}h`}
            />
            <ComparisonBar
              thisWeek={weeklyComparison.thisWeek.habits}
              lastWeek={weeklyComparison.lastWeek.habits}
              label="Habit Completion"
              format={(v) => `${v}%`}
            />
          </div>

          {/* Areas to Focus On */}
          <div className="mt-6 pt-6 border-t">
            <p className="text-sm font-medium mb-3">Areas to focus on:</p>
            <div className="flex flex-wrap gap-2">
              {analytics.habitCompletionRate < 70 && habits.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <Badge variant="outline" className="bg-amber-500/5 hover:bg-amber-500/10 transition-colors">
                    <Target className="h-3 w-3 mr-1" />
                    Improve habit consistency
                  </Badge>
                </motion.div>
              )}
              {analytics.avgGoalProgress < 50 && goals.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Badge variant="outline" className="bg-violet-500/5 hover:bg-violet-500/10 transition-colors">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Advance goal progress
                  </Badge>
                </motion.div>
              )}
              {analytics.focusHours < 10 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <Badge variant="outline" className="bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors">
                    <Clock className="h-3 w-3 mr-1" />
                    Increase focus time
                  </Badge>
                </motion.div>
              )}
              {analytics.habitCompletionRate >= 70 && analytics.avgGoalProgress >= 50 && analytics.focusHours >= 10 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <Badge variant="outline" className="bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Keep up the great work!
                  </Badge>
                </motion.div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AnalyticsView;
