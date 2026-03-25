"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  format,
  startOfWeek,
  addDays,
  isToday,
  isSameDay,
  subWeeks,
  addWeeks,
  isPast,
  isFuture,
} from "date-fns";
import {
  Flame,
  Plus,
  ChevronLeft,
  ChevronRight,
  Check,
  Dumbbell,
  BookOpen,
  Droplet,
  Moon,
  Heart,
  Coffee,
  Utensils,
  Brain,
  Zap,
  AlertCircle,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useLifeOSStore,
  type Habit,
  type HabitLog,
  type HabitFrequency,
} from "@/lib/store";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

// ============================================
// Types & Constants
// ============================================

const HABIT_COLORS = [
  { value: "#ef4444", label: "Red" },
  { value: "#f97316", label: "Orange" },
  { value: "#eab308", label: "Yellow" },
  { value: "#22c55e", label: "Green" },
  { value: "#14b8a6", label: "Teal" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#ec4899", label: "Pink" },
];

const HABIT_ICONS: { value: string; icon: LucideIcon; label: string }[] = [
  { value: "dumbbell", icon: Dumbbell, label: "Exercise" },
  { value: "book", icon: BookOpen, label: "Reading" },
  { value: "droplet", icon: Droplet, label: "Water" },
  { value: "moon", icon: Moon, label: "Sleep" },
  { value: "heart", icon: Heart, label: "Health" },
  { value: "coffee", icon: Coffee, label: "Coffee" },
  { value: "utensils", icon: Utensils, label: "Diet" },
  { value: "brain", icon: Brain, label: "Learning" },
  { value: "zap", icon: Zap, label: "Energy" },
];

const SAMPLE_HABITS = [
  { name: "Morning Workout", icon: "dumbbell", color: "#22c55e", description: "30 min exercise every morning" },
  { name: "Read 20 pages", icon: "book", color: "#3b82f6", description: "Daily reading habit" },
  { name: "Drink 8 glasses", icon: "droplet", color: "#14b8a6", description: "Stay hydrated throughout the day" },
  { name: "Meditate", icon: "brain", color: "#8b5cf6", description: "10 minutes of mindfulness" },
  { name: "Sleep by 11pm", icon: "moon", color: "#ec4899", description: "Consistent sleep schedule" },
];

// ============================================
// Helper Functions
// ============================================

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const getHabitIcon = (iconName?: string): LucideIcon => {
  const found = HABIT_ICONS.find((i) => i.value === iconName);
  return found?.icon || Zap;
};

const getWeekDays = (date: Date): Date[] => {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
};

const calculateStreak = (habitId: string, logs: HabitLog[]): number => {
  const habitLogs = logs
    .filter((l) => l.habitId === habitId && l.completed)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (habitLogs.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < habitLogs.length; i++) {
    const logDate = new Date(habitLogs[i].date);
    logDate.setHours(0, 0, 0, 0);

    const expectedDate = new Date(today);
    expectedDate.setDate(expectedDate.getDate() - i);

    if (isSameDay(logDate, expectedDate)) {
      streak++;
    } else if (i === 0 && logDate < expectedDate) {
      expectedDate.setDate(expectedDate.getDate() - 1);
      if (isSameDay(logDate, expectedDate)) {
        streak++;
      } else {
        break;
      }
    } else {
      break;
    }
  }

  return streak;
};

const calculateCompletionRate = (habitId: string, logs: HabitLog[], days: number = 7): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let completed = 0;
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const log = logs.find(
      (l) => l.habitId === habitId && isSameDay(new Date(l.date), date)
    );
    if (log?.completed) completed++;
  }
  
  return Math.round((completed / days) * 100);
};

const getLast7DaysData = (habitId: string, logs: HabitLog[]): boolean[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const data: boolean[] = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const log = logs.find(
      (l) => l.habitId === habitId && isSameDay(new Date(l.date), date)
    );
    data.push(log?.completed || false);
  }
  
  return data;
};

const getStreakColor = (streak: number): string => {
  if (streak >= 14) return "from-red-500 to-orange-500";
  if (streak >= 7) return "from-orange-500 to-yellow-500";
  return "from-orange-400 to-orange-500";
};

