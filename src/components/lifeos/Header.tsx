"use client"

import * as React from "react"
import { Moon, Sun, Search, Command, Clock, TrendingUp, ArrowRight } from "lucide-react"
import { useTheme } from "next-themes"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useCurrentView, useLifeOSStore, type ViewSection } from "@/lib/store"

// Section titles mapping
const sectionTitles: Record<ViewSection, string> = {
  dashboard: "Dashboard",
  planner: "Planner",
  goals: "Goals",
  habits: "Habits",
  notes: "Notes",
  analytics: "Analytics",
  chat: "Chat",
}

// Sample recent searches (would come from store/API in real app)
const recentSearches = [
  { id: "1", query: "Project Alpha tasks", type: "tasks" as const, timestamp: "2 hours ago" },
  { id: "2", query: "Weekly review notes", type: "notes" as const, timestamp: "Yesterday" },
  { id: "3", query: "Fitness goals progress", type: "goals" as const, timestamp: "3 days ago" },
  { id: "4", query: "Morning routine habit", type: "habits" as const, timestamp: "Last week" },
]

// Quick actions for search dropdown
const quickActions = [
  { label: "Create new task", shortcut: "⌘N", action: "task" },
  { label: "Go to Goals", shortcut: "⌘G", action: "goals" },
  { label: "Start focus session", shortcut: "⌘F", action: "focus" },
]

// Theme toggle component
function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="size-9 transition-all duration-200 hover:bg-accent hover:scale-105 active:scale-95"
        >
          <Sun className="size-4 rotate-0 scale-100 transition-all duration-200 dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-4 rotate-90 scale-0 transition-all duration-200 dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>Toggle theme</p>
      </TooltipContent>
    </Tooltip>
  )
}

// Search dropdown component
interface SearchDropdownProps {
  isOpen: boolean
  searchQuery: string
  onClose: () => void
  onSelectItem: (query: string) => void
}

function SearchDropdown({ isOpen, searchQuery, onClose, onSelectItem }: SearchDropdownProps) {
  const setCurrentView = useLifeOSStore((state) => state.setCurrentView)
  
  const filteredSearches = searchQuery 
    ? recentSearches.filter(s => 
        s.query.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : recentSearches
  
  const handleActionClick = (action: string) => {
    if (action === "goals") {
      setCurrentView("goals")
    } else if (action === "task") {
      setCurrentView("planner")
    }
    onClose()
  }
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-full left-0 right-0 mt-2 z-50 bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
        >
          {/* Recent searches */}
          {!searchQuery && (
            <div className="p-2">
              <div className="text-xs font-medium text-muted-foreground px-2 py-1.5 flex items-center gap-1.5">
                <Clock className="size-3" />
                Recent Searches
              </div>
              {recentSearches.map((item, index) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onSelectItem(item.query)}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-md text-sm hover:bg-accent transition-colors group"
                >
                  <Search className="size-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-left truncate">{item.query}</span>
                  <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.timestamp}
                  </span>
                </motion.button>
              ))}
            </div>
          )}
          
          {/* Filtered results */}
          {searchQuery && (
            <div className="p-2">
              <div className="text-xs font-medium text-muted-foreground px-2 py-1.5 flex items-center gap-1.5">
                <TrendingUp className="size-3" />
                Results for "{searchQuery}"
              </div>
              {filteredSearches.length > 0 ? (
                filteredSearches.map((item, index) => (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => onSelectItem(item.query)}
                    className="w-full flex items-center gap-3 px-2 py-2 rounded-md text-sm hover:bg-accent transition-colors"
                  >
                    <Search className="size-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-left truncate">{item.query}</span>
                  </motion.button>
                ))
              ) : (
                <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                  No results found
                </div>
              )}
            </div>
          )}
          
          {/* Quick actions */}
          <div className="border-t border-border p-2 bg-muted/30">
            <div className="text-xs font-medium text-muted-foreground px-2 py-1.5">
              Quick Actions
            </div>
            {quickActions.map((action, index) => (
              <motion.button
                key={action.action}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: (searchQuery ? filteredSearches.length : recentSearches.length) * 0.05 + index * 0.05 }}
                onClick={() => handleActionClick(action.action)}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-md text-sm hover:bg-accent transition-colors group"
              >
                <ArrowRight className="size-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                <span className="flex-1 text-left">{action.label}</span>
                <kbd className="kbd-shortcut">{action.shortcut}</kbd>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Mobile search trigger button
function SearchTrigger() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 transition-all duration-200 hover:bg-accent hover:scale-105 active:scale-95"
        >
          <Search className="size-4" />
          <span className="sr-only">Search</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p className="flex items-center gap-2">
          Search
          <kbd className="kbd-shortcut">⌘K</kbd>
        </p>
      </TooltipContent>
    </Tooltip>
  )
}

