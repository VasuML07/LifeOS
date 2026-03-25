"use client"

import * as React from "react"
import { useRef, useEffect, useState, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Send,
  Sparkles,
  Trash2,
  Target,
  CheckSquare,
  Calendar,
  Copy,
  Check,
  ThumbsUp,
  Lightbulb,
  Star,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import {
  useLifeOSStore,
  useGoals,
  useTasks,
  useHabits,
  useHabitLogs,
  useCurrentConversation,
  chatApiHelpers,
  type ChatMessage,
} from "@/lib/store"

// ============================================
// Time-based Personality Helpers
// ============================================

type TimeOfDay = "morning" | "afternoon" | "evening"

function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return "morning"
  if (hour >= 12 && hour < 18) return "afternoon"
  return "evening"
}

function getDynamicGreeting(): { headline: string; subtext: string; emoji: string } {
  const time = getTimeOfDay()
  const greetings = {
    morning: {
      headline: "Let's fix your day",
      subtext: "Good morning! Ready to tackle your priorities?",
      emoji: "☀️",
    },
    afternoon: {
      headline: "What's blocking you?",
      subtext: "Good afternoon! Let's clear those obstacles.",
      emoji: "💪",
    },
    evening: {
      headline: "Ready to wrap up?",
      subtext: "Good evening! Time to reflect and prepare for tomorrow.",
      emoji: "🌙",
    },
  }
  return greetings[time]
}

function getAssistantStatus(): string {
  const time = getTimeOfDay()
  const statuses = {
    morning: "Ready to help you start strong",
    afternoon: "Here to keep you focused",
    evening: "Let's review your progress",
  }
  return statuses[time]
}

// ============================================
// Relative Time Formatter
// ============================================

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

// ============================================
// Markdown Renderer Component
// ============================================