// ============================================
// Components
// ============================================

interface HabitFormData {
  name: string;
  description: string;
  frequency: HabitFrequency;
  color: string;
  icon: string;
}

// Animated Checkmark SVG
function AnimatedCheckmark({ color }: { color: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="M5 12l5 5L20 7"
        className="animate-checkmark-draw"
        stroke="white"
      />
    </svg>
  );
}

// Ripple effect component
function Ripple({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <span
      className="habit-ripple"
      style={{
        left: x - 10,
        top: y - 10,
        width: 20,
        height: 20,
        backgroundColor: color,
      }}
    />
  );
}

// Sparkline mini chart component
function Sparkline({ data, color }: { data: boolean[]; color: string }) {
  return (
    <div className="flex items-end gap-0.5 h-4">
      {data.map((completed, i) => (
        <div
          key={i}
          className={cn(
            "w-1.5 rounded-sm transition-all animate-sparkline",
            completed ? "opacity-100" : "opacity-30"
          )}
          style={{
            backgroundColor: color,
            height: completed ? "100%" : "30%",
            animationDelay: `${i * 50}ms`,
          }}
        />
      ))}
    </div>
  );
}

// Habit Day Cell Component
function HabitDayCell({
  day,
  habitColor,
  completed,
  isMissed,
  onToggle,
  justCompleted,
}: {
  day: Date;
  habitColor: string;
  completed: boolean;
  isMissed: boolean;
  onToggle: (e: React.MouseEvent) => void;
  justCompleted: boolean;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const isDayFuture = isFuture(day);
  const isDayToday = isToday(day);
  
  const handleClick = (e: React.MouseEvent) => {
    if (isDayFuture) return;
    
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = Date.now();
      setRipples((prev) => [...prev, { id, x, y }]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 600);
    }
    
    onToggle(e);
  };
  
  return (
    <button
      ref={buttonRef}
      onClick={handleClick}
      disabled={isDayFuture}
      className={cn(
        "relative w-9 h-9 rounded-lg flex items-center justify-center text-xs font-medium transition-all overflow-hidden",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400",
        // Future days
        isDayFuture && "opacity-40 cursor-not-allowed bg-muted/50",
        // Missed days (past, not completed)
        isMissed && !isDayFuture && "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 animate-missed-shake",
        // Completed days
        completed && "text-white",
        // Today
        isDayToday && !completed && "ring-2 ring-violet-400 ring-offset-1 animate-today-ring",
        // Default state
        !completed && !isMissed && !isDayFuture && "bg-muted hover:bg-muted/80",
        // Animation on completion
        justCompleted && "animate-habit-complete animate-color-pulse"
      )}
      style={completed ? { backgroundColor: habitColor } : undefined}
      title={format(day, "EEE, MMM d")}
    >
      {/* Ripple effects */}
      {ripples.map((ripple) => (
        <Ripple key={ripple.id} x={ripple.x} y={ripple.y} color={completed ? habitColor : "#8b5cf6"} />
      ))}
      
      {/* Content */}
      {completed ? (
        justCompleted ? (
          <AnimatedCheckmark color="white" />
        ) : (
          <Check className="h-4 w-4" />
        )
      ) : isMissed && !isDayFuture ? (
        <AlertCircle className="h-3.5 w-3.5 text-red-400" />
      ) : (
        format(day, "d")
      )}
    </button>
  );
}

