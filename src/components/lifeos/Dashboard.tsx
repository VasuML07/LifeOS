"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import {
  Target,
  Sparkles,
  CheckCircle2,
  Flame,
  TrendingUp,
  TrendingDown,
  Clock,
  Plus,
  Timer,
  FileText,
  CheckSquare,
  Edit3,
  X,
  Check,
  Zap,
  ArrowRight,
  Minus,
  Pause,
  Play,
  Square,
  Calendar,
  Flag,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useLifeOSStore, useTasks, useGoals, useHabits, useHabitLogs, useCurrentUser, Task, Habit, Note } from "@/lib/store";

// ============================================
// Helper Functions
// ============================================

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Good night";
}

function formatDateNicely(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return now.toLocaleDateString("en-US", options);
}

function getMotivationalTagline(): string {
  const taglines = [
    "Make today count.",
    "Every step forward is progress.",
    "Your potential is limitless.",
    "Focus on what matters most.",
    "Small steps, big achievements.",
    "Today is a fresh start.",
    "Embrace the journey.",
    "Progress over perfection.",
  ];
  return taglines[Math.floor(Math.random() * taglines.length)];
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// ============================================
// Custom Hooks
// ============================================

/**
 * Hook for count-up animation from 0 to target value
 */
function useCountUp(targetValue: number, duration: number = 1000, enabled: boolean = true) {
  const [displayValue, setDisplayValue] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const targetValueRef = useRef(targetValue);
  
  useEffect(() => {
    targetValueRef.current = targetValue;
  }, [targetValue]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(easeOut * targetValueRef.current);
      
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      startTimeRef.current = null;
    };
  }, [duration, enabled]);

  return enabled ? displayValue : targetValue;
}

// ============================================
// Types
// ============================================

interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  variant?: "default" | "outline" | "ghost";
  shortcut?: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  progress?: number;
  delay?: number;
}

interface AISuggestion {
  action: string;
  reason: string;
  type: "task" | "goal" | "habit" | "planning";
  badges?: { label: string; variant?: "default" | "secondary" | "outline" }[];
}

type ModalType = "add-task" | "focus-session" | "quick-note" | "log-habit" | null;

// ============================================
// Pulsing Dot Indicator
// ============================================

function PulsingDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex h-2.5 w-2.5", className)}>
      <span className="absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75 animate-ping" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-500" />
    </span>
  );
}

// ============================================
// Sub-Components
// ============================================