function MarkdownRenderer({ content }: { content: string }) {
  const renderMarkdown = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```)/g)
    
    return parts.map((part, index) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const codeContent = part.slice(3, -3)
        const [language, ...codeLines] = codeContent.split("\n")
        const code = codeLines.join("\n")
        return (
          <pre
            key={index}
            className="my-2 overflow-x-auto rounded-md bg-muted p-3 text-sm"
          >
            {language && (
              <div className="mb-2 text-xs text-muted-foreground">
                {language}
              </div>
            )}
            <code className="text-foreground">{code}</code>
          </pre>
        )
      }
      
      return (
        <span key={index}>
          {part.split("\n").map((line, lineIndex) => (
            <React.Fragment key={lineIndex}>
              {lineIndex > 0 && <br />}
              {processInlineMarkdown(line)}
            </React.Fragment>
          ))}
        </span>
      )
    })
  }

  const processInlineMarkdown = (text: string) => {
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g)
    
    return parts.map((part, index) => {
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={index}
            className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono"
          >
            {part.slice(1, -1)}
          </code>
        )
      }
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        )
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return (
          <em key={index} className="italic">
            {part.slice(1, -1)}
          </em>
        )
      }
      return part
    })
  }

  return <div className="prose prose-sm dark:prose-invert max-w-none">{renderMarkdown(content)}</div>
}

// ============================================
// Message Reactions Component
// ============================================

interface MessageReactionsProps {
  messageId: string
  onReact: (messageId: string, reaction: string) => void
}

const REACTIONS = [
  { emoji: "👍", icon: ThumbsUp, label: "Helpful" },
  { emoji: "💡", icon: Lightbulb, label: "Insightful" },
  { emoji: "⭐", icon: Star, label: "Save" },
]

function MessageReactions({ messageId, onReact }: MessageReactionsProps) {
  const [activeReaction, setActiveReaction] = useState<string | null>(null)
  const [showPicker, setShowPicker] = useState(false)

  const handleReaction = (reaction: string) => {
    setActiveReaction(reaction === activeReaction ? null : reaction)
    onReact(messageId, reaction)
    setShowPicker(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowPicker(!showPicker)}
        className={cn(
          "p-1 rounded transition-colors",
          showPicker ? "bg-muted" : "opacity-0 group-hover:opacity-100 hover:bg-muted"
        )}
      >
        {activeReaction ? (
          <span className="text-sm">{activeReaction}</span>
        ) : (
          <ThumbsUp className="size-3.5 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 5 }}
            className="absolute bottom-full left-0 mb-1 flex gap-1 p-1.5 bg-popover border border-border rounded-lg shadow-lg z-10"
          >
            {REACTIONS.map((reaction) => (
              <Tooltip key={reaction.emoji}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleReaction(reaction.emoji)}
                    className={cn(
                      "p-1.5 rounded transition-colors hover:bg-muted",
                      activeReaction === reaction.emoji && "bg-violet-100 dark:bg-violet-900/30"
                    )}
                  >
                    <span className="text-base">{reaction.emoji}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">{reaction.label}</TooltipContent>
              </Tooltip>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================
// Copy Button Component
// ============================================

function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
      title="Copy message"
    >
      {copied ? (
        <Check className="size-3.5 text-green-500" />
      ) : (
        <Copy className="size-3.5 text-muted-foreground" />
      )}
    </button>
  )
}

// ============================================
// Message Component
// ============================================

interface MessageProps {
  message: ChatMessage
  isLatest: boolean
  onReact: (messageId: string, reaction: string) => void
}

function Message({ message, isLatest, onReact }: MessageProps) {
  const isUser = message.role === "user"
  const isAssistant = message.role === "assistant"

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "group flex gap-3 px-4 py-3",
        isUser && "flex-row-reverse"
      )}
    >
      {/* Avatar */}
      <Avatar
        className={cn(
          "size-8 shrink-0",
          isUser && "bg-violet-600",
          isAssistant && "bg-muted"
        )}
      >
        <AvatarFallback
          className={cn(
            "text-xs font-medium",
            isUser && "bg-violet-600 text-white",
            isAssistant && "bg-muted text-muted-foreground"
          )}
        >
          {isUser ? "U" : <Sparkles className="size-4" />}
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div
        className={cn(
          "flex max-w-[80%] flex-col gap-1",
          isUser && "items-end"
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5",
            isUser && "bg-violet-600 text-white rounded-tr-sm",
            isAssistant && "bg-muted text-foreground rounded-tl-sm"
          )}
        >
          {isAssistant ? (
            <MarkdownRenderer content={message.content} />
          ) : (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          )}
        </div>

        {/* Message Footer */}
        <div
          className={cn(
            "flex items-center gap-2 px-1",
            isUser && "flex-row-reverse"
          )}
        >
          <span className="text-[10px] text-muted-foreground">
            {formatRelativeTime(message.createdAt)}
          </span>

          {/* Actions - only for assistant messages */}
          {isAssistant && (
            <div className="flex items-center gap-1">
              <MessageReactions messageId={message.id} onReact={onReact} />
              <CopyButton content={message.content} />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ============================================
// Typing Indicator Component (Enhanced)
// ============================================

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 px-4 py-3"
    >
      <Avatar className="size-8 shrink-0 bg-muted">
        <AvatarFallback className="bg-muted text-muted-foreground">
          <Sparkles className="size-4" />
        </AvatarFallback>
      </Avatar>
      <div className="flex items-center gap-3 rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
        <div className="flex gap-1.5">
          <motion.span
            className="size-2 rounded-full bg-violet-500"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
          />
          <motion.span
            className="size-2 rounded-full bg-violet-500"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
          />
          <motion.span
            className="size-2 rounded-full bg-violet-500"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
          />
        </div>
        <span className="text-xs text-muted-foreground">Thinking...</span>
      </div>
    </motion.div>
  )
}

// ============================================
// Context Chips Component (Clickable)
// ============================================

interface ContextChipsProps {
  goals: ReturnType<typeof useGoals>
  tasks: ReturnType<typeof useTasks>
  habits: ReturnType<typeof useHabits>
  habitLogs: ReturnType<typeof useHabitLogs>
  onChipClick: (prompt: string) => void
  disabled: boolean
}

function ContextChips({ goals, tasks, habits, habitLogs, onChipClick, disabled }: ContextChipsProps) {
  const activeTasks = tasks.filter((t) => t.status !== "completed")
  const today = new Date().toISOString().split("T")[0]
  const todaysLogs = habitLogs.filter((log) => log.date === today)
  const completedToday = todaysLogs.filter((log) => log.completed).length

  const chips = [
    {
      label: `Review my ${goals.length} goals`,
      prompt: "Give me a quick overview of all my goals and their progress. What should I prioritize?",
      icon: Target,
      count: goals.length,
      color: "text-violet-500",
    },
    {
      label: "Plan next 2 hours",
      prompt: "I have 2 hours of focused time. Based on my tasks and goals, what should I work on? Break it down into specific actions.",
      icon: Calendar,
      count: null,
      color: "text-blue-500",
    },
    {
      label: "What habit should I focus on?",
      prompt: "Looking at my habits and today's progress, which habit should I prioritize completing? Why?",
      icon: CheckSquare,
      count: habits.length,
      color: "text-green-500",
    },
    {
      label: "Summarize my week",
      prompt: "Give me a summary of my week so far. What went well? What needs attention?",
      icon: Sparkles,
      count: null,
      color: "text-amber-500",
    },
  ]

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 bg-muted/30 overflow-x-auto">
      <span className="text-xs text-muted-foreground shrink-0">Quick actions:</span>
      <div className="flex items-center gap-1.5">
        {chips.map((chip) => {
          const Icon = chip.icon
          return (
            <motion.button
              key={chip.label}
              onClick={() => onChipClick(chip.prompt)}
              disabled={disabled}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                "bg-background border border-border/50 hover:border-border hover:bg-muted/50",
                "transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <Icon className={cn("size-3", chip.color)} />
              <span>{chip.label}</span>
              {chip.count !== null && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-0.5">
                  {chip.count}
                </Badge>
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================
// Context Indicator Component
// ============================================

function ContextIndicator() {
  const goals = useGoals()
  const tasks = useTasks()
  const habits = useHabits()
  const habitLogs = useHabitLogs()

  const activeTasks = tasks.filter((t) => t.status !== "completed").length
  const today = new Date().toISOString().split("T")[0]
  const todaysLogs = habitLogs.filter((log) => log.date === today)
  const completedToday = todaysLogs.filter((log) => log.completed).length

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 bg-muted/30">
      <span className="text-xs text-muted-foreground">Context:</span>
      <div className="flex items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-[10px] font-normal cursor-default">
              <Target className="size-3" />
              {goals.length} goals
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Active goals in your system</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-[10px] font-normal cursor-default">
              <CheckSquare className="size-3" />
              {activeTasks} tasks
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Active tasks remaining</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-[10px] font-normal cursor-default">
              <Calendar className="size-3" />
              {completedToday}/{habits.length} habits
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Habits completed today</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}

// ============================================
// Welcome State Component with Sparkles
// ============================================

interface WelcomeStateProps {
  onQuickStart: (prompt: string) => void
}

function WelcomeState({ onQuickStart }: WelcomeStateProps) {
  const greeting = getDynamicGreeting()

  const quickStartCards = [
    {
      title: "Plan my day",
      description: "Get a prioritized schedule based on your tasks",
      prompt: "Help me plan my day. What should I focus on based on my current tasks and goals?",
      icon: Calendar,
      color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    },
    {
      title: "Review progress",
      description: "See how you're doing on goals and habits",
      prompt: "Give me a progress update on my goals and habits. What's going well?",
      icon: Target,
      color: "bg-violet-500/10 text-violet-500 border-violet-500/20",
    },
    {
      title: "Get motivated",
      description: "Find your next win to stay on track",
      prompt: "What's one quick win I can achieve right now to feel productive?",
      icon: Sparkles,
      color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    },
  ]

  return (
    <div className="relative flex flex-col items-center justify-center h-full min-h-[400px] text-center px-8 py-8">
      {/* Sparkle Background Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            initial={{ 
              x: Math.random() * 100 + "%", 
              y: Math.random() * 100 + "%",
              scale: 0,
              opacity: 0 
            }}
            animate={{ 
              scale: [0, 1, 0],
              opacity: [0, 0.6, 0],
              rotate: [0, 180]
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 3,
              ease: "easeInOut"
            }}
          >
            <Sparkles className="size-4 text-violet-300/40" />
          </motion.div>
        ))}
      </div>

      {/* Animated Welcome Icon */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative mb-4"
      >
        <div className="flex size-16 items-center justify-center rounded-full bg-violet-600/10">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="size-8 text-violet-600" />
          </motion.div>
        </div>
        
        {/* Pulsing ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-violet-500/30"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
        />
      </motion.div>

      {/* Dynamic Greeting */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <h3 className="text-xl font-semibold mb-1 flex items-center gap-2">
          <span>{greeting.emoji}</span>
          <span>{greeting.headline}</span>
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          {greeting.subtext}
        </p>
      </motion.div>

      {/* Quick Start Cards */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl"
      >
        {quickStartCards.map((card, index) => {
          const Icon = card.icon
          return (
            <motion.button
              key={card.title}
              onClick={() => onQuickStart(card.prompt)}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.25 + index * 0.1 }}
              className={cn(
                "flex flex-col items-center p-4 rounded-xl border text-left",
                "bg-background/50 hover:bg-background transition-colors",
                card.color
              )}
            >
              <div className="p-2 rounded-lg bg-background mb-2">
                <Icon className="size-5" />
              </div>
              <h4 className="text-sm font-medium text-foreground">{card.title}</h4>
              <p className="text-xs text-muted-foreground text-center mt-1">
                {card.description}
              </p>
            </motion.button>
          )
        })}
      </motion.div>
    </div>
  )
}

// ============================================
// Main ChatPanel Component
// ============================================

export function ChatPanel() {
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Store state and actions
  const goals = useGoals()
  const tasks = useTasks()
  const habits = useHabits()
  const habitLogs = useHabitLogs()
  const currentConversation = useCurrentConversation()
  const chatLoading = useLifeOSStore((state) => state.chatLoading)
  
  const addConversation = useLifeOSStore((state) => state.addConversation)
  const setCurrentConversationId = useLifeOSStore((state) => state.setCurrentConversationId)
  const addMessageToConversation = useLifeOSStore((state) => state.addMessageToConversation)
  const setChatLoading = useLifeOSStore((state) => state.setChatLoading)
  const deleteConversation = useLifeOSStore((state) => state.deleteConversation)

  // Get messages from current conversation or empty array
  const messages = currentConversation?.messages || []

  // Dynamic greeting based on time
  const greeting = useMemo(() => getDynamicGreeting(), [])
  const assistantStatus = useMemo(() => getAssistantStatus(), [])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, chatLoading, isTyping])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Ensure we have a conversation
  const ensureConversation = useCallback(async () => {
    if (!currentConversation) {
      const newConversation = await chatApiHelpers.createConversation("New Chat")
      addConversation(newConversation)
      setCurrentConversationId(newConversation.id)
      return newConversation.id
    }
    return currentConversation.id
  }, [currentConversation, addConversation, setCurrentConversationId])

  // Handle message reactions
  const handleReaction = useCallback((messageId: string, reaction: string) => {
    // In a real app, this would persist to the store/database
    console.log(`Reaction ${reaction} added to message ${messageId}`)
  }, [])

  // Handle sending a message with typing delay
  const handleSendMessage = useCallback(async (messageContent?: string) => {
    const content = messageContent || input.trim()
    if (!content || chatLoading) return

    // Ensure we have a conversation
    const conversationId = await ensureConversation()

    // Create and add user message
    const userMessage = await chatApiHelpers.createMessage("user", content)
    addMessageToConversation(conversationId, userMessage)
    setInput("")

    // Show typing indicator with random delay (300-600ms)
    setIsTyping(true)
    const typingDelay = 300 + Math.random() * 300
    
    await new Promise(resolve => setTimeout(resolve, typingDelay))
    setIsTyping(false)
    setChatLoading(true)
    
    try {
      // Build context for AI
      const activeTasks = tasks.filter(t => t.status !== "completed")
      const context = {
        goalsCount: goals.length,
        activeTasks: activeTasks.length,
        todayHabits: habits.length,
        goalsSummary: goals.length > 0 ? goals.map(g => g.title).join(", ") : undefined,
        tasksSummary: activeTasks.length > 0 ? activeTasks.slice(0, 5).map(t => t.title).join(", ") : undefined,
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: conversationId,
          message: content,
          context,
        }),
      })

      const data = await response.json()

      if (data.success && data.response) {
        const assistantMessage = await chatApiHelpers.createMessage("assistant", data.response)
        addMessageToConversation(conversationId, assistantMessage)
      } else {
        const aiResponse = generateAIResponse(content, { goals, tasks, habits, habitLogs })
        const assistantMessage = await chatApiHelpers.createMessage("assistant", aiResponse)
        addMessageToConversation(conversationId, assistantMessage)
      }
    } catch (error) {
      console.error("Chat API error:", error)
      const aiResponse = generateAIResponse(content, { goals, tasks, habits, habitLogs })
      const assistantMessage = await chatApiHelpers.createMessage("assistant", aiResponse)
      addMessageToConversation(conversationId, assistantMessage)
    } finally {
      setChatLoading(false)
    }
  }, [input, chatLoading, ensureConversation, addMessageToConversation, setChatLoading, goals, tasks, habits, habitLogs])

  // Handle clearing conversation
  const handleClearConversation = useCallback(() => {
    if (currentConversation) {
      deleteConversation(currentConversation.id)
      setCurrentConversationId(null)
    }
  }, [currentConversation, deleteConversation, setCurrentConversationId])

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <motion.div 
            className="flex size-8 items-center justify-center rounded-lg bg-violet-600 text-white"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="size-4" />
          </motion.div>
          <div>
            <h2 className="text-sm font-semibold">LifeOS Assistant</h2>
            <p className="text-xs text-muted-foreground">
              {chatLoading || isTyping ? "Thinking..." : assistantStatus}
            </p>
          </div>
        </div>

        {/* Clear Conversation Button */}
        {messages.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear conversation?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this conversation. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearConversation}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  Clear
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Context Awareness Indicator */}
      <ContextIndicator />

      {/* Context Chips (Clickable) */}
      <ContextChips
        goals={goals}
        tasks={tasks}
        habits={habits}
        habitLogs={habitLogs}
        onChipClick={handleSendMessage}
        disabled={chatLoading || isTyping}
      />

      {/* Messages Area */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="flex flex-col py-2">
          {messages.length === 0 ? (
            <WelcomeState onQuickStart={handleSendMessage} />
          ) : (
            <AnimatePresence mode="popLayout">
              {messages.map((message, index) => (
                <Message
                  key={message.id}
                  message={message}
                  isLatest={index === messages.length - 1}
                  onReact={handleReaction}
                />
              ))}
            </AnimatePresence>
          )}
          
          {/* Typing Indicator */}
          {isTyping && <TypingIndicator />}
          
          {/* Loading Indicator */}
          {chatLoading && !isTyping && <TypingIndicator />}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            placeholder="Ask me anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={chatLoading || isTyping}
            className="flex-1"
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || chatLoading || isTyping}
                className="bg-violet-600 hover:bg-violet-700"
              >
                <Send className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Send message (Enter)</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          Press <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">Enter</kbd> to send, 
          <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px] ml-1">Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  )
}

// ============================================
// AI Response Generator (Mock)
// ============================================

interface AIContext {
  goals: ReturnType<typeof useGoals>
  tasks: ReturnType<typeof useTasks>
  habits: ReturnType<typeof useHabits>
  habitLogs: ReturnType<typeof useHabitLogs>
}

function generateAIResponse(userMessage: string, context: AIContext): string {
  const lowerMessage = userMessage.toLowerCase()
  const time = getTimeOfDay()
  
  // Time-based personality prefix
  const personalityPrefix = {
    morning: "Good morning! ☀️ ",
    afternoon: "Good afternoon! 💪 ",
    evening: "Good evening! 🌙 ",
  }
  
  // Check for planning related queries
  if (lowerMessage.includes("plan") || lowerMessage.includes("focus") || lowerMessage.includes("prioritize")) {
    const activeTasks = context.tasks.filter(t => t.status !== "completed")
    const highPriorityTasks = activeTasks.filter(t => t.priority === "high" || t.priority === "urgent")
    
    if (activeTasks.length === 0) {
      return `${personalityPrefix[time]}You don't have any active tasks right now. This might be a good time to work on your goals or add some tasks to your list. Want me to suggest something?`
    }
    
    let response = `${personalityPrefix[time]}Here's my suggestion for your day:\n\n`
    
    if (highPriorityTasks.length > 0) {
      response += `**Priority Focus:**\n`
      highPriorityTasks.slice(0, 3).forEach((task, i) => {
        response += `${i + 1}. **${task.title}** - ${task.priority} priority\n`
      })
      response += `\n`
    }
    
    response += `You have **${activeTasks.length} active tasks** in total. `
    
    if (context.goals.length > 0) {
      const inProgressGoals = context.goals.filter(g => g.status === "in_progress")
      response += `You're also working on **${inProgressGoals.length} goals**. `
    }
    
    response += `\n\nWould you like me to help break down any of these tasks into smaller steps? 🎯`
    
    return response
  }
  
  // Check for notes summarization
  if (lowerMessage.includes("note") || lowerMessage.includes("summarize")) {
    return `${personalityPrefix[time]}I can help you summarize your notes. However, you currently don't have any notes saved in the system.\n\nTo get started:\n1. Go to the **Notes** section\n2. Create a new note with your thoughts\n3. Come back and I'll help you find key insights!\n\nIs there anything else I can help you with?`
  }
  
  // Check for next task suggestion
  if (lowerMessage.includes("next") || lowerMessage.includes("should i") || lowerMessage.includes("what do")) {
    const activeTasks = context.tasks.filter(t => t.status !== "completed")
    const inProgressTasks = activeTasks.filter(t => t.status === "in_progress")
    
    if (inProgressTasks.length > 0) {
      return `${personalityPrefix[time]}You're currently working on:\n\n**${inProgressTasks[0].title}**\n\nI'd recommend finishing this before starting something new. Once done, I can suggest your next priority based on your goals.\n\nNeed help with this task? 💡`
    }
    
    if (activeTasks.length > 0) {
      const nextTask = activeTasks.sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      })[0]
      
      return `${personalityPrefix[time]}Based on priority, I suggest working on:\n\n**${nextTask.title}**\n\nThis is marked as **${nextTask.priority}** priority${nextTask.dueDate ? ` and is due ${new Date(nextTask.dueDate).toLocaleDateString()}` : ""}.\n\nWould you like me to help you break this down into steps?`
    }
    
    return `${personalityPrefix[time]}You've completed all your tasks! 🎉\n\nThis is a great time to:\n- Review your **goals** and add related tasks\n- Take time for deep work on long-term projects\n- Plan ahead for tomorrow\n\nWhat would you like to focus on?`
  }
  
  // Check for habits
  if (lowerMessage.includes("habit") || lowerMessage.includes("routine")) {
    const today = new Date().toISOString().split("T")[0]
    const todaysLogs = context.habitLogs.filter(log => log.date === today)
    const completedCount = todaysLogs.filter(log => log.completed).length
    
    return `${personalityPrefix[time]}Today's habit progress: **${completedCount}/${context.habits.length}** completed\n\n${context.habits.length === 0 
      ? "You haven't set up any habits yet. Go to the **Habits** section to create your first one! 🌱" 
      : "Keep up the great work! Consistency is key to building lasting habits. 💪"}\n\nWould you like me to suggest some habits based on your goals?`
  }
  
  // Check for goals
  if (lowerMessage.includes("goal") || lowerMessage.includes("objective") || lowerMessage.includes("target")) {
    const inProgressGoals = context.goals.filter(g => g.status === "in_progress")
    
    if (context.goals.length === 0) {
      return `${personalityPrefix[time]}You haven't set any goals yet. Setting clear goals is a great way to stay focused and motivated! 🎯\n\nWould you like help creating your first goal? I can guide you through the process.`
    }
    
    let response = `${personalityPrefix[time]}You have **${context.goals.length} goals** set up.\n\n`
    
    if (inProgressGoals.length > 0) {
      response += "**Currently in progress:**\n"
      inProgressGoals.forEach((goal, i) => {
        response += `${i + 1}. ${goal.title} - ${goal.progress}% complete\n`
      })
    }
    
    response += "\nWhat would you like to know about your goals?"
    
    return response
  }
  
  // Default response
  return `${personalityPrefix[time]}I'm here to help you stay organized and productive!\n\nHere's what I can do:\n- **Plan your day** - Get a prioritized list of tasks\n- **Track habits** - See your daily progress\n- **Review goals** - Check on your objectives\n- **Suggest next steps** - Find what to work on next\n\nJust ask me anything about your tasks, habits, or goals! 💬`
}

export default ChatPanel
