"use client"

import * as React from "react"

import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"
import { cn } from "@/lib/utils"

interface AppLayoutProps {
  children: React.ReactNode
  className?: string
}

export function AppLayout({ children, className }: AppLayoutProps) {
  return (
    <SidebarProvider
      defaultOpen={true}
      style={
        {
          "--sidebar-width": "16rem",
          "--sidebar-width-icon": "3.5rem",
        } as React.CSSProperties
      }
    >
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content Area */}
      <SidebarInset className="flex flex-col min-h-screen">
        {/* Header */}
        <Header />
        
        {/* Page Content */}
        <main
          className={cn(
            "flex-1 overflow-auto",
            "p-4 md:p-6 lg:p-8",
            "bg-background",
            className
          )}
        >
          {/* Content wrapper with subtle animation */}
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default AppLayout
