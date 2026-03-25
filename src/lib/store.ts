import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// ============================================
// Type Definitions
// ============================================

export type ViewSection = 'dashboard' | 'planner' | 'goals' | 'habits' | 'notes' | 'analytics' | 'chat';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type GoalStatus = 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled';

export type HabitFrequency = 'daily' | 'weekly' | 'monthly';

export type Theme = 'light' | 'dark' | 'system';

// ============================================
// User Types
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Task Types
// ============================================

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string;
  completedAt?: string;
  goalId?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: string;
  goalId?: string;
  tags?: string[];
}

// ============================================
// Goal Types
// ============================================

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: GoalStatus;
  progress: number; // 0-100
  targetDate?: string;
  parentGoalId?: string;
  categories: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GoalInput {
  title: string;
  description?: string;
  status?: GoalStatus;
  progress?: number;
  targetDate?: string;
  parentGoalId?: string;
  categories?: string[];
}

// ============================================
// Habit Types
// ============================================

export interface Habit {
  id: string;
  userId: string;
  name: string;
  description?: string;
  frequency: HabitFrequency;
  targetCount: number; // e.g., 1 for daily, 3 for 3 times per week
  color: string;
  icon?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  userId: string;
  date: string; // ISO date string
  completed: boolean;
  count: number;
  note?: string;
  createdAt: string;
}

export interface HabitInput {
  name: string;
  description?: string;
  frequency?: HabitFrequency;
  targetCount?: number;
  color?: string;
  icon?: string;
  isActive?: boolean;
}

export interface HabitLogInput {
  habitId: string;
  date: string;
  completed?: boolean;
  count?: number;
  note?: string;
}

// ============================================
// Note Types
// ============================================

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  category?: string;
  tags: string[];
  isPinned: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NoteInput {
  title: string;
  content?: string;
  category?: string;
  tags?: string[];
  isPinned?: boolean;
  isArchived?: boolean;
}

// ============================================
// Chat Types
// ============================================

export interface ChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface ChatConversation {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

// ============================================
// UI State Types
// ============================================

export interface UIState {
  sidebarCollapsed: boolean;
  theme: Theme;
  isLoading: boolean;
  loadingMessage?: string;
  isMobileMenuOpen: boolean;
  activeModal?: string;
  toasts: Toast[];
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

// ============================================
// Store State Interface
// ============================================

interface LifeOSState {
  // User
  currentUser: User | null;
  
  // Current View
  currentView: ViewSection;
  
  // Tasks
  tasks: Task[];
  tasksLoading: boolean;
  
  // Goals
  goals: Goal[];
  goalsLoading: boolean;
  
  // Habits
  habits: Habit[];
  habitsLoading: boolean;
  habitLogs: HabitLog[];
  
  // Notes
  notes: Note[];
  notesLoading: boolean;
  
  // Chat
  conversations: ChatConversation[];
  currentConversationId: string | null;
  chatLoading: boolean;
  
  // UI State
  ui: UIState;
  
  // User Actions
  setCurrentUser: (user: User | null) => void;
  
  // View Actions
  setCurrentView: (view: ViewSection) => void;
  
  // Task Actions
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  setTasksLoading: (loading: boolean) => void;
  
  // Goal Actions
  setGoals: (goals: Goal[]) => void;
  addGoal: (goal: Goal) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  setGoalsLoading: (loading: boolean) => void;
  
  // Habit Actions
  setHabits: (habits: Habit[]) => void;
  addHabit: (habit: Habit) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  setHabitsLoading: (loading: boolean) => void;
  
  // Habit Log Actions
  setHabitLogs: (logs: HabitLog[]) => void;
  addHabitLog: (log: HabitLog) => void;
  updateHabitLog: (id: string, updates: Partial<HabitLog>) => void;
  deleteHabitLog: (id: string) => void;
  
  // Note Actions
  setNotes: (notes: Note[]) => void;
  addNote: (note: Note) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  setNotesLoading: (loading: boolean) => void;
  
  // Chat Actions
  setConversations: (conversations: ChatConversation[]) => void;
  addConversation: (conversation: ChatConversation) => void;
  updateConversation: (id: string, updates: Partial<ChatConversation>) => void;
  deleteConversation: (id: string) => void;
  setCurrentConversationId: (id: string | null) => void;
  addMessageToConversation: (conversationId: string, message: ChatMessage) => void;
  setChatLoading: (loading: boolean) => void;
  
