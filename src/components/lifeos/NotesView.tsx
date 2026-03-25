"use client"

import * as React from "react"
import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import {
  Search,
  Plus,
  Pin,
  Archive,
  Sparkles,
  Clock,
  Tag,
  X,
  FileText,
  ChevronRight,
  Loader2,
  Link2,
  CheckCircle2,
  Pencil,
  Lightbulb,
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Filter,
  Star,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useLifeOSStore, Note, noteApiHelpers } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// ============================================
// AI Structured Output Types
// ============================================

interface AIStructuredOutput {
  summary: string
  keyPoints: string[]
  suggestedTags: string[]
  relatedNoteIds: string[]
}

// ============================================
// Constants
// ============================================

const NOTE_TIPS = [
  "Use # for headers to organize your thoughts",
  "Start lines with - for quick bullet lists",
  "Tag notes for easy discovery later",
  "Pin important notes to keep them at the top",
  "Use AI Structure to extract key points automatically",
]

const TAG_COLORS: Record<string, string> = {
  work: "tag-pill-work",
  personal: "tag-pill-personal",
  ideas: "tag-pill-ideas",
  urgent: "tag-pill-urgent",
  meeting: "tag-pill-meeting",
  project: "tag-pill-project",
}

// ============================================
// Helper Functions
// ============================================

function getTagColorClass(tag: string): string {
  const normalizedTag = tag.toLowerCase()
  return TAG_COLORS[normalizedTag] || "tag-pill-default"
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return "just now"
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
  if (diffDays === 1) return "yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function getWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length
}

function highlightSearchTerm(text: string, searchTerm: string): React.ReactNode {
  if (!searchTerm.trim()) return text
  
  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  
  return parts.map((part, index) => 
    regex.test(part) 
      ? <span key={index} className="search-highlight">{part}</span>
      : part
  )
}

function formatContent(content: string): string {
  const lines = content.split('\n')
  return lines.map(line => {
    // Auto-format headers
    if (line.startsWith('### ')) {
      return `### ${line.slice(4)}`
    }
    if (line.startsWith('## ')) {
      return `## ${line.slice(3)}`
    }
    if (line.startsWith('# ')) {
      return `# ${line.slice(2)}`
    }
    // Auto-format bullet points (already formatted)
    return line
  }).join('\n')
}

// ============================================
// Mock AI Function
// ============================================

async function mockAIStructure(content: string): Promise<AIStructuredOutput> {
  await new Promise((resolve) => setTimeout(resolve, 1500))

  const words = content.toLowerCase().split(/\s+/)
  const wordFreq: Record<string, number> = {}

  words.forEach((word) => {
    if (word.length > 4) {
      wordFreq[word] = (wordFreq[word] || 0) + 1
    }
  })

  const topWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word)

  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 10)

  return {
    summary:
      sentences.length > 0
        ? sentences[0].trim().slice(0, 200) + "..."
        : "No summary available.",
    keyPoints:
      sentences.length > 1
        ? sentences.slice(1, 4).map((s) => s.trim().slice(0, 100))
        : ["No key points extracted."],
    suggestedTags: topWords.slice(0, 5),
    relatedNoteIds: [],
  }
}

// ============================================
// Sparkle Particle Component
// ============================================

interface SparkleParticleProps {
  x: number
  y: number
}

function SparkleParticle({ x, y }: SparkleParticleProps) {
  return (
    <div
      className="sparkle-particle absolute text-violet-400 pointer-events-none"
      style={{ left: x, top: y }}
    >
      <Sparkles className="size-3" />
    </div>
  )
}

// ============================================
// Smart Empty State Component
// ============================================

interface SmartEmptyStateProps {
  onCreateNote: () => void
}