interface HeaderProps {
  className?: string
}

export function Header({ className }: HeaderProps) {
  const currentView = useCurrentView()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isSearchFocused, setIsSearchFocused] = React.useState(false)
  const searchInputRef = React.useRef<HTMLInputElement>(null)
  
  // Get current section title
  const sectionTitle = sectionTitles[currentView] || "LifeOS"
  
  // Handle keyboard shortcut for search
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      
      // Close search on escape
      if (e.key === "Escape" && isSearchFocused) {
        searchInputRef.current?.blur()
        setIsSearchFocused(false)
      }
    }
    
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isSearchFocused])
  
  const handleSearchSelect = (query: string) => {
    setSearchQuery(query)
    setIsSearchFocused(false)
    searchInputRef.current?.blur()
  }

  return (
    <TooltipProvider delayDuration={300}>
      <header
        className={cn(
          "sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-border bg-background/80 backdrop-blur-xl px-4 transition-all duration-200",
          className
        )}
      >
        {/* Left section: Sidebar trigger + Title */}
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-1 size-9 hover:scale-105 active:scale-95 transition-transform" />
          
          {/* Section Title */}
          <motion.div 
            className="flex items-center gap-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            key={currentView}
          >
            <h1 className="text-base font-semibold tracking-tight">
              {sectionTitle}
            </h1>
          </motion.div>
        </div>

        {/* Center section: Search bar (desktop only) */}
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <div className="relative w-full group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none z-10" />
            <motion.div
              className={cn(
                "relative rounded-md",
                isSearchFocused && "ring-2 ring-primary/30 shadow-[0_0_16px_-4px_rgba(139,92,246,0.3)]"
              )}
              animate={{
                boxShadow: isSearchFocused 
                  ? "0 0 0 2px rgba(139, 92, 246, 0.2), 0 0 16px -4px rgba(139, 92, 246, 0.3)"
                  : "0 0 0 0 transparent"
              }}
              transition={{ duration: 0.2 }}
            >
              <Input
                ref={searchInputRef}
                type="search"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                className={cn(
                  "w-full h-9 pl-9 pr-12 bg-muted/50 border-0 transition-all duration-200",
                  "focus-visible:ring-0 focus-visible:bg-background",
                  "placeholder:text-muted-foreground/60"
                )}
              />
            </motion.div>
            
            {/* Keyboard shortcut indicator */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pointer-events-none">
              <kbd className="kbd-shortcut opacity-60 group-hover:opacity-100 transition-opacity">
                <Command className="size-2.5" />
              </kbd>
              <kbd className="kbd-shortcut opacity-60 group-hover:opacity-100 transition-opacity">
                K
              </kbd>
            </div>
            
            {/* Search dropdown */}
            <SearchDropdown
              isOpen={isSearchFocused}
              searchQuery={searchQuery}
              onClose={() => setIsSearchFocused(false)}
              onSelectItem={handleSearchSelect}
            />
          </div>
        </div>

        {/* Right section: Actions */}
        <div className="flex items-center gap-1">
          {/* Mobile search button */}
          <div className="md:hidden">
            <SearchTrigger />
          </div>
          
          {/* Theme toggle */}
          <ThemeToggle />
        </div>
      </header>
    </TooltipProvider>
  )
}

export default Header