  // UI Actions
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setTheme: (theme: Theme) => void;
  setLoading: (loading: boolean, message?: string) => void;
  setMobileMenuOpen: (open: boolean) => void;
  setActiveModal: (modal?: string) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  
  // Reset Actions
  resetStore: () => void;
}

// ============================================
// Initial States
// ============================================

const initialUIState: UIState = {
  sidebarCollapsed: false,
  theme: 'system',
  isLoading: false,
  loadingMessage: undefined,
  isMobileMenuOpen: false,
  activeModal: undefined,
  toasts: [],
};

const mockUser: User = {
  id: 'user_1',
  email: 'user@lifeos.app',
  name: 'Demo User',
  avatar: undefined,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ============================================
// Helper Functions
// ============================================

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// ============================================
// Store Creation
// ============================================

export const useLifeOSStore = create<LifeOSState>()(
  devtools(
    persist(
      (set, get) => ({
        // ============================================
        // Initial State
        // ============================================
        currentUser: mockUser,
        currentView: 'dashboard',
        
        tasks: [],
        tasksLoading: false,
        
        goals: [],
        goalsLoading: false,
        
        habits: [],
        habitsLoading: false,
        habitLogs: [],
        
        notes: [],
        notesLoading: false,
        
        conversations: [],
        currentConversationId: null,
        chatLoading: false,
        
        ui: initialUIState,
        
        // ============================================
        // User Actions
        // ============================================
        setCurrentUser: (user) => set({ currentUser: user }),
        
        // ============================================
        // View Actions
        // ============================================
        setCurrentView: (view) => set({ currentView: view }),
        
        // ============================================
        // Task Actions
        // ============================================
        setTasks: (tasks) => set({ tasks }),
        
        addTask: (task) => set((state) => ({
          tasks: [...state.tasks, task]
        })),
        
        updateTask: (id, updates) => set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, ...updates, updatedAt: new Date().toISOString() } : task
          )
        })),
        
        deleteTask: (id) => set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id)
        })),
        
        setTasksLoading: (loading) => set({ tasksLoading: loading }),
        
        // ============================================
        // Goal Actions
        // ============================================
        setGoals: (goals) => set({ goals }),
        
        addGoal: (goal) => set((state) => ({
          goals: [...state.goals, goal]
        })),
        
        updateGoal: (id, updates) => set((state) => ({
          goals: state.goals.map((goal) =>
            goal.id === id ? { ...goal, ...updates, updatedAt: new Date().toISOString() } : goal
          )
        })),
        
        deleteGoal: (id) => set((state) => ({
          goals: state.goals.filter((goal) => goal.id !== id)
        })),
        
        setGoalsLoading: (loading) => set({ goalsLoading: loading }),
        
        // ============================================
        // Habit Actions
        // ============================================
        setHabits: (habits) => set({ habits }),
        
        addHabit: (habit) => set((state) => ({
          habits: [...state.habits, habit]
        })),
        
        updateHabit: (id, updates) => set((state) => ({
          habits: state.habits.map((habit) =>
            habit.id === id ? { ...habit, ...updates, updatedAt: new Date().toISOString() } : habit
          )
        })),
        
        deleteHabit: (id) => set((state) => ({
          habits: state.habits.filter((habit) => habit.id !== id)
        })),
        
        setHabitsLoading: (loading) => set({ habitsLoading: loading }),
        
        // ============================================
        // Habit Log Actions
        // ============================================
        setHabitLogs: (logs) => set({ habitLogs: logs }),
        
        addHabitLog: (log) => set((state) => ({
          habitLogs: [...state.habitLogs, log]
        })),
        
        updateHabitLog: (id, updates) => set((state) => ({
          habitLogs: state.habitLogs.map((log) =>
            log.id === id ? { ...log, ...updates } : log
          )
        })),
        
        deleteHabitLog: (id) => set((state) => ({
          habitLogs: state.habitLogs.filter((log) => log.id !== id)
        })),
        
        // ============================================
        // Note Actions
        // ============================================
        setNotes: (notes) => set({ notes }),
        
        addNote: (note) => set((state) => ({
          notes: [...state.notes, note]
        })),
        
        updateNote: (id, updates) => set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id ? { ...note, ...updates, updatedAt: new Date().toISOString() } : note
          )
        })),
        
        deleteNote: (id) => set((state) => ({
          notes: state.notes.filter((note) => note.id !== id)
        })),
        
        setNotesLoading: (loading) => set({ notesLoading: loading }),
        
        // ============================================
        // Chat Actions
        // ============================================
        setConversations: (conversations) => set({ conversations }),
        
        addConversation: (conversation) => set((state) => ({
          conversations: [...state.conversations, conversation]
        })),
        
        updateConversation: (id, updates) => set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === id ? { ...conv, ...updates, updatedAt: new Date().toISOString() } : conv
          )
        })),
        
        deleteConversation: (id) => set((state) => ({
          conversations: state.conversations.filter((conv) => conv.id !== id),
          currentConversationId: state.currentConversationId === id ? null : state.currentConversationId
        })),
        
        setCurrentConversationId: (id) => set({ currentConversationId: id }),
        
        addMessageToConversation: (conversationId, message) => set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? { ...conv, messages: [...conv.messages, message], updatedAt: new Date().toISOString() }
              : conv
          )
        })),
        
        setChatLoading: (loading) => set({ chatLoading: loading }),
        
        // ============================================
        // UI Actions
        // ============================================
        setSidebarCollapsed: (collapsed) => set((state) => ({
          ui: { ...state.ui, sidebarCollapsed: collapsed }
        })),
        
        toggleSidebar: () => set((state) => ({
          ui: { ...state.ui, sidebarCollapsed: !state.ui.sidebarCollapsed }
        })),
        
        setTheme: (theme) => set((state) => ({
          ui: { ...state.ui, theme }
        })),
        
        setLoading: (loading, message) => set((state) => ({
          ui: { ...state.ui, isLoading: loading, loadingMessage: message }
        })),
        
        setMobileMenuOpen: (open) => set((state) => ({
          ui: { ...state.ui, isMobileMenuOpen: open }
        })),
        
        setActiveModal: (modal) => set((state) => ({
          ui: { ...state.ui, activeModal: modal }
        })),
        
        addToast: (toast) => set((state) => ({
          ui: {
            ...state.ui,
            toasts: [...state.ui.toasts, { ...toast, id: generateId() }]
          }
        })),
        
        removeToast: (id) => set((state) => ({
          ui: {
            ...state.ui,
            toasts: state.ui.toasts.filter((t) => t.id !== id)
          }
        })),
        
        // ============================================
        // Reset Actions
        // ============================================
        resetStore: () => set({
          currentUser: mockUser,
          currentView: 'dashboard',
          tasks: [],
          tasksLoading: false,
          goals: [],
          goalsLoading: false,
          habits: [],
          habitsLoading: false,
          habitLogs: [],
          notes: [],
          notesLoading: false,
          conversations: [],
          currentConversationId: null,
          chatLoading: false,
          ui: initialUIState,
        }),
      }),
      {
        name: 'lifeos-storage',
        partialize: (state) => ({
          // Persist user preferences and UI state
          currentUser: state.currentUser,
          currentView: state.currentView,
          ui: {
            sidebarCollapsed: state.ui.sidebarCollapsed,
            theme: state.ui.theme,
          },
          // Persist local data for offline access
          tasks: state.tasks,
          goals: state.goals,
          habits: state.habits,
          habitLogs: state.habitLogs,
          notes: state.notes,
          conversations: state.conversations,
          currentConversationId: state.currentConversationId,
        }),
      }
    ),
    { name: 'LifeOS Store' }
  )
);

