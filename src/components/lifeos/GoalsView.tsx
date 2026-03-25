"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { format, differenceInDays, isPast, isToday } from "date-fns";
import {
  Target,
  Plus,
  Edit2,
  Trash2,
  ListTodo,
  Calendar,
  GraduationCap,
  Briefcase,
  Heart,
  BookOpen,
  Sparkles,
  Rocket,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLifeOSStore, type Goal, type GoalStatus } from "@/lib/store";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// ============================================
// Types
// ============================================

type FilterTab = "all" | "active" | "completed" | "on_hold";

interface GoalFormData {
  title: string;
  description: string;
  categories: string[];
  targetDate?: Date;
  status: GoalStatus;
  progress: number;
}

interface GoalTemplate {
  id: string;
  title: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  suggestedCategories: string[];
  suggestedDescription: string;
  suggestedStatus: GoalStatus;
}

// ============================================
// Constants
// ============================================

const CATEGORY_OPTIONS = [
  { value: "career", label: "Career", color: "bg-blue-500", borderColor: "border-l-blue-500" },
  { value: "health", label: "Health", color: "bg-green-500", borderColor: "border-l-green-500" },
  { value: "learning", label: "Learning", color: "bg-yellow-500", borderColor: "border-l-yellow-500" },
  { value: "personal", label: "Personal", color: "bg-purple-500", borderColor: "border-l-purple-500" },
  { value: "finance", label: "Finance", color: "bg-emerald-500", borderColor: "border-l-emerald-500" },
] as const;

const STATUS_CONFIG: Record<GoalStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  not_started: { label: "Not Started", variant: "outline" },
  in_progress: { label: "In Progress", variant: "default" },
  completed: { label: "Completed", variant: "secondary" },
  on_hold: { label: "On Hold", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

const STATUS_DOT_CONFIG: Record<GoalStatus, { color: string; pulse: boolean }> = {
  not_started: { color: "bg-slate-400", pulse: false },
  in_progress: { color: "bg-violet-500", pulse: true },
  completed: { color: "bg-green-500", pulse: false },
  on_hold: { color: "bg-amber-500", pulse: false },
  cancelled: { color: "bg-red-500", pulse: false },
};

const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    id: "exam-prep",
    title: "Exam Preparation",
    icon: GraduationCap,
    iconBg: "bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30",
    iconColor: "text-blue-600 dark:text-blue-400",
    suggestedCategories: ["learning"],
    suggestedDescription: "Prepare for upcoming examination with structured study plan, practice tests, and revision schedule.",
    suggestedStatus: "not_started",
  },
  {
    id: "portfolio",
    title: "Portfolio Building",
    icon: Briefcase,
    iconBg: "bg-gradient-to-br from-purple-100 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30",
    iconColor: "text-purple-600 dark:text-purple-400",
    suggestedCategories: ["career"],
    suggestedDescription: "Build a professional portfolio showcasing projects, skills, and achievements.",
    suggestedStatus: "not_started",
  },
  {
    id: "fitness",
    title: "Fitness Goal",
    icon: Heart,
    iconBg: "bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/30",
    iconColor: "text-rose-600 dark:text-rose-400",
    suggestedCategories: ["health"],
    suggestedDescription: "Achieve fitness milestone with regular workouts, nutrition tracking, and progress monitoring.",
    suggestedStatus: "not_started",
  },
  {
    id: "learning",
    title: "Learning Path",
    icon: BookOpen,
    iconBg: "bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30",
    iconColor: "text-amber-600 dark:text-amber-400",
    suggestedCategories: ["learning"],
    suggestedDescription: "Master new skills through structured courses, practice exercises, and knowledge application.",
    suggestedStatus: "not_started",
  },
];

// ============================================
// Helper Functions
// ============================================

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const getProgressColor = (progress: number): string => {
  if (progress < 33) return "stroke-red-500";
  if (progress < 66) return "stroke-amber-500";
  return "stroke-green-500";
};

const getProgressGradientId = (progress: number): string => {
  if (progress < 33) return "progress-gradient-red";
  if (progress < 66) return "progress-gradient-amber";
  return "progress-gradient-green";
};

