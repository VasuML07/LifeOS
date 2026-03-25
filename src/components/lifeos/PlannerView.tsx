"use client"

import * as React from "react"
import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { format, addDays, isToday, isSameDay, startOfDay, isPast, isFuture } from "date-fns"
import {
  Sparkles,
  CalendarIcon,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  Target,
  Loader2,
  ChevronDown,
  ChevronRight,
  ListTodo,
  Calendar,
  ArrowRight,
  RefreshCw,
  Lightbulb,
  X,
  Check,
  AlertCircle,
  Zap,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useLifeOSStore, Task, taskApiHelpers } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// ============================================
// Types
// ============================================

interface PlannedTask {
  id: string
  title: string
  estimatedMinutes: number
  scheduledDate: Date
  isCompleted: boolean
}

interface GeneratedPlan {
  goal: string
  tasks: PlannedTask[]
  totalDays: number
  totalHours: number
}

interface DayGroup {
  dateKey: string
  date: Date
  tasks: PlannedTask[]
  totalMinutes: number
  isExpanded: boolean
}

// ============================================
// Constants
// ============================================

const PLACEHOLDER_EXAMPLES = [
  "Launch my personal portfolio website with blog functionality...",
  "Learn a new programming language in 30 days...",
  "Prepare for a marathon by building a training schedule...",
  "Write and publish my first e-book...",
  "Build a side project that generates passive income...",
  "Master a musical instrument from beginner level...",
  "Plan and execute a product launch campaign...",
  "Create a comprehensive fitness transformation plan...",
]

const SUGGESTED_GOALS = [
  { title: "Launch a personal website", icon: "🌐", category: "Career" },
  { title: "Learn a new skill", icon: "📚", category: "Growth" },
  { title: "Get in shape", icon: "💪", category: "Health" },
  { title: "Start a side project", icon: "🚀", category: "Projects" },
  { title: "Read 12 books this year", icon: "📖", category: "Learning" },
  { title: "Build an emergency fund", icon: "💰", category: "Finance" },
]