// ============================================
// Selector Hooks for Performance
// ============================================

export const useCurrentUser = () => useLifeOSStore((state) => state.currentUser);
export const useCurrentView = () => useLifeOSStore((state) => state.currentView);
export const useTasks = () => useLifeOSStore((state) => state.tasks);
export const useGoals = () => useLifeOSStore((state) => state.goals);
export const useHabits = () => useLifeOSStore((state) => state.habits);
export const useHabitLogs = () => useLifeOSStore((state) => state.habitLogs);
export const useNotes = () => useLifeOSStore((state) => state.notes);
export const useConversations = () => useLifeOSStore((state) => state.conversations);
export const useCurrentConversation = () => 
  useLifeOSStore((state) => 
    state.conversations.find((c) => c.id === state.currentConversationId)
  );
export const useUI = () => useLifeOSStore((state) => state.ui);

// ============================================
// API Sync Helpers (to be used with API calls)
// ============================================

export const taskApiHelpers = {
  create: async (input: TaskInput): Promise<Task> => {
    const state = useLifeOSStore.getState();
    const now = new Date().toISOString();
    return {
      id: generateId(),
      userId: state.currentUser?.id || 'user_1',
      title: input.title,
      description: input.description,
      status: input.status || 'todo',
      priority: input.priority || 'medium',
      dueDate: input.dueDate,
      goalId: input.goalId,
      tags: input.tags || [],
      createdAt: now,
      updatedAt: now,
    };
  },
  
  update: (task: Task, updates: Partial<Task>): Task => ({
    ...task,
    ...updates,
    updatedAt: new Date().toISOString(),
  }),
};