// Streak Badge Component
function StreakBadge({ streak }: { streak: number }) {
  if (streak === 0) return null;
  
  const scale = Math.min(1 + (streak - 1) * 0.05, 1.5);
  const isHighStreak = streak >= 7;
  
  return (
    <div className="flex items-center gap-1.5">
      <Badge
        variant="secondary"
        className={cn(
          "flex items-center gap-1 transition-all",
          isHighStreak
            ? `bg-gradient-to-r ${getStreakColor(streak)} text-white border-0`
            : "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200"
        )}
        style={{ transform: `scale(${scale})` }}
      >
        <Flame
          className={cn(
            "h-3 w-3",
            isHighStreak && "animate-flame-glow"
          )}
        />
        {streak}
      </Badge>
      {isHighStreak && (
        <Badge
          variant="outline"
          className="text-xs bg-gradient-to-r from-amber-100 to-orange-100 text-orange-700 border-orange-200 dark:from-amber-900 dark:to-orange-900 dark:text-orange-200 dark:border-orange-700 animate-badge-pop"
        >
          <Sparkles className="h-3 w-3 mr-1" />
          Week streak!
        </Badge>
      )}
    </div>
  );
}

function HabitModal({
  open,
  onOpenChange,
  habit,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habit?: Habit | null;
  onSave: (data: HabitFormData) => void;
}) {
  // Get initial form data based on habit
  const getInitialFormData = useCallback((): HabitFormData => ({
    name: habit?.name || "",
    description: habit?.description || "",
    frequency: habit?.frequency || "daily",
    color: habit?.color || "#8b5cf6",
    icon: habit?.icon || "zap",
  }), [habit]);
  
  const [formData, setFormData] = useState<HabitFormData>(getInitialFormData);
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);
  const [prevOpen, setPrevOpen] = useState(open);
  
  // Reset form when modal opens
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setFormData(getInitialFormData());
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSave(formData);
    onOpenChange(false);
  };
  
  // Preview color for the habit
  const previewColor = hoveredColor || formData.color;
  const previewIconName = hoveredIcon || formData.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{habit ? "Edit Habit" : "Add New Habit"}</DialogTitle>
            <DialogDescription>
              {habit
                ? "Update your habit details below."
                : "Create a new habit to track daily progress."}
            </DialogDescription>
          </DialogHeader>
          
          {/* Preview Card */}
          <div className="my-4 p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
                style={{ backgroundColor: previewColor + "20" }}
              >
                <HabitIcon iconName={previewIconName} color={previewColor} />
              </div>
              <div className="flex-1">
                <div className="font-medium">
                  {formData.name || "Habit Name"}
                </div>
                <div className="text-xs text-muted-foreground capitalize">
                  {formData.frequency}
                </div>
              </div>
              <Sparkline
                data={[true, false, true, true, false, true, true]}
                color={previewColor}
              />
            </div>
          </div>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Habit Name</Label>
              <Input
                id="name"
                placeholder="e.g., Exercise, Read, Meditate"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Add more details..."
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={2}
              />
            </div>
            <div className="grid gap-2">
              <Label>Frequency</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value: HabitFrequency) =>
                  setFormData((prev) => ({ ...prev, frequency: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Animated Color Picker */}
            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {HABIT_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, color: color.value }))
                    }
                    onMouseEnter={() => setHoveredColor(color.value)}
                    onMouseLeave={() => setHoveredColor(null)}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all duration-200",
                      "hover:scale-110 hover:ring-2 hover:ring-offset-2",
                      formData.color === color.value
                        ? "ring-2 ring-foreground scale-110"
                        : "ring-transparent"
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
            
            {/* Animated Icon Picker */}
            <div className="grid gap-2">
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-2">
                {HABIT_ICONS.map((icon) => {
                  const Icon = icon.icon;
                  return (
                    <button
                      key={icon.value}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, icon: icon.value }))
                      }
                      onMouseEnter={() => setHoveredIcon(icon.value)}
                      onMouseLeave={() => setHoveredIcon(null)}
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 border",
                        "animate-icon-bounce",
                        formData.icon === icon.value
                          ? "border-violet-500 bg-violet-50 dark:bg-violet-950 shadow-md"
                          : "border-muted hover:border-violet-300 hover:shadow"
                      )}
                      title={icon.label}
                    >
                      <Icon className="h-5 w-5" />
                    </button>
                  );
                })}
              </div>
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
            <Button type="submit" disabled={!formData.name.trim()}>
              {habit ? "Save Changes" : "Create Habit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function HabitIcon({ iconName, color }: { iconName?: string; color: string }) {
  const iconData = HABIT_ICONS.find((i) => i.value === iconName);
  const IconComponent = iconData?.icon || Zap;
  return (
    <IconComponent 
      className="h-5 w-5" 
      style={{ color }} 
    />
  );
}

