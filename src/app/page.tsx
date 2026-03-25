"use client";

import { AppLayout, Dashboard, PlannerView, GoalsView, HabitsView, NotesView, AnalyticsView, ChatPanel } from "@/components/lifeos";
import { useLifeOSStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const currentView = useLifeOSStore((state) => state.currentView);

  const renderView = () => {
    switch (currentView) {
      case "dashboard":
        return <Dashboard />;
      case "planner":
        return <PlannerView />;
      case "goals":
        return <GoalsView />;
      case "habits":
        return <HabitsView />;
      case "notes":
        return <NotesView />;
      case "analytics":
        return <AnalyticsView />;
      case "chat":
        return <ChatPanel />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <AppLayout>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentView}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="h-full"
        >
          {renderView()}
        </motion.div>
      </AnimatePresence>
    </AppLayout>
  );
}
