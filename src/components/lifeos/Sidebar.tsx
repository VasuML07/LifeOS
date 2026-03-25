"use client"

import * as React from "react"
import {
  LayoutDashboard,
  CalendarDays,
  Target,
  CheckSquare,
  FileText,
  BarChart3,
  MessageSquare,
  Settings,
  LogOut,
  ChevronUp,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useLifeOSStore, useCurrentView, type ViewSection } from "@/lib/store"

// Navigation items configuration
const navigationItems: { title: string; view: ViewSection; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  {
    title: "Dashboard",
    view: "dashboard",
    icon: LayoutDashboard,
    description: "Overview and insights",
  },
  {
    title: "Planner",
    view: "planner",
    icon: CalendarDays,
    description: "Schedule and tasks",
  },
  {
    title: "Goals",
    view: "goals",
    icon: Target,
    description: "Track your objectives",
  },
  {
    title: "Habits",
    view: "habits",
    icon: CheckSquare,
    description: "Daily routines",
  },
  {
    title: "Notes",
    view: "notes",
    icon: FileText,
    description: "Capture thoughts",
  },
  {
    title: "Analytics",
    view: "analytics",
    icon: BarChart3,
    description: "Progress insights",
  },
  {
    title: "Chat",
    view: "chat",
    icon: MessageSquare,
    description: "AI assistant",
  },
]

// Ripple effect component for sidebar items
function RippleEffect({ x, y }: { x: number; y: number }) {
  return (
    <motion.span
      initial={{ scale: 0, opacity: 0.5 }}
      animate={{ scale: 4, opacity: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="absolute w-4 h-4 rounded-full bg-primary/30 pointer-events-none"
      style={{ left: x - 8, top: y - 8 }}
    />
  )
}

// Navigation item with animations
interface NavItemProps {
  item: typeof navigationItems[0]
  isActive: boolean
  isCollapsed: boolean
  onClick: () => void
  index: number
}

function NavItem({ item, isActive, isCollapsed, onClick, index }: NavItemProps) {
  const [ripple, setRipple] = React.useState<{ x: number; y: number } | null>(null)
  
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setRipple({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
    
    // Clear ripple after animation
    setTimeout(() => setRipple(null), 600)
    
    onClick()
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ 
        delay: index * 0.05,
        duration: 0.3,
        ease: [0.16, 1, 0.3, 1] // ease-out
      }}
    >
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={isActive}
          tooltip={item.title}
          onClick={handleClick}
          className={cn(
            "h-10 px-3 relative overflow-hidden cursor-pointer",
            "transition-all duration-200 ease-out",
            "hover:scale-[1.02] hover:bg-sidebar-accent",
            "active:scale-[0.98]",
            isActive && [
              "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
              "sidebar-active-glow"
            ]
          )}
        >
          {/* Ripple effect */}
          <AnimatePresence>
            {ripple && <RippleEffect x={ripple.x} y={ripple.y} />}
          </AnimatePresence>
          
          {/* Active indicator glow bar */}
          {isActive && (
            <motion.div
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-r-[2px] bg-primary"
              style={{
                boxShadow: "0 0 12px 2px rgba(139, 92, 246, 0.4)",
              }}
            />
          )}
          
          <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <item.icon className="size-5 shrink-0 relative z-10" />
          </motion.div>
          
          {!isCollapsed && (
            <motion.span 
              className="truncate relative z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {item.title}
            </motion.span>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    </motion.div>
  )
}

// Logo component with animation
function LifeOSLogo({ collapsed = false }: { collapsed?: boolean }) {
  const setCurrentView = useLifeOSStore((state) => state.setCurrentView)
  
  return (
    <motion.button
      onClick={() => setCurrentView("dashboard")}
      className="flex items-center gap-2 px-2 py-1 transition-opacity hover:opacity-80 w-full"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <motion.div 
        className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
        whileHover={{ rotate: 10 }}
        transition={{ duration: 0.2 }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
          <path d="M2 12h20" />
        </svg>
      </motion.div>
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col text-left overflow-hidden"
          >
            <span className="text-base font-semibold tracking-tight">LifeOS</span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">Your life, organized</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

// User profile data (would come from auth in real app)
const userData = {
  name: "Alex Johnson",
  email: "alex@example.com",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",
}

export function Sidebar() {
  const currentView = useCurrentView()
  const setCurrentView = useLifeOSStore((state) => state.setCurrentView)
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  return (
    <SidebarRoot
      collapsible="icon"
      className="border-r border-sidebar-border"
    >
      {/* Header with Logo */}
      <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
        <LifeOSLogo collapsed={isCollapsed} />
      </SidebarHeader>

      {/* Navigation Content */}
      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  Navigation
                </motion.span>
              )}
            </AnimatePresence>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item, index) => {
                const isActive = currentView === item.view
                return (
                  <NavItem
                    key={item.view}
                    item={item}
                    isActive={isActive}
                    isCollapsed={isCollapsed}
                    onClick={() => setCurrentView(item.view)}
                    index={index}
                  />
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with User Profile */}
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  className="h-12 px-2 data-[state=open]:bg-sidebar-accent ripple overflow-hidden"
                  tooltip="Account"
                >
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Avatar className="size-8">
                      <AvatarImage src={userData.avatar} alt={userData.name} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                        {userData.name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                  </motion.div>
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-1 items-center justify-between overflow-hidden"
                      >
                        <div className="flex flex-col items-start gap-0.5 min-w-0">
                          <span className="text-sm font-medium truncate">{userData.name}</span>
                          <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                            {userData.email}
                          </span>
                        </div>
                        <ChevronUp className="size-4 text-muted-foreground shrink-0" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align={isCollapsed ? "center" : "end"}
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
              >
                <DropdownMenuItem className="cursor-pointer hover:bg-accent transition-colors">
                  <Settings className="size-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer hover:bg-destructive/10 transition-colors">
                  <LogOut className="size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {/* Rail for resize */}
      <SidebarRail />
    </SidebarRoot>
  )
}

export default Sidebar