function SmartEmptyState({ onCreateNote }: SmartEmptyStateProps) {
  const [currentTipIndex, setCurrentTipIndex] = useState(0)
  const [sparkles, setSparkles] = useState<Array<{ id: number; x: number; y: number }>>([])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % NOTE_TIPS.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    if (Math.random() > 0.85) {
      const newSparkle = { id: Date.now(), x, y }
      setSparkles(prev => [...prev.slice(-5), newSparkle])
      setTimeout(() => {
        setSparkles(prev => prev.filter(s => s.id !== newSparkle.id))
      }, 1000)
    }
  }

  return (
    <div 
      ref={containerRef}
      className="flex-1 flex items-center justify-center relative overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {sparkles.map(sparkle => (
        <SparkleParticle key={sparkle.id} x={sparkle.x} y={sparkle.y} />
      ))}
      
      <div className="text-center max-w-md">
        {/* Ghost Preview Card */}
        <div className="ghost-card-pulse bg-muted/30 border border-border/50 rounded-xl p-6 mb-6 text-left">
          <div className="h-4 bg-muted-foreground/20 rounded w-3/4 mb-3" />
          <div className="h-3 bg-muted-foreground/10 rounded w-full mb-2" />
          <div className="h-3 bg-muted-foreground/10 rounded w-5/6 mb-2" />
          <div className="h-3 bg-muted-foreground/10 rounded w-4/6 mb-4" />
          <div className="flex gap-2">
            <div className="h-5 bg-muted-foreground/10 rounded-full w-12" />
            <div className="h-5 bg-muted-foreground/10 rounded-full w-16" />
          </div>
        </div>
        
        {/* Pencil Icon with Animation */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="pencil-write-animate inline-block">
            <Pencil className="size-5 text-violet-500" />
          </div>
          <span className="text-muted-foreground">Click to start writing...</span>
        </div>
        
        {/* Create Button */}
        <Button onClick={onCreateNote} size="lg" className="mb-6">
          <Plus className="size-4 mr-2" />
          Create Your First Note
        </Button>
        
        {/* Rotating Tips */}
        <div className="tip-rotate">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Lightbulb className="size-4 text-amber-500" />
            <span>{NOTE_TIPS[currentTipIndex]}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Formatting Toolbar Component
// ============================================

interface FormattingToolbarProps {
  onFormat: (type: string) => void
  position: { top: number; left: number }
}

function FormattingToolbar({ onFormat, position }: FormattingToolbarProps) {
  return (
    <div
      className="toolbar-animate fixed z-50 bg-popover border border-border rounded-lg shadow-lg p-1 flex gap-0.5"
      style={{ top: position.top, left: position.left }}
    >
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onFormat('bold')}
        title="Bold"
      >
        <Bold className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onFormat('italic')}
        title="Italic"
      >
        <Italic className="size-4" />
      </Button>
      <div className="w-px bg-border mx-1" />
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onFormat('h1')}
        title="Heading 1"
      >
        <Heading1 className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onFormat('h2')}
        title="Heading 2"
      >
        <Heading2 className="size-4" />
      </Button>
      <div className="w-px bg-border mx-1" />
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onFormat('bullet')}
        title="Bullet List"
      >
        <List className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onFormat('numbered')}
        title="Numbered List"
      >
        <ListOrdered className="size-4" />
      </Button>
    </div>
  )
}

// ============================================
// Note Card Component
// ============================================

interface NoteCardProps {
  note: Note
  isActive: boolean
  onClick: () => void
  searchQuery: string
  animationDelay: number
}