export const goalApiHelpers = {
  create: async (input: GoalInput): Promise<Goal> => {
    const state = useLifeOSStore.getState();
    const now = new Date().toISOString();
    return {
      id: generateId(),
      userId: state.currentUser?.id || 'user_1',
      title: input.title,
      description: input.description,
      status: input.status || 'not_started',
      progress: input.progress || 0,
      targetDate: input.targetDate,
      parentGoalId: input.parentGoalId,
      categories: input.categories || [],
      createdAt: now,
      updatedAt: now,
    };
  },
  
  update: (goal: Goal, updates: Partial<Goal>): Goal => ({
    ...goal,
    ...updates,
    updatedAt: new Date().toISOString(),
  }),
};

export const habitApiHelpers = {
  create: async (input: HabitInput): Promise<Habit> => {
    const state = useLifeOSStore.getState();
    const now = new Date().toISOString();
    return {
      id: generateId(),
      userId: state.currentUser?.id || 'user_1',
      name: input.name,
      description: input.description,
      frequency: input.frequency || 'daily',
      targetCount: input.targetCount || 1,
      color: input.color || '#3b82f6',
      icon: input.icon,
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };
  },
  
  createLog: async (input: HabitLogInput): Promise<HabitLog> => {
    const state = useLifeOSStore.getState();
    const now = new Date().toISOString();
    return {
      id: generateId(),
      habitId: input.habitId,
      userId: state.currentUser?.id || 'user_1',
      date: input.date,
      completed: input.completed ?? true,
      count: input.count || 1,
      note: input.note,
      createdAt: now,
    };
  },
  
  update: (habit: Habit, updates: Partial<Habit>): Habit => ({
    ...habit,
    ...updates,
    updatedAt: new Date().toISOString(),
  }),
};

export const noteApiHelpers = {
  create: async (input: NoteInput): Promise<Note> => {
    const state = useLifeOSStore.getState();
    const now = new Date().toISOString();
    return {
      id: generateId(),
      userId: state.currentUser?.id || 'user_1',
      title: input.title,
      content: input.content || '',
      category: input.category,
      tags: input.tags || [],
      isPinned: input.isPinned ?? false,
      isArchived: input.isArchived ?? false,
      createdAt: now,
      updatedAt: now,
    };
  },
  
  update: (note: Note, updates: Partial<Note>): Note => ({
    ...note,
    ...updates,
    updatedAt: new Date().toISOString(),
  }),
};

export const chatApiHelpers = {
  createConversation: async (title: string): Promise<ChatConversation> => {
    const state = useLifeOSStore.getState();
    const now = new Date().toISOString();
    return {
      id: generateId(),
      userId: state.currentUser?.id || 'user_1',
      title,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
  },
  
  createMessage: async (role: 'user' | 'assistant' | 'system', content: string): Promise<ChatMessage> => {
    const state = useLifeOSStore.getState();
    return {
      id: generateId(),
      userId: state.currentUser?.id || 'user_1',
      role,
      content,
      createdAt: new Date().toISOString(),
    };
  },
};

export default useLifeOSStore;