const MOTIVATIONAL_QUOTES = [
  { quote: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { quote: "A goal without a plan is just a wish.", author: "Antoine de Saint-Exupéry" },
  { quote: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { quote: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { quote: "Your future is created by what you do today, not tomorrow.", author: "Robert Kiyosaki" },
]

const QUICK_START_SUGGESTIONS = [
  { title: "Weekly Planning", description: "Plan your week with focused tasks", icon: Calendar, color: "text-blue-500" },
  { title: "Project Launch", description: "Break down a project into milestones", icon: Rocket, color: "text-violet-500" },
  { title: "Learning Path", description: "Create a structured learning plan", icon: Lightbulb, color: "text-amber-500" },
]

// Rocket icon component (not in lucide-react by default name)
function Rocket({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
    </svg>
  )
}

// ============================================
// AI Plan Generation via API
// ============================================

async function generatePlanViaAPI(
  goal: string,
  deadline: Date
): Promise<GeneratedPlan> {
  const response = await fetch("/api/planner", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      goal,
      deadline: deadline.toISOString(),
    }),
  });

  const data = await response.json();

  if (data.success && data.plan) {
    return {
      goal,
      tasks: data.plan.tasks.map((t: { title: string; description?: string; estimatedMinutes: number; scheduledDate: string; priority: string }, index: number) => ({
        id: `plan-task-${index}`,
        title: t.title,
        estimatedMinutes: t.estimatedMinutes,
        scheduledDate: new Date(t.scheduledDate),
        isCompleted: false,
      })),
      totalDays: data.plan.tasks?.length > 0 
        ? Math.ceil((new Date(data.plan.tasks[data.plan.tasks.length - 1].scheduledDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : 1,
      totalHours: data.plan.estimatedHours || 2,
    };
  }

  // Fallback to mock if API fails
  return mockGeneratePlan(goal, deadline);
}

async function mockGeneratePlan(
  goal: string,
  deadline: Date
): Promise<GeneratedPlan> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 2000))

  const today = startOfDay(new Date())
  const deadlineStart = startOfDay(deadline)
  const daysUntilDeadline = Math.max(
    1,
    Math.ceil((deadlineStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  )

  // Generate mock tasks based on the goal
  const taskTemplates = [
    { title: `Research and gather resources for: ${goal}`, minutes: 60 },
    { title: `Break down ${goal} into smaller milestones`, minutes: 30 },
    { title: `Create action plan for ${goal}`, minutes: 45 },
    { title: `Set up tracking system for ${goal}`, minutes: 20 },
    { title: `Review and refine approach for ${goal}`, minutes: 30 },
    { title: `Execute first phase of ${goal}`, minutes: 120 },
    { title: `Mid-point review of ${goal} progress`, minutes: 30 },
    { title: `Continue implementation of ${goal}`, minutes: 120 },
    { title: `Test and validate ${goal} outcomes`, minutes: 60 },
    { title: `Final review and completion of ${goal}`, minutes: 45 },
  ]

  const tasks: PlannedTask[] = []
  let totalMinutes = 0

  // Distribute tasks across available days
  taskTemplates.forEach((template, index) => {
    const dayOffset = Math.floor((index / taskTemplates.length) * daysUntilDeadline)
    const scheduledDate = addDays(today, Math.min(dayOffset, daysUntilDeadline - 1))

    tasks.push({
      id: `plan-task-${index}`,
      title: template.title,
      estimatedMinutes: template.minutes,
      scheduledDate,
      isCompleted: false,
    })

    totalMinutes += template.minutes
  })

  return {
    goal,
    tasks,
    totalDays: daysUntilDeadline,
    totalHours: Math.round((totalMinutes / 60) * 10) / 10,
  }
}

// ============================================
// Animated Dots Component
// ============================================

function AnimatedDots() {
  return (
    <span className="inline-flex">
      <span className="animate-[dot-bounce_1.4s_infinite_0s]">.</span>
      <span className="animate-[dot-bounce_1.4s_infinite_0.2s]">.</span>
      <span className="animate-[dot-bounce_1.4s_infinite_0.4s]">.</span>
      <style jsx>{`
        @keyframes dot-bounce {
          0%, 20% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </span>
  )
}

// ============================================
// Success Checkmark Animation
// ============================================

function SuccessCheckmark({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <CheckCircle2 className="size-5 text-green-500 animate-[scale-in_0.3s_ease-out]" />
      <style jsx>{`
        @keyframes scale-in {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ============================================
// Task Card Component
// ============================================

interface TaskCardProps {
  task: PlannedTask
  onToggle: () => void
  isPastDay?: boolean
}

function TaskCard({ task, onToggle, isPastDay }: TaskCardProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border transition-all duration-200",
        "hover:border-violet-500/30 hover:bg-accent/30",
        task.isCompleted && "opacity-60",
        isPastDay && !task.isCompleted && "opacity-50"
      )}
    >
      <Checkbox
        checked={task.isCompleted}
        onCheckedChange={onToggle}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium",
            task.isCompleted && "line-through text-muted-foreground"
          )}
        >
          {task.title}
        </p>
        <div className="flex items-center gap-3 mt-1.5">
          <Badge variant="secondary" className="text-xs">
            <Clock className="size-3 mr-1" />
            {task.estimatedMinutes} min
          </Badge>
          <Badge variant="outline" className="text-xs">
            <Calendar className="size-3 mr-1" />
            {format(task.scheduledDate, "MMM d")}
          </Badge>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Animated Timeline Node
// ============================================

interface TimelineNodeProps {
  isToday: boolean
  isPast: boolean
  isFuture: boolean
  taskCount: number
}

function TimelineNode({ isToday, isPast, isFuture, taskCount }: TimelineNodeProps) {
  return (
    <div className="relative">
      {/* Pulse ring for today */}
      {isToday && (
        <>
          <div className="absolute inset-0 rounded-full bg-violet-500 animate-ping opacity-20" style={{ animationDuration: '1.5s' }} />
          <div className="absolute inset-0 rounded-full bg-violet-500 animate-ping opacity-10" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
        </>
      )}
      
      {/* Main node */}
      <div
        className={cn(
          "relative z-10 size-6 rounded-full flex items-center justify-center transition-all duration-300",
          isToday && "bg-violet-500 text-white shadow-lg shadow-violet-500/30",
          isPast && !isToday && "bg-muted border border-border opacity-60",
          isFuture && "bg-background border-2 border-violet-300"
        )}
      >
        {isToday && (
          <span className="size-2 rounded-full bg-white" />
        )}
      </div>
    </div>
  )
}

// ============================================
// Day Section Component
// ============================================

interface DaySectionProps {
  dayGroup: DayGroup
  onToggleExpand: () => void
  onToggleTask: (taskId: string) => void
  todayRef?: React.RefObject<HTMLDivElement | null>
}

function DaySection({ dayGroup, onToggleExpand, onToggleTask, todayRef }: DaySectionProps) {
  const date = dayGroup.date
  const isTodayDate = isToday(date)
  const isPastDate = isPast(date) && !isTodayDate
  const isFutureDate = isFuture(date)
  
  const completedTasks = dayGroup.tasks.filter(t => t.isCompleted).length
  const progressPercent = dayGroup.tasks.length > 0 
    ? Math.round((completedTasks / dayGroup.tasks.length) * 100) 
    : 0

  return (
    <div 
      ref={isTodayDate ? todayRef : undefined}
      className={cn(
        "relative transition-opacity duration-300",
        isPastDate && "opacity-60"
      )}
    >
      {/* Timeline node and line */}
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center">
          <TimelineNode 
            isToday={isTodayDate}
            isPast={isPastDate}
            isFuture={isFutureDate}
            taskCount={dayGroup.tasks.length}
          />
          {/* Vertical connecting line */}
          <div className={cn(
            "w-0.5 flex-1 min-h-8",
            isPastDate ? "bg-border/50" : "bg-border"
          )} />
        </div>
        
        {/* Day content */}
        <div className="flex-1 pb-6">
          {/* Day header */}
          <button
            onClick={onToggleExpand}
            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div>
                <h4 className={cn(
                  "font-medium flex items-center gap-2",
                  isTodayDate && "text-violet-600"
                )}>
                  {isTodayDate ? "Today" : format(date, "EEEE")}
                  {isTodayDate && (
                    <Badge variant="default" className="bg-violet-500 text-xs">
                      Now
                    </Badge>
                  )}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {format(date, "MMMM d, yyyy")}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Task count and time */}
              <div className="text-right">
                <p className="text-sm font-medium">
                  {dayGroup.tasks.length} {dayGroup.tasks.length === 1 ? 'task' : 'tasks'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {Math.round(dayGroup.totalMinutes / 60 * 10) / 10}h estimated
                </p>
              </div>
              
              {/* Progress indicator */}
              {dayGroup.tasks.length > 0 && (
                <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-violet-500 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              )}
              
              {/* Expand/collapse icon */}
              <div className="text-muted-foreground group-hover:text-foreground transition-colors">
                {dayGroup.isExpanded ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </div>
            </div>
          </button>
          
          {/* Tasks list */}
          {dayGroup.isExpanded && (
            <div className="mt-2 space-y-2 animate-[slide-down_0.2s_ease-out]">
              {dayGroup.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggle={() => onToggleTask(task.id)}
                  isPastDay={isPastDate}
                />
              ))}
            </div>
          )}
          
          <style jsx>{`
            @keyframes slide-down {
              from { opacity: 0; transform: translateY(-8px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Animated Empty Timeline
// ============================================

function AnimatedEmptyTimeline() {
  return (
    <div className="relative">
      {/* Placeholder timeline */}
      <div className="space-y-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-start gap-4 animate-pulse" style={{ animationDelay: `${i * 200}ms` }}>
            {/* Node placeholder */}
            <div className="flex flex-col items-center">
              <div className={cn(
                "size-6 rounded-full bg-muted",
                i === 0 && "bg-violet-200"
              )} />
              <div className="w-0.5 h-16 bg-muted" />
            </div>
            
            {/* Content placeholder */}
            <div className="flex-1 space-y-2 pb-6">
              <div className="h-4 bg-muted rounded w-32" />
              <div className="h-3 bg-muted rounded w-48" />
              <div className="space-y-2 mt-3">
                <div className="h-12 bg-muted rounded-lg" style={{ opacity: 0.7 - i * 0.2 }} />
                <div className="h-12 bg-muted rounded-lg" style={{ opacity: 0.6 - i * 0.2 }} />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Floating particles animation */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute size-1 rounded-full bg-violet-400/30"
            style={{
              left: `${10 + Math.random() * 20}%`,
              top: `${i * 15}%`,
              animation: `float-particle ${3 + Math.random() * 2}s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>
      
      <style jsx>{`
        @keyframes float-particle {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          50% { transform: translateY(-20px) translateX(10px); opacity: 0.6; }
        }
      `}</style>
    </div>
  )
}

// ============================================
// Rotating Placeholder Component
// ============================================

function RotatingPlaceholder() {
  const [index, setIndex] = useState(0)
  
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % PLACEHOLDER_EXAMPLES.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])
  
  return (
    <span className="transition-opacity duration-300">
      {PLACEHOLDER_EXAMPLES[index]}
    </span>
  )
}

// ============================================
// Main PlannerView Component
// ============================================

export function PlannerView() {
  const { addTask } = useLifeOSStore()
  const todayRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // State
  const [goalInput, setGoalInput] = useState("")
  const [deadline, setDeadline] = useState<Date>()
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null)
  const [tasks, setTasks] = useState<PlannedTask[]>([])
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [addSuccess, setAddSuccess] = useState(false)
  const [addedCount, setAddedCount] = useState(0)
  const [dayGroups, setDayGroups] = useState<DayGroup[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [randomQuote] = useState(() => 
    MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]
  )
  
  // Character count
  const charCount = goalInput.length
  const maxChars = 500

  // Scroll to today when plan is generated
  useEffect(() => {
    if (generatedPlan && todayRef.current) {
      setTimeout(() => {
        todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }
  }, [generatedPlan])

  // Group tasks by day
  useEffect(() => {
    if (tasks.length === 0) {
      setDayGroups([])
      return
    }

    const grouped: Record<string, PlannedTask[]> = {}
    
    tasks.forEach((task) => {
      const dateKey = format(task.scheduledDate, "yyyy-MM-dd")
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(task)
    })

    const groups: DayGroup[] = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, dateTasks]) => ({
        dateKey,
        date: new Date(dateKey),
        tasks: dateTasks,
        totalMinutes: dateTasks.reduce((sum, t) => sum + t.estimatedMinutes, 0),
        isExpanded: isToday(new Date(dateKey)) || isFuture(new Date(dateKey)),
      }))

    setDayGroups(groups)
  }, [tasks])

  // Handlers
  const handleGeneratePlan = useCallback(async () => {
    if (!goalInput.trim() || !deadline) return

    setIsGenerating(true)
    setGenerateError(null)
    
    try {
      const plan = await generatePlanViaAPI(goalInput, deadline)
      setGeneratedPlan(plan)
      setTasks(plan.tasks)
    } catch (error) {
      console.error("Failed to generate plan:", error)
      setGenerateError("Failed to generate plan. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }, [goalInput, deadline])

  const handleRetry = useCallback(() => {
    setGenerateError(null)
    handleGeneratePlan()
  }, [handleGeneratePlan])

  const handleToggleTask = useCallback((taskId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, isCompleted: !task.isCompleted } : task
      )
    )
  }, [])

  const handleToggleDayExpand = useCallback((dateKey: string) => {
    setDayGroups((prev) =>
      prev.map((group) =>
        group.dateKey === dateKey ? { ...group, isExpanded: !group.isExpanded } : group
      )
    )
  }, [])

  const handleAddAllToTasks = useCallback(async () => {
    try {
      for (const task of tasks) {
        const newTask = await taskApiHelpers.create({
          title: task.title,
          dueDate: task.scheduledDate.toISOString(),
          status: task.isCompleted ? "completed" : "todo",
        })
        addTask(newTask)
      }
      
      // Show success state
      setAddedCount(tasks.length)
      setAddSuccess(true)
      
      // Clear after animation
      setTimeout(() => {
        setGeneratedPlan(null)
        setTasks([])
        setGoalInput("")
        setDeadline(undefined)
        setAddSuccess(false)
        setAddedCount(0)
      }, 1500)
    } catch (error) {
      console.error("Failed to add tasks:", error)
    }
  }, [tasks, addTask])

  const handleInspireMe = useCallback(() => {
    const randomGoal = SUGGESTED_GOALS[Math.floor(Math.random() * SUGGESTED_GOALS.length)]
    setGoalInput(randomGoal.title)
    setShowSuggestions(false)
  }, [])

  const handleSuggestedGoal = useCallback((title: string) => {
    setGoalInput(title)
    setShowSuggestions(false)
  }, [])

  const completedCount = tasks.filter((t) => t.isCompleted).length
  const progressPercent =
    tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0

  return (
    <div className="flex h-full bg-background">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Target className="size-6 text-violet-500" />
            AI Planner
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Let AI help you break down your goals into actionable tasks
          </p>
        </div>

        <ScrollArea ref={scrollAreaRef} className="flex-1">
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Goal Input Section */}
            <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="size-5 text-violet-500" />
                  What do you want to achieve?
                </CardTitle>
                <CardDescription>
                  Describe your goal and set a deadline. AI will generate a
                  structured plan for you.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Textarea
                    placeholder={`e.g., ${PLACEHOLDER_EXAMPLES[0]}`}
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    className="min-h-[100px] resize-none pr-16"
                    maxLength={maxChars}
                  />
                  
                  {/* Character count */}
                  <div className={cn(
                    "absolute bottom-2 right-2 text-xs",
                    charCount > maxChars * 0.8 ? "text-amber-500" : "text-muted-foreground"
                  )}>
                    {charCount}/{maxChars}
                  </div>
                </div>

                {/* Suggested Goals Dropdown */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Quick start:</span>
                  {SUGGESTED_GOALS.slice(0, 3).map((goal, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleSuggestedGoal(goal.title)}
                    >
                      <span className="mr-1">{goal.icon}</span>
                      {goal.title}
                    </Button>
                  ))}
                  
                  <DropdownMenu open={showSuggestions} onOpenChange={setShowSuggestions}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                        More...
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      {SUGGESTED_GOALS.map((goal, i) => (
                        <DropdownMenuItem
                          key={i}
                          onClick={() => handleSuggestedGoal(goal.title)}
                          className="flex items-center gap-2"
                        >
                          <span>{goal.icon}</span>
                          <span>{goal.title}</span>
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {goal.category}
                          </Badge>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Date Picker */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full sm:w-auto justify-start text-left font-normal",
                          !deadline && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="size-4 mr-2" />
                        {deadline ? format(deadline, "PPP") : "Set deadline"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={deadline}
                        onSelect={setDeadline}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  {/* Inspire Me Button */}
                  <Button
                    variant="outline"
                    onClick={handleInspireMe}
                    className="w-full sm:w-auto"
                  >
                    <Lightbulb className="size-4 mr-2" />
                    Inspire Me
                  </Button>

                  {/* Generate Button */}
                  <Button
                    onClick={handleGeneratePlan}
                    disabled={!goalInput.trim() || !deadline || isGenerating}
                    className={cn(
                      "w-full sm:w-auto transition-all duration-300",
                      !generateError && "bg-violet-500 hover:bg-violet-600",
                      generateError && "bg-red-500 hover:bg-red-600"
                    )}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Generating<AnimatedDots />
                      </>
                    ) : generateError ? (
                      <>
                        <AlertCircle className="size-4 mr-2" />
                        Error - Retry?
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4 mr-2" />
                        Generate Plan
                      </>
                    )}
                  </Button>
                </div>

                {/* Error state with retry */}
                {generateError && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="size-4" />
                      <span className="text-sm">{generateError}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRetry}
                      className="text-red-600 border-red-500/30"
                    >
                      <RefreshCw className="size-3 mr-1" />
                      Retry
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Generated Plan Display */}
            {generatedPlan && (
              <>
                {/* Plan Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-violet-500/10">
                          <ListTodo className="size-5 text-violet-500" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{tasks.length}</p>
                          <p className="text-xs text-muted-foreground">
                            Total Tasks
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-violet-500/10">
                          <Clock className="size-5 text-violet-500" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">
                            {generatedPlan.totalHours}h
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Estimated Time
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-violet-500/10">
                          <Calendar className="size-5 text-violet-500" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">
                            {generatedPlan.totalDays}
                          </p>
                          <p className="text-xs text-muted-foreground">Days</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{progressPercent}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleAddAllToTasks} 
                    className={cn(
                      "shrink-0 transition-all duration-300",
                      addSuccess && "bg-green-500 hover:bg-green-600"
                    )}
                    disabled={addSuccess}
                  >
                    {addSuccess ? (
                      <>
                        <SuccessCheckmark className="mr-2" />
                        Added {addedCount} tasks!
                      </>
                    ) : (
                      <>
                        <Plus className="size-4 mr-2" />
                        Add to Tasks
                      </>
                    )}
                  </Button>
                </div>

                <Separator />

                {/* Structured Plan Output - Day Groups */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <ListTodo className="size-5 text-violet-500" />
                    Tasks Breakdown by Day
                  </h3>
                  
                  <div className="relative">
                    {/* Main timeline line */}
                    <div className="absolute left-[11px] top-6 bottom-6 w-0.5 bg-border" />
                    
                    <div className="space-y-2">
                      {dayGroups.map((dayGroup) => (
                        <DaySection
                          key={dayGroup.dateKey}
                          dayGroup={dayGroup}
                          onToggleExpand={() => handleToggleDayExpand(dayGroup.dateKey)}
                          onToggleTask={handleToggleTask}
                          todayRef={todayRef}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Empty State */}
            {!generatedPlan && (
              <div className="space-y-8">
                {/* Animated Timeline Placeholder */}
                <Card className="border-dashed">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="size-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Your timeline will appear here</span>
                    </div>
                    <AnimatedEmptyTimeline />
                  </CardContent>
                </Card>
                
                {/* Motivational Quote */}
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-violet-500/10 rounded-full blur-xl" />
                    <Target className="relative size-16 text-violet-500/50" />
                  </div>
                  <blockquote className="mt-6 max-w-md">
                    <p className="text-lg font-medium text-foreground">
                      "{randomQuote.quote}"
                    </p>
                    <footer className="mt-2 text-sm text-muted-foreground">
                      — {randomQuote.author}
                    </footer>
                  </blockquote>
                </div>

                {/* Quick Start Suggestions */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {QUICK_START_SUGGESTIONS.map((suggestion, i) => (
                    <Card 
                      key={i}
                      className="cursor-pointer hover:border-violet-500/30 hover:bg-accent/30 transition-all duration-200"
                      onClick={() => setGoalInput(suggestion.title)}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            <suggestion.icon className={cn("size-5", suggestion.color)} />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{suggestion.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {suggestion.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Timeline Sidebar */}
      {generatedPlan && tasks.length > 0 && (
        <div className="hidden lg:block w-80 border-l border-border bg-muted/30">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold flex items-center gap-2">
              <Calendar className="size-5 text-violet-500" />
              Schedule Timeline
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Visual overview of your plan
            </p>
          </div>
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="p-4">
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-border" />

                <div className="space-y-6">
                  {dayGroups.map((dayGroup) => {
                    const date = dayGroup.date
                    const isTodayDate = isToday(date)
                    const isPastDate = isPast(date) && !isTodayDate

                    return (
                      <div 
                        key={dayGroup.dateKey} 
                        className={cn(
                          "relative transition-opacity duration-300",
                          isPastDate && "opacity-50"
                        )}
                      >
                        {/* Date marker */}
                        <div className="flex items-center gap-3 mb-3">
                          <TimelineNode
                            isToday={isTodayDate}
                            isPast={isPastDate}
                            isFuture={isFuture(date)}
                            taskCount={dayGroup.tasks.length}
                          />
                          <div>
                            <h4
                              className={cn(
                                "font-medium",
                                isTodayDate && "text-violet-600"
                              )}
                            >
                              {isTodayDate ? "Today" : format(date, "EEE")}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {format(date, "MMM d")} • {dayGroup.tasks.length} tasks
                            </p>
                          </div>
                        </div>

                        {/* Tasks for this date */}
                        <div className="ml-9 space-y-2">
                          {dayGroup.tasks.slice(0, 3).map((task) => (
                            <div
                              key={task.id}
                              className={cn(
                                "flex items-center gap-2 p-2 rounded border text-xs",
                                task.isCompleted && "opacity-50"
                              )}
                            >
                              <Checkbox
                                checked={task.isCompleted}
                                onCheckedChange={() => handleToggleTask(task.id)}
                                className="size-3"
                              />
                              <span className="truncate flex-1">{task.title}</span>
                              <Badge variant="secondary" className="text-[10px] px-1">
                                {task.estimatedMinutes}m
                              </Badge>
                            </div>
                          ))}
                          {dayGroup.tasks.length > 3 && (
                            <p className="text-xs text-muted-foreground pl-2">
                              +{dayGroup.tasks.length - 3} more tasks
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}

export default PlannerView