function HabitRow({
  habit,
  weekDays,
  logs,
  onToggleDay,
  onEdit,
  index,
}: {
  habit: Habit;
  weekDays: Date[];
  logs: HabitLog[];
  onToggleDay: (date: Date) => void;
  onEdit: () => void;
  index: number;
}) {
  const streak = calculateStreak(habit.id, logs);
  const completionRate = calculateCompletionRate(habit.id, logs);
  const last7Days = getLast7DaysData(habit.id, logs);
  
  // Track which day was just completed for animation
  const [justCompletedDay, setJustCompletedDay] = useState<string | null>(null);
  
  const handleToggleDay = useCallback((date: Date) => {
    setJustCompletedDay(date.toISOString());
    onToggleDay(date);
    
    // Clear the animation state after animation completes
    setTimeout(() => {
      setJustCompletedDay(null);
    }, 600);
  }, [onToggleDay]);

  const getLogForDate = (date: Date): HabitLog | undefined => {
    return logs.find(
      (l) => l.habitId === habit.id && isSameDay(new Date(l.date), date)
    );
  };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div
      className={cn(
        "flex items-center gap-4 py-3 px-4 rounded-lg transition-all group",
        "hover:bg-violet-50/50 dark:hover:bg-violet-950/20",
        "animate-slide-in-row"
      )}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Habit Info */}
      <div className="flex items-center gap-3 min-w-[180px]">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105"
          style={{ backgroundColor: habit.color + "20" }}
        >
          <HabitIcon iconName={habit.icon} color={habit.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors">
            {habit.name}
          </div>
          <div className="text-xs text-muted-foreground capitalize flex items-center gap-2">
            {habit.frequency}
            <span className="text-violet-500 dark:text-violet-400">
              {completionRate}% rate
            </span>
          </div>
        </div>
      </div>

      {/* Week Days */}
      <div className="flex items-center gap-2 flex-1 justify-center">
        {weekDays.map((day) => {
          const log = getLogForDate(day);
          const completed = log?.completed || false;
          const isDayFuture = isFuture(day);
          const isDayPast = isPast(day) && !isToday(day);
          const isMissed = isDayPast && !completed;
          const justCompleted = justCompletedDay === day.toISOString();

          return (
            <HabitDayCell
              key={day.toISOString()}
              day={day}
              habitColor={habit.color}
              completed={completed}
              isMissed={isMissed}
              onToggle={() => handleToggleDay(day)}
              justCompleted={justCompleted}
            />
          );
        })}
      </div>

      {/* Streak & Completion */}
      <div className="flex items-center gap-3 min-w-[140px] justify-end">
        {/* Sparkline */}
        <Sparkline data={last7Days} color={habit.color} />
        
        {/* Streak Badge */}
        <StreakBadge streak={streak} />
        
        {/* Edit Button */}
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onEdit}
        >
          Edit
        </Button>
      </div>
    </div>
  );
}