function QuickAction({ icon, label, onClick, variant = "outline", shortcut }: QuickActionProps) {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setRipples((prev) => [...prev, { id: Date.now(), x, y }]);
      setTimeout(() => {
        setRipples((prev) => prev.slice(1));
      }, 600);
    }
    onClick?.();
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            ref={buttonRef}
            variant={variant}
            className="h-auto flex-col gap-2 py-4 px-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:bg-violet-50 dark:hover:bg-violet-950/30 relative overflow-hidden group/btn"
            onClick={handleClick}
          >
            {ripples.map((ripple) => (
              <span
                key={ripple.id}
                className="absolute rounded-full bg-violet-400/30 pointer-events-none"
                style={{
                  left: ripple.x - 10,
                  top: ripple.y - 10,
                  width: 20,
                  height: 20,
                  animation: "ripple 0.6s ease-out forwards",
                }}
              />
            ))}
            <motion.span
              className="transition-transform duration-200"
              whileHover={{ scale: 1.15 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              {icon}
            </motion.span>
            <span className="text-sm font-medium">{label}</span>
          </Button>
        </TooltipTrigger>
        {shortcut && (
          <TooltipContent side="bottom">
            <p className="text-xs">
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                {shortcut}
              </kbd>
            </p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

function StatCard({ title, value, subtitle, icon, trend, trendValue, progress, delay = 0 }: StatCardProps) {
  const numericValue = typeof value === "number" ? value : parseInt(value) || 0;
  const animatedValue = useCountUp(numericValue, 1200);
  const [progressWidth, setProgressWidth] = useState(0);

  useEffect(() => {
    if (progress !== undefined) {
      const timer = setTimeout(() => setProgressWidth(progress), delay + 200);
      return () => clearTimeout(timer);
    }
  }, [progress, delay]);

  const trendColors = {
    up: "text-emerald-600 dark:text-emerald-400",
    down: "text-rose-600 dark:text-rose-400",
    neutral: "text-muted-foreground",
  };

  const trendIcons = {
    up: TrendingUp,
    down: TrendingDown,
    neutral: Minus,
  };

  const TrendIcon = trend ? trendIcons[trend] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay / 1000 }}
    >
      <Card className="group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute inset-0 rounded-lg border border-transparent group-hover:border-violet-500/20 transition-colors duration-300" />
        
        <CardContent className="p-4 relative">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-2xl font-semibold tracking-tight">
                {typeof value === "number" ? animatedValue : value}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">{subtitle}</p>
                {trend && trendValue && TrendIcon && (
                  <span className={cn("flex items-center gap-0.5 text-xs font-medium", trendColors[trend])}>
                    <TrendIcon className="h-3 w-3" />
                    {trendValue}
                  </span>
                )}
              </div>
            </div>
            <motion.div 
              className="rounded-lg bg-violet-100 p-2 text-violet-600 dark:bg-violet-950 dark:text-violet-400"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              {icon}
            </motion.div>
          </div>
          {progress !== undefined && (
            <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-violet-500"
                initial={{ width: 0 }}
                animate={{ width: `${progressWidth}%` }}
                transition={{ duration: 1, delay: delay / 1000 + 0.2, ease: "easeOut" }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================
// Add Task Modal Component
// ============================================

interface AddTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTask: (task: Task) => void;
  userId: string;
}

function AddTaskModal({ open, onOpenChange, onAddTask, userId }: AddTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!title.trim()) return;
    
    setIsSubmitting(true);
    const now = new Date().toISOString();
    const newTask: Task = {
      id: `task-${Date.now()}`,
      userId,
      title: title.trim(),
      description: description.trim() || undefined,
      status: "todo",
      priority,
      tags: [],
      createdAt: now,
      updatedAt: now,
    };
    
    onAddTask(newTask);
    
    // Reset form
    setTimeout(() => {
      setTitle("");
      setDescription("");
      setPriority("medium");
      setIsSubmitting(false);
      onOpenChange(false);
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-violet-600" />
            Add New Task
          </DialogTitle>
          <DialogDescription>
            Create a new task to track your progress.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="task-title" className="text-sm font-medium">
              Task Title
            </label>
            <Input
              id="task-title"
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="task-description" className="text-sm font-medium">
              Description (optional)
            </label>
            <Textarea
              id="task-description"
              placeholder="Add more details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Priority</label>
            <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">
                  <div className="flex items-center gap-2">
                    <Flag className="h-4 w-4 text-slate-400" />
                    Low
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div className="flex items-center gap-2">
                    <Flag className="h-4 w-4 text-blue-500" />
                    Medium
                  </div>
                </SelectItem>
                <SelectItem value="high">
                  <div className="flex items-center gap-2">
                    <Flag className="h-4 w-4 text-orange-500" />
                    High
                  </div>
                </SelectItem>
                <SelectItem value="urgent">
                  <div className="flex items-center gap-2">
                    <Flag className="h-4 w-4 text-red-500" />
                    Urgent
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!title.trim() || isSubmitting}
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Plus className="h-4 w-4" />
                </motion.div>
                Adding...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Add Task
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Focus Session Modal Component
// ============================================

interface FocusSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function FocusSessionModal({ open, onOpenChange }: FocusSessionModalProps) {
  const [duration, setDuration] = useState(25); // minutes
  const [timeLeft, setTimeLeft] = useState(25 * 60); // seconds
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const prevOpenRef = useRef(open);

  // Reset when modal closes - using separate effect pattern to avoid setState in effect
  useEffect(() => {
    if (prevOpenRef.current && !open) {
      // Modal just closed, cleanup
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    prevOpenRef.current = open;
  }, [open]);

  // Reset state when modal opens
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsRunning(false);
      setIsPaused(false);
      setSessionComplete(false);
      setTimeLeft(duration * 60);
    }
    onOpenChange(newOpen);
  }, [duration, onOpenChange]);

  // Timer logic
  useEffect(() => {
    if (isRunning && !isPaused && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setSessionComplete(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, isPaused, timeLeft]);

  const handleStart = () => {
    if (!isRunning) {
      setTimeLeft(duration * 60);
      setIsRunning(true);
      setIsPaused(false);
      setSessionComplete(false);
    }
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const handleStop = () => {
    setIsRunning(false);
    setIsPaused(false);
    setTimeLeft(duration * 60);
    setSessionComplete(false);
  };

  const progress = ((duration * 60 - timeLeft) / (duration * 60)) * 100;

  const durations = [15, 25, 45, 60];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-violet-600" />
            Focus Session
          </DialogTitle>
          <DialogDescription>
            Stay focused and productive with a timed session.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-6">
          {!isRunning ? (
            // Duration selection
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">Select session duration</p>
              <div className="grid grid-cols-4 gap-2">
                {durations.map((d) => (
                  <Button
                    key={d}
                    variant={duration === d ? "default" : "outline"}
                    onClick={() => {
                      setDuration(d);
                      setTimeLeft(d * 60);
                    }}
                    className="flex flex-col py-4"
                  >
                    <span className="text-lg font-bold">{d}</span>
                    <span className="text-xs">min</span>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            // Timer display
            <div className="flex flex-col items-center space-y-6">
              <motion.div 
                className="relative w-48 h-48"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    className="text-violet-500"
                    strokeDasharray={553}
                    strokeDashoffset={553 - (553 * progress) / 100}
                    style={{ transition: "stroke-dashoffset 1s linear" }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={cn(
                    "text-4xl font-mono font-bold",
                    timeLeft <= 60 && "text-red-500 animate-pulse"
                  )}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
              </motion.div>
              
              {isPaused && (
                <Badge variant="secondary" className="animate-pulse">
                  Paused
                </Badge>
              )}
            </div>
          )}
        </div>

        {sessionComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-4 bg-green-50 dark:bg-green-950/30 rounded-lg"
          >
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <p className="font-semibold text-green-700 dark:text-green-400">Session Complete!</p>
            <p className="text-sm text-green-600 dark:text-green-500">Great work! You focused for {duration} minutes.</p>
          </motion.div>
        )}

        <DialogFooter className="gap-2">
          {!isRunning ? (
            <Button onClick={handleStart} className="w-full gap-2">
              <Play className="h-4 w-4" />
              Start Session
            </Button>
          ) : (
            <>
              {isPaused ? (
                <Button onClick={handleResume} className="flex-1 gap-2">
                  <Play className="h-4 w-4" />
                  Resume
                </Button>
              ) : (
                <Button onClick={handlePause} variant="secondary" className="flex-1 gap-2">
                  <Pause className="h-4 w-4" />
                  Pause
                </Button>
              )}
              <Button onClick={handleStop} variant="destructive" className="flex-1 gap-2">
                <Square className="h-4 w-4" />
                Stop
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Quick Note Modal Component
// ============================================

interface QuickNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddNote: (note: Note) => void;
  userId: string;
}

function QuickNoteModal({ open, onOpenChange, onAddNote, userId }: QuickNoteModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!title.trim() && !content.trim()) return;
    
    setIsSubmitting(true);
    const now = new Date().toISOString();
    const newNote: Note = {
      id: `note-${Date.now()}`,
      userId,
      title: title.trim() || "Untitled Note",
      content: content.trim(),
      tags: [],
      isPinned: false,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };
    
    onAddNote(newNote);
    
    setTimeout(() => {
      setTitle("");
      setContent("");
      setIsSubmitting(false);
      onOpenChange(false);
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-violet-600" />
            Quick Note
          </DialogTitle>
          <DialogDescription>
            Capture your thoughts instantly.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Input
              placeholder="Note title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Textarea
              placeholder="Start typing your note..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={(!title.trim() && !content.trim()) || isSubmitting}
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Check className="h-4 w-4" />
                </motion.div>
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Save Note
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Log Habit Modal Component
// ============================================

interface LogHabitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habits: Habit[];
  habitLogs: { habitId: string; date: string; completed: boolean }[];
  onLogHabit: (habitId: string) => void;
}

function LogHabitModal({ open, onOpenChange, habits, habitLogs, onLogHabit }: LogHabitModalProps) {
  const today = new Date().toISOString().split("T")[0];
  const activeHabits = habits.filter(h => h.isActive);
  const [loggingHabitId, setLoggingHabitId] = useState<string | null>(null);

  const isHabitCompletedToday = (habitId: string) => {
    return habitLogs.some(log => 
      log.habitId === habitId && 
      log.date === today && 
      log.completed
    );
  };

  const handleLogHabit = (habitId: string) => {
    setLoggingHabitId(habitId);
    onLogHabit(habitId);
    setTimeout(() => setLoggingHabitId(null), 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-violet-600" />
            Log Habit
          </DialogTitle>
          <DialogDescription>
            Mark your habits as completed for today.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {activeHabits.length === 0 ? (
            <div className="text-center py-8">
              <CheckSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No active habits yet.</p>
              <p className="text-sm text-muted-foreground">Add habits from the Habits section.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {activeHabits.map((habit) => {
                const isCompleted = isHabitCompletedToday(habit.id);
                const isLogging = loggingHabitId === habit.id;
                
                return (
                  <motion.div
                    key={habit.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-all",
                      isCompleted 
                        ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" 
                        : "bg-background border-border hover:border-violet-200 dark:hover:border-violet-800"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: habit.color }}
                      />
                      <div>
                        <p className={cn(
                          "font-medium",
                          isCompleted && "line-through text-muted-foreground"
                        )}>
                          {habit.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {habit.frequency}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={isCompleted ? "outline" : "default"}
                      disabled={isCompleted || isLogging}
                      onClick={() => handleLogHabit(habit.id)}
                      className={cn(
                        "gap-1",
                        isCompleted && "border-green-500 text-green-600"
                      )}
                    >
                      {isLogging ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                        >
                          <Check className="h-4 w-4" />
                        </motion.div>
                      ) : isCompleted ? (
                        <>
                          <Check className="h-4 w-4" />
                          Done
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Log
                        </>
                      )}
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Toast Notification Component
// ============================================

interface ToastProps {
  message: string;
  type?: "success" | "info";
  onClose: () => void;
}

function Toast({ message, type = "success", onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.9 }}
      className={cn(
        "fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50",
        type === "success" 
          ? "bg-green-600 text-white" 
          : "bg-violet-600 text-white"
      )}
    >
      <CheckCircle2 className="h-5 w-5" />
      <span className="font-medium">{message}</span>
    </motion.div>
  );
}

// ============================================
// Main Dashboard Component
// ============================================

export function Dashboard() {
  const currentUser = useCurrentUser();
  const tasks = useTasks();
  const goals = useGoals();
  const habits = useHabits();
  const habitLogs = useHabitLogs();
  const { addTask, addNote, addHabitLog } = useLifeOSStore();

  // Modal state
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" } | null>(null);

  // Local state for focus editing
  const [focusText, setFocusText] = useState("");
  const [hasSetFocus, setHasSetFocus] = useState(false);
  const [isEditingFocus, setIsEditingFocus] = useState(false);
  const [editedFocus, setEditedFocus] = useState(focusText);
  
  // AI suggestion rotation
  const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0);
  const [acceptRipple, setAcceptRipple] = useState(false);
  const sparklesControls = useAnimation();

  // Show toast notification
  const showToast = useCallback((message: string, type: "success" | "info" = "success") => {
    setToast({ message, type });
  }, []);

  // Computed stats
  const todayStats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const completedToday = tasks.filter(
      (t) => t.completedAt?.startsWith(today) && t.status === "completed"
    ).length;
    
    const totalTasksToday = tasks.filter(
      (t) => t.dueDate?.startsWith(today)
    ).length;

    const activeHabits = habits.filter((h) => h.isActive);
    const uniqueDates = new Set(habitLogs.map((l) => l.date));
    const streakDays = uniqueDates.size;

    const inProgressGoals = goals.filter((g) => g.status === "in_progress");
    const avgProgress =
      inProgressGoals.length > 0
        ? Math.round(
            inProgressGoals.reduce((sum, g) => sum + g.progress, 0) / inProgressGoals.length
          )
        : 0;

    const tasksComparison = completedToday > 0 ? `+${Math.min(completedToday, 3)} from yesterday` : "";
    const streakComparison = streakDays > 1 ? `+1 from last week` : "";

    return {
      completedToday,
      totalTasksToday,
      streakDays,
      avgProgress,
      activeHabitsCount: activeHabits.length,
      tasksComparison,
      streakComparison,
    };
  }, [tasks, habits, habitLogs, goals]);

  // Generate AI suggestions
  const aiSuggestions = useMemo((): AISuggestion[] => {
    const suggestions: AISuggestion[] = [];
    const incompleteTasks = tasks.filter((t) => t.status !== "completed");
    const highPriorityTasks = incompleteTasks.filter((t) => t.priority === "high" || t.priority === "urgent");
    
    if (highPriorityTasks.length > 0) {
      suggestions.push({
        action: `Complete "${highPriorityTasks[0].title}"`,
        reason: "This is a high-priority task that needs your attention",
        type: "task",
        badges: [
          { label: "High Impact", variant: "default" as const },
          { label: "~30 min", variant: "outline" as const },
        ],
      });
    }

    const inProgressGoals = goals.filter((g) => g.status === "in_progress");
    if (inProgressGoals.length > 0) {
      suggestions.push({
        action: `Work on "${inProgressGoals[0].title}"`,
        reason: "You're making progress on this goal - keep the momentum",
        type: "goal",
        badges: [
          { label: "Goal Aligned", variant: "secondary" as const },
          { label: "~1 hour", variant: "outline" as const },
        ],
      });
    }

    if (habits.filter((h) => h.isActive).length > 0) {
      suggestions.push({
        action: "Log your daily habits",
        reason: "Consistency is key to building lasting habits",
        type: "habit",
        badges: [
          { label: "Quick Win", variant: "default" as const },
          { label: "~5 min", variant: "outline" as const },
        ],
      });
    }

    if (suggestions.length === 0) {
      suggestions.push({
        action: "Plan your day ahead",
        reason: "Start by setting your focus and adding tasks",
        type: "planning",
        badges: [
          { label: "Getting Started", variant: "secondary" as const },
          { label: "~10 min", variant: "outline" as const },
        ],
      });
    }

    return suggestions;
  }, [tasks, goals, habits]);

  // Rotate suggestions
  useEffect(() => {
    if (aiSuggestions.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentSuggestionIndex((prev) => (prev + 1) % aiSuggestions.length);
    }, 10000);

    return () => clearInterval(interval);
  }, [aiSuggestions.length]);

  // Sparkles animation
  useEffect(() => {
    sparklesControls.start({
      scale: [1, 1.1, 1],
      opacity: [1, 0.8, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      },
    });
  }, [sparklesControls]);

  const currentSuggestion = aiSuggestions[currentSuggestionIndex] || aiSuggestions[0];

  // Handlers
  const handleFocusSave = () => {
    if (editedFocus.trim()) {
      setFocusText(editedFocus);
      setHasSetFocus(true);
    }
    setIsEditingFocus(false);
  };

  const handleFocusCancel = () => {
    setEditedFocus(focusText);
    setIsEditingFocus(false);
  };

  const handleAcceptSuggestion = useCallback(() => {
    setAcceptRipple(true);
    setTimeout(() => setAcceptRipple(false), 600);
  }, []);

  // Quick Action Handlers
  const handleOpenAddTask = () => setActiveModal("add-task");
  const handleOpenFocusSession = () => setActiveModal("focus-session");
  const handleOpenQuickNote = () => setActiveModal("quick-note");
  const handleOpenLogHabit = () => setActiveModal("log-habit");

  const handleAddTask = (task: Task) => {
    addTask(task);
    showToast("Task added successfully!");
  };

  const handleAddNote = (note: Note) => {
    addNote(note);
    showToast("Note saved!");
  };

  const handleLogHabit = (habitId: string) => {
    const today = new Date().toISOString().split("T")[0];
    addHabitLog({
      id: `log-${Date.now()}`,
      habitId,
      userId: currentUser?.id || "user_1",
      date: today,
      completed: true,
      count: 1,
      createdAt: new Date().toISOString(),
    });
    showToast("Habit logged!");
  };

  const getTimeContext = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "morning focus";
    if (hour < 17) return "afternoon priority";
    if (hour < 21) return "evening goal";
    return "night focus";
  };

  return (
    <div className="space-y-6 p-6">
      {/* ============================================ */}
      {/* Greeting Section */}
      {/* ============================================ */}
      <motion.section 
        className="space-y-1"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-baseline gap-2">
          <h1 className="text-3xl font-semibold tracking-tight" suppressHydrationWarning>
            {getTimeBasedGreeting()}, {currentUser?.name?.split(" ")[0] || "Friend"}
          </h1>
          <span className="text-2xl">👋</span>
        </div>
        <p className="text-muted-foreground" suppressHydrationWarning>{formatDateNicely()}</p>
        <p className="text-sm text-violet-600 dark:text-violet-400 font-medium">
          {getMotivationalTagline()}
        </p>
      </motion.section>

      {/* ============================================ */}
      {/* Main Grid Layout */}
      {/* ============================================ */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Focus Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="lg:col-span-2 group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl bg-gradient-to-br from-violet-50 via-white to-violet-50/50 dark:from-violet-950/30 dark:via-background dark:to-violet-950/20 border-violet-200/50 dark:border-violet-800/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-violet-500/3 pointer-events-none" />
            
            <CardHeader className="pb-2 relative">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-violet-100 p-2 text-violet-600 dark:bg-violet-900/50 dark:text-violet-400 transition-transform duration-300 group-hover:scale-105">
                  <Target className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">Today&apos;s Focus</CardTitle>
                {hasSetFocus && <PulsingDot className="ml-1" />}
              </div>
              <CardDescription>
                {hasSetFocus ? `Your ${getTimeContext()}` : "One thing that matters most today"}
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <AnimatePresence mode="wait">
                {isEditingFocus ? (
                  <motion.div
                    key="editing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex gap-2"
                  >
                    <Input
                      value={editedFocus}
                      onChange={(e) => setEditedFocus(e.target.value)}
                      className="flex-1 text-lg"
                      autoFocus
                      placeholder="What's your main focus today?"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleFocusSave();
                        if (e.key === "Escape") handleFocusCancel();
                      }}
                    />
                    <Button size="icon" variant="ghost" onClick={handleFocusCancel}>
                      <X className="h-4 w-4" />
                    </Button>
                    <Button size="icon" onClick={handleFocusSave}>
                      <Check className="h-4 w-4" />
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="display"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-3 cursor-pointer group/edit"
                    onClick={() => {
                      setEditedFocus(focusText);
                      setIsEditingFocus(true);
                    }}
                  >
                    {hasSetFocus ? (
                      <>
                        <p className="text-xl font-medium flex-1">{focusText}</p>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="opacity-0 group-hover/edit:opacity-100 transition-opacity"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <motion.div 
                        className="flex-1 flex items-center gap-3"
                        animate={{ opacity: [0.5, 0.8, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <div className="h-8 w-8 rounded-full border-2 border-dashed border-violet-300 dark:border-violet-700 flex items-center justify-center">
                          <Plus className="h-4 w-4 text-violet-400" />
                        </div>
                        <p className="text-xl font-medium text-muted-foreground">
                          You haven&apos;t set a focus yet
                        </p>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              
              {hasSetFocus && !isEditingFocus && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>Set for {getTimeContext()}</span>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Suggested Next Action */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <Card className="group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl border-amber-200/50 dark:border-amber-800/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-amber-500/3 pointer-events-none" />
            
            <CardHeader className="pb-2 relative">
              <div className="flex items-center gap-2">
                <motion.div 
                  className="rounded-lg bg-amber-100 p-2 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400 relative"
                  animate={sparklesControls}
                >
                  <Sparkles className="h-5 w-5" />
                  <div className="absolute inset-0 rounded-lg bg-amber-400/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
                <CardTitle className="text-lg">AI Suggests</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSuggestionIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {currentSuggestion.badges && currentSuggestion.badges.length > 0 && (
                    <div className="flex gap-1.5 mb-2">
                      {currentSuggestion.badges.map((badge, idx) => (
                        <Badge key={idx} variant={badge.variant || "default"} className="text-[10px] px-2 py-0">
                          {badge.label}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <p className="font-medium">{currentSuggestion.action}</p>
                  <p className="text-sm text-muted-foreground">{currentSuggestion.reason}</p>
                </motion.div>
              </AnimatePresence>
              
              <div className="flex gap-2 pt-2">
                <Button 
                  size="sm" 
                  className="flex-1 gap-1 relative overflow-hidden"
                  onClick={handleAcceptSuggestion}
                >
                  {acceptRipple && (
                    <motion.span
                      className="absolute inset-0 bg-white/30"
                      initial={{ scale: 0, opacity: 1 }}
                      animate={{ scale: 4, opacity: 0 }}
                      transition={{ duration: 0.6 }}
                    />
                  )}
                  <Zap className="h-3.5 w-3.5" />
                  Accept
                </Button>
                <Button size="sm" variant="ghost" className="gap-1">
                  Dismiss
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ============================================ */}
      {/* Progress Snapshot Grid */}
      {/* ============================================ */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <h2 className="text-lg font-semibold mb-4">Progress Snapshot</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Tasks Today"
            value={todayStats.completedToday}
            subtitle={`${todayStats.totalTasksToday} total due`}
            icon={<CheckCircle2 className="h-4 w-4" />}
            progress={
              todayStats.totalTasksToday > 0
                ? (todayStats.completedToday / todayStats.totalTasksToday) * 100
                : 0
            }
            trend={todayStats.completedToday > 0 ? "up" : "neutral"}
            trendValue={todayStats.tasksComparison}
            delay={0}
          />
          <StatCard
            title="Habit Streak"
            value={`${todayStats.streakDays} days`}
            subtitle={`${todayStats.activeHabitsCount} active habits`}
            icon={<Flame className="h-4 w-4" />}
            trend={todayStats.streakDays > 1 ? "up" : "neutral"}
            trendValue={todayStats.streakComparison}
            delay={100}
          />
          <StatCard
            title="Goals Progress"
            value={`${todayStats.avgProgress}%`}
            subtitle="Average completion"
            icon={<TrendingUp className="h-4 w-4" />}
            progress={todayStats.avgProgress}
            trend={todayStats.avgProgress > 50 ? "up" : todayStats.avgProgress > 0 ? "neutral" : "down"}
            trendValue={todayStats.avgProgress > 50 ? "+5% this week" : ""}
            delay={200}
          />
          <StatCard
            title="Focus Time"
            value="2h 15m"
            subtitle="Logged today"
            icon={<Clock className="h-4 w-4" />}
            trend="up"
            trendValue="+45min"
            delay={300}
          />
        </div>
      </motion.section>

      {/* ============================================ */}
      {/* Quick Actions */}
      {/* ============================================ */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickAction
            icon={<Plus className="h-5 w-5 text-violet-600 dark:text-violet-400" />}
            label="Add Task"
            onClick={handleOpenAddTask}
            shortcut="⌘N"
          />
          <QuickAction
            icon={<Timer className="h-5 w-5 text-violet-600 dark:text-violet-400" />}
            label="Focus Session"
            onClick={handleOpenFocusSession}
            shortcut="⌘F"
          />
          <QuickAction
            icon={<FileText className="h-5 w-5 text-violet-600 dark:text-violet-400" />}
            label="Quick Note"
            onClick={handleOpenQuickNote}
            shortcut="⌘⇧N"
          />
          <QuickAction
            icon={<CheckSquare className="h-5 w-5 text-violet-600 dark:text-violet-400" />}
            label="Log Habit"
            onClick={handleOpenLogHabit}
            shortcut="⌘H"
          />
        </div>
      </motion.section>

      {/* ============================================ */}
      {/* Modals */}
      {/* ============================================ */}
      <AddTaskModal
        open={activeModal === "add-task"}
        onOpenChange={(open) => !open && setActiveModal(null)}
        onAddTask={handleAddTask}
        userId={currentUser?.id || "user_1"}
      />

      <FocusSessionModal
        open={activeModal === "focus-session"}
        onOpenChange={(open) => !open && setActiveModal(null)}
      />

      <QuickNoteModal
        open={activeModal === "quick-note"}
        onOpenChange={(open) => !open && setActiveModal(null)}
        onAddNote={handleAddNote}
        userId={currentUser?.id || "user_1"}
      />

      <LogHabitModal
        open={activeModal === "log-habit"}
        onOpenChange={(open) => !open && setActiveModal(null)}
        habits={habits}
        habitLogs={habitLogs}
        onLogHabit={handleLogHabit}
      />

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      {/* Custom keyframe animation */}
      <style jsx global>{`
        @keyframes ripple {
          0% {
            transform: scale(0);
            opacity: 0.3;
          }
          100% {
            transform: scale(4);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

export default Dashboard;