const getTimeIndicatorInfo = (targetDate?: string): { text: string; color: string; urgent: boolean } | null => {
  if (!targetDate) return null;
  
  const target = new Date(targetDate);
  const today = new Date();
  const days = differenceInDays(target, today);
  
  if (isPast(target) && !isToday(target)) {
    const overdue = Math.abs(days);
    return {
      text: `Overdue by ${overdue} day${overdue !== 1 ? "s" : ""}`,
      color: "text-red-500 dark:text-red-400",
      urgent: true,
    };
  }
  
  if (isToday(target)) {
    return {
      text: "Due today!",
      color: "text-amber-500 dark:text-amber-400",
      urgent: true,
    };
  }
  
  if (days <= 3) {
    return {
      text: `${days} day${days !== 1 ? "s" : ""} left`,
      color: "text-amber-500 dark:text-amber-400",
      urgent: true,
    };
  }
  
  if (days <= 7) {
    return {
      text: `${days} days left`,
      color: "text-yellow-600 dark:text-yellow-400",
      urgent: false,
    };
  }
  
  return {
    text: `${days} days left`,
    color: "text-green-500 dark:text-green-400",
    urgent: false,
  };
};

// ============================================
// Components
// ============================================

function CircularProgressRing({ 
  progress, 
  size = 56, 
  strokeWidth = 4,
}: { 
  progress: number; 
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  const center = size / 2;
  const [animatedOffset, setAnimatedOffset] = useState(circumference);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  
  useEffect(() => {
    // Animate offset from full circumference to target offset
    let animationFrame: number;
    const duration = 800;
    const startTime = Date.now();
    const startOffset = animatedOffset;
    const targetOffset = offset;
    const startProgress = animatedProgress;
    const targetProgress = progress;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const ratio = Math.min(elapsed / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - ratio, 4);
      
      setAnimatedOffset(startOffset + (targetOffset - startOffset) * easeOutQuart);
      setAnimatedProgress(Math.round(startProgress + (targetProgress - startProgress) * easeOutQuart));
      
      if (ratio < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    
    return () => cancelAnimationFrame(animationFrame);
  }, [progress, circumference]);
  
  const gradientId = getProgressGradientId(progress);
  const isComplete = progress === 100;
  
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 transform">
        {/* Gradient definitions */}
        <defs>
          <linearGradient id="progress-gradient-red" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#f87171" />
          </linearGradient>
          <linearGradient id="progress-gradient-amber" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
          <linearGradient id="progress-gradient-green" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#4ade80" />
          </linearGradient>
          
          {/* Glow filter for completed goals */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        
        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animatedOffset}
          className={cn(
            isComplete && "drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]"
          )}
          style={{
            filter: isComplete ? "url(#glow)" : undefined,
          }}
        />
      </svg>
      
      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn(
          "text-sm font-semibold tabular-nums",
          isComplete ? "text-green-500 dark:text-green-400" : "text-foreground"
        )}>
          {animatedProgress}%
        </span>
      </div>
      
      {/* Complete celebration sparkle */}
      {isComplete && (
        <div className="absolute -top-1 -right-1">
          <Sparkles className="h-4 w-4 text-green-500 animate-pulse" />
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: GoalStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant={config.variant} className="text-xs">
      {config.label}
    </Badge>
  );
}

function StatusDot({ status }: { status: GoalStatus }) {
  const config = STATUS_DOT_CONFIG[status];
  return (
    <span 
      className={cn(
        "relative flex h-2.5 w-2.5 rounded-full",
        config.color,
      )}
    >
      {config.pulse && (
        <span className={cn(
          "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
          config.color
        )} />
      )}
    </span>
  );
}

function CategoryTags({ categories }: { categories: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {categories.map((category) => {
        const option = CATEGORY_OPTIONS.find((opt) => opt.value === category);
        if (!option) return null;
        return (
          <Badge
            key={category}
            variant="outline"
            className="text-xs font-normal"
          >
            {option.label}
          </Badge>
        );
      })}
    </div>
  );
}

function TimeIndicator({ targetDate }: { targetDate?: string }) {
  const info = getTimeIndicatorInfo(targetDate);
  if (!info) return null;
  
  return (
    <div className={cn(
      "flex items-center gap-1.5 text-xs font-medium",
      info.color,
      info.urgent && "animate-pulse"
    )}>
      <Calendar className="h-3 w-3" />
      <span>{info.text}</span>
    </div>
  );
}

function GoalTemplateCard({ 
  template, 
  onClick 
}: { 
  template: GoalTemplate;
  onClick: () => void;
}) {
  const Icon = template.icon;
  
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
    >
      <div className={cn("p-3 rounded-xl", template.iconBg)}>
        <Icon className={cn("h-6 w-6", template.iconColor)} />
      </div>
      <span className="text-sm font-medium text-center">{template.title}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

function GoalModal({
  open,
  onOpenChange,
  goal,
  onSave,
  prefillData,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal | null;
  onSave: (data: GoalFormData) => void;
  prefillData?: Partial<GoalFormData>;
}) {
  // Compute form data from props
  const getInitialFormData = (): GoalFormData => ({
    title: goal?.title || prefillData?.title || "",
    description: goal?.description || prefillData?.description || "",
    categories: goal?.categories || prefillData?.categories || [],
    targetDate: goal?.targetDate ? new Date(goal.targetDate) : prefillData?.targetDate,
    status: goal?.status || prefillData?.status || "not_started",
    progress: goal?.progress || prefillData?.progress || 0,
  });

  const [formData, setFormData] = useState<GoalFormData>(getInitialFormData);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    onSave(formData);
    onOpenChange(false);
  };

  const toggleCategory = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{goal ? "Edit Goal" : "Add New Goal"}</DialogTitle>
            <DialogDescription>
              {goal
                ? "Update your goal details below."
                : "Create a new goal to track your progress."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="What do you want to achieve?"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Add more details about your goal..."
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label>Categories</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={
                      formData.categories.includes(option.value)
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => toggleCategory(option.value)}
                    className="text-xs"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Target Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !formData.targetDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {formData.targetDate
                        ? format(formData.targetDate, "PPP")
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={formData.targetDate}
                      onSelect={(date) =>
                        setFormData((prev) => ({ ...prev, targetDate: date }))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: GoalStatus) =>
                    setFormData((prev) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Progress: {formData.progress}%</Label>
              <input
                type="range"
                min="0"
                max="100"
                value={formData.progress}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    progress: parseInt(e.target.value),
                  }))
                }
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-violet-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.title.trim()}>
              {goal ? "Save Changes" : "Create Goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GoalCard({
  goal,
  onEdit,
  onDelete,
}: {
  goal: Goal;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const categoryBorderClass = goal.categories[0]
    ? CATEGORY_OPTIONS.find((opt) => opt.value === goal.categories[0])?.borderColor
    : "";
  
  const isCompleted = goal.status === "completed";
  const isPaused = goal.status === "on_hold";
  
  return (
    <Card 
      className={cn(
        "group relative hover:shadow-lg transition-all duration-300",
        "hover:-translate-y-1 hover:border-violet-200 dark:hover:border-violet-800",
        categoryBorderClass,
        "border-l-4",
        isCompleted && "bg-green-50/50 dark:bg-green-950/20",
        isPaused && "opacity-75"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <StatusDot status={goal.status} />
            <CardTitle className={cn(
              "text-base font-semibold line-clamp-2 flex-1",
              isCompleted && "line-through text-muted-foreground"
            )}>
              {goal.title}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {goal.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {goal.description}
          </p>
        )}
        
        <div className="flex items-center justify-between gap-4">
          <CircularProgressRing progress={goal.progress} size={56} strokeWidth={4} />
          
          <div className="flex-1 space-y-2">
            {goal.targetDate && <TimeIndicator targetDate={goal.targetDate} />}
            {goal.categories.length > 0 && <CategoryTags categories={goal.categories} />}
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0 border-t">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit2 className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button variant="ghost" size="sm">
            <ListTodo className="h-3 w-3 mr-1" />
            Tasks
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

function EmptyState({ onSelectTemplate }: { onSelectTemplate: (template: GoalTemplate) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      {/* Illustration placeholder */}
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center">
          <Rocket className="h-12 w-12 text-violet-500 dark:text-violet-400" />
        </div>
        <div className="absolute -top-1 -right-1">
          <Sparkles className="h-6 w-6 text-amber-500 animate-bounce" />
        </div>
      </div>
      
      {/* Motivational message */}
      <h3 className="text-xl font-bold mb-2">Ready to achieve greatness?</h3>
      <p className="text-muted-foreground text-center max-w-md mb-8">
        Every big achievement starts with a single goal. Choose a template below or create your own custom goal to begin your journey.
      </p>
      
      {/* Template suggestions */}
      <div className="w-full max-w-2xl">
        <p className="text-sm font-medium text-muted-foreground mb-4 text-center">
          Start with a template
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {GOAL_TEMPLATES.map((template) => (
            <GoalTemplateCard
              key={template.id}
              template={template}
              onClick={() => onSelectTemplate(template)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export default function GoalsView() {
  const { goals, addGoal, updateGoal, deleteGoal } = useLifeOSStore();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [prefillData, setPrefillData] = useState<Partial<GoalFormData> | undefined>(undefined);

  const filteredGoals = useMemo(() => {
    switch (activeTab) {
      case "active":
        return goals.filter((g) => g.status === "in_progress" || g.status === "not_started");
      case "completed":
        return goals.filter((g) => g.status === "completed");
      case "on_hold":
        return goals.filter((g) => g.status === "on_hold");
      default:
        return goals;
    }
  }, [goals, activeTab]);

  const tabs: { value: FilterTab; label: string }[] = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "completed", label: "Completed" },
    { value: "on_hold", label: "On Hold" },
  ];

  const handleOpenModal = (goal?: Goal) => {
    setEditingGoal(goal || null);
    setPrefillData(undefined);
    setModalOpen(true);
  };

  const handleSelectTemplate = (template: GoalTemplate) => {
    setEditingGoal(null);
    setPrefillData({
      title: template.title,
      description: template.suggestedDescription,
      categories: template.suggestedCategories,
      status: template.suggestedStatus,
    });
    setModalOpen(true);
  };

  const handleSaveGoal = (data: GoalFormData) => {
    if (editingGoal) {
      updateGoal(editingGoal.id, {
        title: data.title,
        description: data.description,
        categories: data.categories,
        targetDate: data.targetDate?.toISOString(),
        status: data.status,
        progress: data.progress,
      });
    } else {
      const newGoal: Goal = {
        id: generateId(),
        userId: "user_1",
        title: data.title,
        description: data.description,
        categories: data.categories,
        targetDate: data.targetDate?.toISOString(),
        status: data.status,
        progress: data.progress,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addGoal(newGoal);
    }
    setEditingGoal(null);
    setPrefillData(undefined);
  };

  const handleDeleteGoal = (id: string) => {
    deleteGoal(id);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Goals</h1>
          <p className="text-muted-foreground text-sm">
            Track your long-term aspirations and measure progress
          </p>
        </div>
        <Button onClick={() => handleOpenModal()} className="bg-violet-600 hover:bg-violet-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Goal
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit">
        {tabs.map((tab) => (
          <Button
            key={tab.value}
            variant={activeTab === tab.value ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "transition-all",
              activeTab === tab.value && "bg-background shadow-sm"
            )}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Goals Grid */}
      {filteredGoals.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={() => handleOpenModal(goal)}
              onDelete={() => handleDeleteGoal(goal.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState onSelectTemplate={handleSelectTemplate} />
      )}

      {/* Add/Edit Goal Modal */}
      <GoalModal
        key={`${editingGoal?.id || 'new'}-${prefillData?.title || ''}`}
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) {
            setEditingGoal(null);
            setPrefillData(undefined);
          }
        }}
        goal={editingGoal}
        prefillData={prefillData}
        onSave={handleSaveGoal}
      />
    </div>
  );
}

export { GoalsView };