function EmptyState({ onAddSampleHabit }: { onAddSampleHabit: (sample: typeof SAMPLE_HABITS[0]) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-100 to-violet-50 dark:from-violet-900/50 dark:to-violet-800/30 flex items-center justify-center mb-4">
        <Flame className="h-8 w-8 text-violet-500" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Start Your Journey</h3>
      <p className="text-muted-foreground text-sm max-w-sm mb-6">
        Build better habits one day at a time. Track your progress and celebrate your streaks!
      </p>
      
      {/* Sample Habits */}
      <div className="w-full max-w-md">
        <p className="text-xs text-muted-foreground mb-3">Quick start ideas:</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {SAMPLE_HABITS.map((sample) => {
            const Icon = getHabitIcon(sample.icon);
            return (
              <button
                key={sample.name}
                onClick={() => onAddSampleHabit(sample)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border border-muted",
                  "bg-background hover:border-violet-300 hover:bg-violet-50/50",
                  "dark:hover:border-violet-700 dark:hover:bg-violet-950/30",
                  "transition-all duration-200 text-sm",
                  "animate-icon-bounce"
                )}
                style={{ borderColor: sample.color + "30" }}
              >
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ backgroundColor: sample.color + "20" }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: sample.color }} />
                </div>
                <span>{sample.name}</span>
                <Plus className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export default function HabitsView() {
  const { habits, habitLogs, addHabit, updateHabit, addHabitLog, updateHabitLog, deleteHabitLog } =
    useLifeOSStore();
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  const weekDays = useMemo(() => getWeekDays(currentWeekStart), [currentWeekStart]);

  const activeHabits = useMemo(() => {
    return habits.filter((h) => h.isActive);
  }, [habits]);

  const handlePrevWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const handleOpenModal = (habit?: Habit) => {
    setEditingHabit(habit || null);
    setModalOpen(true);
  };

  const handleSaveHabit = (data: HabitFormData) => {
    if (editingHabit) {
      updateHabit(editingHabit.id, {
        name: data.name,
        description: data.description,
        frequency: data.frequency,
        color: data.color,
        icon: data.icon,
      });
    } else {
      const newHabit: Habit = {
        id: generateId(),
        userId: "user_1",
        name: data.name,
        description: data.description,
        frequency: data.frequency,
        targetCount: 1,
        color: data.color,
        icon: data.icon,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addHabit(newHabit);
    }
    setEditingHabit(null);
  };
  
  const handleAddSampleHabit = (sample: typeof SAMPLE_HABITS[0]) => {
    const newHabit: Habit = {
      id: generateId(),
      userId: "user_1",
      name: sample.name,
      description: sample.description,
      frequency: "daily",
      targetCount: 1,
      color: sample.color,
      icon: sample.icon,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addHabit(newHabit);
  };

  const handleToggleDay = (habitId: string, date: Date) => {
    const existingLog = habitLogs.find(
      (l) => l.habitId === habitId && isSameDay(new Date(l.date), date)
    );

    if (existingLog) {
      if (existingLog.completed) {
        deleteHabitLog(existingLog.id);
      } else {
        updateHabitLog(existingLog.id, { completed: true });
      }
    } else {
      const newLog: HabitLog = {
        id: generateId(),
        habitId,
        userId: "user_1",
        date: date.toISOString(),
        completed: true,
        count: 1,
        createdAt: new Date().toISOString(),
      };
      addHabitLog(newLog);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Habits</h1>
          <p className="text-muted-foreground text-sm">
            Build consistency with daily and weekly habits
          </p>
        </div>
        <Button onClick={() => handleOpenModal()} className="bg-violet-600 hover:bg-violet-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Habit
        </Button>
      </div>

      {/* Week Navigation */}
      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={handlePrevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-base font-medium">
              {format(weekDays[0], "MMM d")} - {format(weekDays[6], "MMM d, yyyy")}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={handleNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Day Headers */}
          <div className="flex items-center gap-4 mb-2 px-4">
            <div className="min-w-[180px]" />
            <div className="flex items-center gap-2 flex-1 justify-center">
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "w-9 h-6 flex items-center justify-center text-xs font-medium",
                    isToday(day)
                      ? "text-violet-600 dark:text-violet-400 font-semibold"
                      : "text-muted-foreground"
                  )}
                >
                  {format(day, "EEE")}
                </div>
              ))}
            </div>
            <div className="min-w-[140px]" />
          </div>

          {/* Habits List */}
          {activeHabits.length > 0 ? (
            <div className="space-y-1">
              {activeHabits.map((habit, index) => (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  weekDays={weekDays}
                  logs={habitLogs}
                  onToggleDay={(date) => handleToggleDay(habit.id, date)}
                  onEdit={() => handleOpenModal(habit)}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <EmptyState onAddSampleHabit={handleAddSampleHabit} />
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Habit Modal */}
      <HabitModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditingHabit(null);
        }}
        habit={editingHabit}
        onSave={handleSaveHabit}
      />
    </div>
  );
}

export { HabitsView };