function NoteCard({ note, isActive, onClick, searchQuery, animationDelay }: NoteCardProps) {
  const preview = note.content.slice(0, 100)
  const relativeTime = getRelativeTime(note.updatedAt)

  return (
    <button
      onClick={onClick}
      style={{ animationDelay: `${animationDelay}ms` }}
      className={cn(
        "note-card-animate w-full text-left p-3 rounded-lg transition-all duration-200",
        "hover:bg-accent/50 group relative",
        "border border-transparent",
        isActive && "bg-accent border-violet-500/20",
        note.isPinned && "pinned-note-bg"
      )}
    >
      <div className="flex items-start gap-2">
        {/* Pin Indicator */}
        {note.isPinned && (
          <div className="pin-glow-active mt-1 shrink-0">
            <Pin className="size-3 text-violet-500" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate">
            {searchQuery ? highlightSearchTerm(note.title || "Untitled", searchQuery) : (note.title || "Untitled")}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {searchQuery ? highlightSearchTerm(preview || "No content", searchQuery) : (preview || "No content")}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground">{relativeTime}</span>
            {note.tags.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {note.tags.slice(0, 2).map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className={cn("text-[9px] px-1.5 py-0 h-4", getTagColorClass(tag))}
                  >
                    {tag}
                  </Badge>
                ))}
                {note.tags.length > 2 && (
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                    +{note.tags.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

// ============================================
// Related Notes Component
// ============================================

interface RelatedNotesProps {
  currentNoteId: string
  currentTags: string[]
  notes: Note[]
  onSelectNote: (note: Note) => void
}

function RelatedNotes({ currentNoteId, currentTags, notes, onSelectNote }: RelatedNotesProps) {
  const relatedNotes = useMemo(() => {
    if (currentTags.length === 0) return []
    
    return notes
      .filter(note => note.id !== currentNoteId && !note.isArchived)
      .map(note => ({
        note,
        sharedTags: note.tags.filter(tag => currentTags.includes(tag))
      }))
      .filter(item => item.sharedTags.length > 0)
      .sort((a, b) => b.sharedTags.length - a.sharedTags.length)
      .slice(0, 3)
  }, [currentNoteId, currentTags, notes])

  if (relatedNotes.length === 0) return null

  return (
    <div className="space-y-2 pt-4 border-t border-border">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link2 className="size-4" />
        Related Notes
      </div>
      <div className="space-y-1">
        {relatedNotes.map(({ note, sharedTags }) => (
          <button
            key={note.id}
            onClick={() => onSelectNote(note)}
            className="related-note-hover w-full text-left p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="text-sm font-medium truncate">{note.title || "Untitled"}</div>
            <div className="flex gap-1 mt-1">
              {sharedTags.slice(0, 2).map(tag => (
                <Badge key={tag} variant="secondary" className={cn("text-[9px] px-1 py-0 h-4", getTagColorClass(tag))}>
                  {tag}
                </Badge>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ============================================
// AI Structure Modal
// ============================================

interface AIStructureModalProps {
  isOpen: boolean
  onClose: () => void
  output: AIStructuredOutput | null
  isLoading: boolean
  notes: Note[]
  onAddTag: (tag: string) => void
}

function AIStructureModal({
  isOpen,
  onClose,
  output,
  isLoading,
  notes,
  onAddTag,
}: AIStructureModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-violet-500" />
            AI Structured Analysis
          </DialogTitle>
          <DialogDescription>
            AI has analyzed and structured your note
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="size-8 text-violet-500 animate-spin" />
            <p className="text-sm text-muted-foreground mt-4">
              Analyzing your note...
            </p>
          </div>
        ) : output ? (
          <div className="space-y-6">
            {/* Summary */}
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <FileText className="size-4 text-violet-500" />
                Summary
              </h4>
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                {output.summary}
              </p>
            </div>

            {/* Key Points */}
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <ChevronRight className="size-4 text-violet-500" />
                Key Points
              </h4>
              <ul className="space-y-2">
                {output.keyPoints.map((point, index) => (
                  <li
                    key={index}
                    className="text-sm text-muted-foreground flex items-start gap-2"
                  >
                    <CheckCircle2 className="size-4 text-violet-500 mt-0.5 shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* Suggested Tags */}
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Tag className="size-4 text-violet-500" />
                Suggested Tags
              </h4>
              <div className="flex flex-wrap gap-2">
                {output.suggestedTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="cursor-pointer hover:bg-violet-500/10 hover:text-violet-600 hover:border-violet-500/50 transition-colors"
                    onClick={() => onAddTag(tag)}
                  >
                    + {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Related Notes */}
            {output.relatedNoteIds.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Link2 className="size-4 text-violet-500" />
                  Related Notes
                </h4>
                <div className="space-y-2">
                  {output.relatedNoteIds.map((noteId) => {
                    const relatedNote = notes.find((n) => n.id === noteId)
                    return relatedNote ? (
                      <div
                        key={noteId}
                        className="text-sm p-2 bg-muted/50 rounded-lg hover:bg-muted/80 cursor-pointer transition-colors"
                      >
                        {relatedNote.title}
                      </div>
                    ) : null
                  })}
                </div>
              </div>
            )}
          </div>
        ) : null}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// Main NotesView Component
// ============================================

export function NotesView() {
  const { notes, addNote, updateNote, currentUser } = useLifeOSStore()

  // Local state
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [showAIModal, setShowAIModal] = useState(false)
  const [aiOutput, setAiOutput] = useState<AIStructuredOutput | null>(null)
  const [isAILoading, setIsAILoading] = useState(false)
  const [isMobileListOpen, setIsMobileListOpen] = useState(true)
  const [selectedFilterTags, setSelectedFilterTags] = useState<string[]>([])
  const [showToolbar, setShowToolbar] = useState(false)
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 })
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Get all unique tags from notes
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    notes.forEach(note => note.tags.forEach(tag => tagSet.add(tag)))
    return Array.from(tagSet).sort()
  }, [notes])

  // Computed values
  const sortedNotes = useMemo(() => {
    let filtered = notes.filter(
      (note) =>
        !note.isArchived &&
        (note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          note.content.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    // Filter by selected tags
    if (selectedFilterTags.length > 0) {
      filtered = filtered.filter(note => 
        selectedFilterTags.some(tag => note.tags.includes(tag))
      )
    }

    const pinned = filtered.filter((note) => note.isPinned)
    const unpinned = filtered.filter((note) => !note.isPinned)

    return {
      pinned: pinned.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
      all: unpinned.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    }
  }, [notes, searchQuery, selectedFilterTags])

  const selectedNote = selectedNoteId
    ? notes.find((n) => n.id === selectedNoteId)
    : null

  const wordCount = useMemo(() => getWordCount(content), [content])
  const lastEditedRelative = selectedNote ? getRelativeTime(selectedNote.updatedAt) : null

  // Handlers
  const handleCreateNote = useCallback(async () => {
    const newNote = await noteApiHelpers.create({
      title: "Untitled Note",
      content: "",
      tags: [],
      isPinned: false,
      isArchived: false,
    })
    addNote(newNote)
    setSelectedNoteId(newNote.id)
    setTitle(newNote.title)
    setContent(newNote.content)
    setTags(newNote.tags)
    setIsMobileListOpen(false)
  }, [addNote])

  const handleSelectNote = useCallback((note: Note) => {
    setSelectedNoteId(note.id)
    setTitle(note.title)
    setContent(note.content)
    setTags(note.tags)
    setIsMobileListOpen(false)
  }, [])

  const handleSaveNote = useCallback(() => {
    if (!selectedNoteId) return
    updateNote(selectedNoteId, {
      title: title || "Untitled Note",
      content,
      tags,
    })
  }, [selectedNoteId, title, content, tags, updateNote])

  const handleTogglePin = useCallback(() => {
    if (!selectedNoteId) return
    const note = notes.find((n) => n.id === selectedNoteId)
    if (note) {
      updateNote(selectedNoteId, { isPinned: !note.isPinned })
    }
  }, [selectedNoteId, notes, updateNote])

  const handleToggleArchive = useCallback(() => {
    if (!selectedNoteId) return
    const note = notes.find((n) => n.id === selectedNoteId)
    if (note) {
      updateNote(selectedNoteId, { isArchived: !note.isArchived })
      setSelectedNoteId(null)
      setTitle("")
      setContent("")
      setTags([])
    }
  }, [selectedNoteId, notes, updateNote])

  const handleAddTag = useCallback(() => {
    const trimmedTag = tagInput.trim().toLowerCase()
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag])
      handleSaveNote()
    }
    setTagInput("")
  }, [tagInput, tags, handleSaveNote])

  const handleRemoveTag = useCallback(
    (tagToRemove: string) => {
      setTags(tags.filter((tag) => tag !== tagToRemove))
      handleSaveNote()
    },
    [tags, handleSaveNote]
  )

  const handleAIStructure = useCallback(async () => {
    if (!content.trim()) return

    setIsAILoading(true)
    setShowAIModal(true)

    try {
      const output = await mockAIStructure(content)
      setAiOutput(output)
    } catch (error) {
      console.error("AI structuring failed:", error)
    } finally {
      setIsAILoading(false)
    }
  }, [content])

  const handleAddTagFromAI = useCallback(
    (tag: string) => {
      if (!tags.includes(tag)) {
        setTags([...tags, tag])
        handleSaveNote()
      }
    },
    [tags, handleSaveNote]
  )

  // Handle text selection for formatting toolbar
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection()
    if (selection && selection.toString().length > 0 && textareaRef.current) {
      const rect = textareaRef.current.getBoundingClientRect()
      setToolbarPosition({
        top: rect.top - 50,
        left: rect.left + rect.width / 2 - 150,
      })
      setShowToolbar(true)
    } else {
      setShowToolbar(false)
    }
  }, [])

  // Handle formatting
  const handleFormat = useCallback((type: string) => {
    const textarea = textareaRef.current
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)
    
    let newText = ""
    let cursorOffset = 0
    
    switch (type) {
      case 'bold':
        newText = `**${selectedText}**`
        cursorOffset = 2
        break
      case 'italic':
        newText = `*${selectedText}*`
        cursorOffset = 1
        break
      case 'h1':
        newText = `# ${selectedText}`
        cursorOffset = 2
        break
      case 'h2':
        newText = `## ${selectedText}`
        cursorOffset = 3
        break
      case 'bullet':
        newText = `- ${selectedText}`
        cursorOffset = 2
        break
      case 'numbered':
        newText = `1. ${selectedText}`
        cursorOffset = 3
        break
    }
    
    const updatedContent = content.substring(0, start) + newText + content.substring(end)
    setContent(updatedContent)
    setShowToolbar(false)
    
    // Set cursor position after format
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + cursorOffset, start + cursorOffset + selectedText.length)
    }, 0)
  }, [content])

  // Auto-format on content change
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setContent(value)
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  // Check if there are no notes at all
  const hasNoNotes = notes.filter(n => !n.isArchived).length === 0

  return (
    <div className="flex h-full bg-background">
      {/* Mobile List Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden fixed top-20 left-4 z-50"
        onClick={() => setIsMobileListOpen(!isMobileListOpen)}
      >
        <FileText className="size-5" />
      </Button>

      {/* Notes List Sidebar */}
      <div
        className={cn(
          "w-80 border-r border-border flex flex-col bg-background",
          "fixed md:relative inset-y-0 left-0 z-40 transform transition-transform duration-300 md:translate-x-0",
          isMobileListOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Search & Add */}
        <div className="p-4 border-b border-border">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Tag Filter */}
          {allTags.length > 0 && (
            <div className="mb-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Filter className="size-4 mr-2" />
                    Filter by tags
                    {selectedFilterTags.length > 0 && (
                      <Badge variant="secondary" className="ml-auto">
                        {selectedFilterTags.length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  {allTags.map(tag => (
                    <DropdownMenuCheckboxItem
                      key={tag}
                      checked={selectedFilterTags.includes(tag)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedFilterTags([...selectedFilterTags, tag])
                        } else {
                          setSelectedFilterTags(selectedFilterTags.filter(t => t !== tag))
                        }
                      }}
                    >
                      <Badge variant="secondary" className={cn("text-xs", getTagColorClass(tag))}>
                        {tag}
                      </Badge>
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          
          <Button onClick={handleCreateNote} className="w-full" variant="default">
            <Plus className="size-4 mr-2" />
            Add Note
          </Button>
        </div>

        {/* Notes List */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-1">
            {/* Pinned Notes */}
            {sortedNotes.pinned.length > 0 && (
              <div className="mb-4">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2 flex items-center gap-2">
                  <Star className="size-3 text-violet-500" />
                  Pinned
                </h2>
                {sortedNotes.pinned.map((note, index) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    isActive={selectedNoteId === note.id}
                    onClick={() => handleSelectNote(note)}
                    searchQuery={searchQuery}
                    animationDelay={index * 50}
                  />
                ))}
              </div>
            )}

            {/* All Notes */}
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                All Notes
              </h2>
              {sortedNotes.all.length > 0 ? (
                sortedNotes.all.map((note, index) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    isActive={selectedNoteId === note.id}
                    onClick={() => handleSelectNote(note)}
                    searchQuery={searchQuery}
                    animationDelay={(sortedNotes.pinned.length + index) * 50}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="size-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notes found</p>
                  {searchQuery && (
                    <p className="text-xs mt-1">Try a different search term</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Note Editor */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedNote ? (
          <>
            {/* Editor Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleTogglePin}
                  className={cn(
                    "pin-animate",
                    selectedNote.isPinned && "text-violet-500 bg-violet-500/10 pin-glow-active"
                  )}
                >
                  <Pin className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleToggleArchive}>
                  <Archive className="size-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleAIStructure}
                  disabled={!content.trim()}
                >
                  <Sparkles className="size-4 mr-2 text-violet-500" />
                  AI Structure
                </Button>
                <Button onClick={handleSaveNote}>Save</Button>
              </div>
            </div>

            {/* Editor Content */}
            <ScrollArea className="flex-1">
              <div className="max-w-3xl mx-auto p-6 space-y-4">
                {/* Title */}
                <Input
                  placeholder="Note title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleSaveNote}
                  className="text-2xl font-semibold border-none shadow-none focus-visible:ring-0 px-0"
                />

                {/* Content with Toolbar */}
                <div className="relative">
                  {showToolbar && (
                    <FormattingToolbar
                      onFormat={handleFormat}
                      position={toolbarPosition}
                    />
                  )}
                  <Textarea
                    ref={textareaRef}
                    placeholder="Start writing... Use # for headers, - for bullets"
                    value={content}
                    onChange={handleContentChange}
                    onBlur={handleSaveNote}
                    onMouseUp={handleTextSelection}
                    onKeyUp={handleTextSelection}
                    className="min-h-[400px] border-none shadow-none focus-visible:ring-0 resize-none px-0 text-base leading-relaxed"
                  />
                </div>

                {/* Word Count & Last Edited */}
                <div className="word-count-animate flex items-center justify-between text-xs text-muted-foreground pt-2">
                  <div className="flex items-center gap-4">
                    <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
                  </div>
                  {lastEditedRelative && (
                    <div className="flex items-center gap-1">
                      <Clock className="size-3" />
                      Last edited {lastEditedRelative}
                    </div>
                  )}
                </div>

                {/* Tags */}
                <div className="space-y-2 pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Tag className="size-4" />
                    Tags
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className={cn(
                          "cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors group",
                          getTagColorClass(tag)
                        )}
                        onClick={() => handleRemoveTag(tag)}
                      >
                        {tag}
                        <X className="size-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Badge>
                    ))}
                    <div className="flex items-center gap-1">
                      <Input
                        placeholder="Add tag..."
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            handleAddTag()
                          }
                        }}
                        className="h-7 w-24 text-sm"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleAddTag}
                        className="h-7"
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Related Notes */}
                <RelatedNotes
                  currentNoteId={selectedNoteId || ""}
                  currentTags={tags}
                  notes={notes}
                  onSelectNote={handleSelectNote}
                />

                {/* Timestamp */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-4">
                  <Clock className="size-3" />
                  Created: {formatDate(selectedNote.createdAt)}
                </div>
              </div>
            </ScrollArea>
          </>
        ) : (
          /* Smart Empty State */
          hasNoNotes ? (
            <SmartEmptyState onCreateNote={handleCreateNote} />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FileText className="size-16 mx-auto mb-4 text-muted-foreground/30" />
                <h2 className="text-xl font-semibold text-muted-foreground mb-2">
                  No note selected
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Select a note from the list or create a new one
                </p>
                <Button onClick={handleCreateNote}>
                  <Plus className="size-4 mr-2" />
                  Create Note
                </Button>
              </div>
            </div>
          )
        )}
      </div>

      {/* AI Structure Modal */}
      <AIStructureModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        output={aiOutput}
        isLoading={isAILoading}
        notes={notes}
        onAddTag={handleAddTagFromAI}
      />
    </div>
  )
}

export default NotesView
