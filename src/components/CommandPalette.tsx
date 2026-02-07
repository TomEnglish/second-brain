"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";

interface Document {
  slug: string;
  title: string;
  category: string;
  date?: string;
  content: string;
}

interface CommandAction {
  id: string;
  title: string;
  subtitle?: string;
  icon: "document" | "create" | "calendar" | "graph" | "edit" | "search" | "keyboard" | "template";
  category: "documents" | "actions" | "navigation";
  keywords?: string[];
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  documents: Document[];
  selectedDoc: Document | null;
  onSelectDoc: (doc: Document) => void;
  onNewDocument: () => void;
  onToggleGraph: () => void;
  onEditDocument: () => void;
  onGoToToday: () => void;
  onShowTemplates?: () => void;
}

// Simple fuzzy match scoring
function fuzzyMatch(query: string, text: string): number {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Exact match gets highest score
  if (textLower === queryLower) return 100;
  
  // Starts with gets high score
  if (textLower.startsWith(queryLower)) return 80;
  
  // Contains gets medium score
  if (textLower.includes(queryLower)) return 60;
  
  // Fuzzy character match
  let score = 0;
  let queryIndex = 0;
  let consecutiveBonus = 0;
  
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      score += 10 + consecutiveBonus;
      consecutiveBonus += 5;
      queryIndex++;
    } else {
      consecutiveBonus = 0;
    }
  }
  
  // All characters matched?
  if (queryIndex === queryLower.length) {
    return Math.min(score, 50);
  }
  
  return 0;
}

const iconComponents = {
  document: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  create: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  calendar: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  graph: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
  edit: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  search: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  keyboard: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
    </svg>
  ),
  template: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h4M8 10h2" />
    </svg>
  ),
};

const categoryColors = {
  journals: "text-blue-400",
  concepts: "text-purple-400",
  projects: "text-green-400",
  research: "text-amber-400",
};

export default function CommandPalette({
  isOpen,
  onClose,
  documents,
  selectedDoc,
  onSelectDoc,
  onNewDocument,
  onToggleGraph,
  onEditDocument,
  onGoToToday,
  onShowTemplates,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build command list
  const commands = useMemo((): CommandAction[] => {
    const actions: CommandAction[] = [
      {
        id: "today",
        title: "Go to Today's Note",
        subtitle: "Open or create today's daily note",
        icon: "calendar",
        category: "actions",
        keywords: ["daily", "journal", "today", "note"],
        action: () => {
          onGoToToday();
          onClose();
        },
      },
      {
        id: "new",
        title: "New Document",
        subtitle: "Create a new blank document",
        icon: "create",
        category: "actions",
        keywords: ["create", "add", "new", "document", "note"],
        action: () => {
          onNewDocument();
          onClose();
        },
      },
      {
        id: "template",
        title: "New from Template",
        subtitle: "Create a document using a template (⌘T)",
        icon: "template",
        category: "actions",
        keywords: ["template", "create", "meeting", "book", "review", "project", "research", "decision"],
        action: () => {
          if (onShowTemplates) {
            onShowTemplates();
          }
          onClose();
        },
      },
      {
        id: "graph",
        title: "Toggle Graph View",
        subtitle: "Switch between document and graph view",
        icon: "graph",
        category: "actions",
        keywords: ["graph", "network", "visualization", "links", "connections"],
        action: () => {
          onToggleGraph();
          onClose();
        },
      },
    ];

    // Add edit action if a document is selected
    if (selectedDoc) {
      actions.push({
        id: "edit",
        title: "Edit Current Document",
        subtitle: `Edit "${selectedDoc.title}"`,
        icon: "edit",
        category: "actions",
        keywords: ["edit", "modify", "change", "update"],
        action: () => {
          onEditDocument();
          onClose();
        },
      });
    }

    // Add all documents
    const docCommands: CommandAction[] = documents.map((doc) => ({
      id: `doc-${doc.slug}`,
      title: doc.title,
      subtitle: doc.category.charAt(0).toUpperCase() + doc.category.slice(1),
      icon: "document" as const,
      category: "documents" as const,
      keywords: [doc.category, ...(doc.content.slice(0, 200).split(/\s+/).slice(0, 10))],
      action: () => {
        onSelectDoc(doc);
        onClose();
      },
    }));

    return [...actions, ...docCommands];
  }, [documents, selectedDoc, onSelectDoc, onNewDocument, onToggleGraph, onEditDocument, onGoToToday, onShowTemplates, onClose]);

  // Filter and sort commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      // Show actions first, then recent/selected document, then others
      const actions = commands.filter((c) => c.category === "actions");
      const docs = commands.filter((c) => c.category === "documents");
      
      // Sort docs: selected first, then journals by date (recent first), then others
      const sortedDocs = docs.sort((a, b) => {
        // Selected document first
        if (selectedDoc && a.id === `doc-${selectedDoc.slug}`) return -1;
        if (selectedDoc && b.id === `doc-${selectedDoc.slug}`) return 1;
        
        // Then journals by date (recent first)
        const aDoc = documents.find(d => `doc-${d.slug}` === a.id);
        const bDoc = documents.find(d => `doc-${d.slug}` === b.id);
        if (aDoc?.category === "journals" && bDoc?.category === "journals") {
          return (bDoc.date || "").localeCompare(aDoc.date || "");
        }
        if (aDoc?.category === "journals") return -1;
        if (bDoc?.category === "journals") return 1;
        
        return 0;
      });

      return [...actions, ...sortedDocs.slice(0, 10)];
    }

    // Score all commands
    const scored = commands.map((cmd) => {
      let score = fuzzyMatch(query, cmd.title);
      
      // Also check keywords
      if (cmd.keywords) {
        for (const keyword of cmd.keywords) {
          const keywordScore = fuzzyMatch(query, keyword);
          if (keywordScore > score) {
            score = keywordScore * 0.8; // Keywords are slightly less important
          }
        }
      }

      // Check subtitle
      if (cmd.subtitle) {
        const subtitleScore = fuzzyMatch(query, cmd.subtitle);
        if (subtitleScore > score) {
          score = subtitleScore * 0.7;
        }
      }

      return { cmd, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 15)
      .map((s) => s.cmd);
  }, [commands, query, documents, selectedDoc]);

  // Reset selection when filtered commands change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands.length, query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && filteredCommands.length > 0) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selectedElement?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, filteredCommands.length]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
        case "Tab":
          e.preventDefault();
          if (e.shiftKey) {
            setSelectedIndex((i) => Math.max(i - 1, 0));
          } else {
            setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
          }
          break;
      }
    },
    [filteredCommands, selectedIndex, onClose]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-xl bg-[#1a1a1a] rounded-xl shadow-2xl border border-gray-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search documents or type a command..."
            className="flex-1 bg-transparent text-white text-lg placeholder-gray-500 outline-none"
          />
          <kbd className="px-2 py-1 text-xs text-gray-400 bg-gray-800 rounded border border-gray-600">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="max-h-[50vh] overflow-y-auto py-2"
        >
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              <p>No results found</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          ) : (
            <>
              {/* Group by category */}
              {["actions", "documents", "navigation"].map((category) => {
                const categoryCommands = filteredCommands.filter(
                  (c) => c.category === category
                );
                if (categoryCommands.length === 0) return null;

                return (
                  <div key={category}>
                    <div className="px-4 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {category === "actions" ? "Quick Actions" : category === "documents" ? "Documents" : "Navigation"}
                    </div>
                    {categoryCommands.map((cmd) => {
                      const globalIndex = filteredCommands.indexOf(cmd);
                      const isSelected = globalIndex === selectedIndex;
                      const doc = documents.find(d => `doc-${d.slug}` === cmd.id);
                      const categoryColor = doc 
                        ? categoryColors[doc.category as keyof typeof categoryColors] || "text-gray-400"
                        : "text-gray-400";

                      return (
                        <button
                          key={cmd.id}
                          data-index={globalIndex}
                          onClick={() => cmd.action()}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            isSelected
                              ? "bg-indigo-600/20 border-l-2 border-indigo-500"
                              : "hover:bg-gray-800/50 border-l-2 border-transparent"
                          }`}
                        >
                          <span
                            className={`${
                              isSelected ? "text-indigo-400" : "text-gray-400"
                            }`}
                          >
                            {iconComponents[cmd.icon]}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-medium truncate ${
                                  isSelected ? "text-white" : "text-gray-200"
                                }`}
                              >
                                {cmd.title}
                              </span>
                              {doc && (
                                <span className={`text-xs ${categoryColor}`}>
                                  {doc.category}
                                </span>
                              )}
                            </div>
                            {cmd.subtitle && cmd.category === "actions" && (
                              <div className="text-sm text-gray-500 truncate">
                                {cmd.subtitle}
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <kbd className="px-2 py-0.5 text-xs text-gray-400 bg-gray-800 rounded border border-gray-600">
                              ↵
                            </kbd>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer with keyboard hints */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-700 bg-[#151515]">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-600">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-600">↓</kbd>
              <span className="ml-1">Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-600">↵</kbd>
              <span className="ml-1">Select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-600">esc</kbd>
              <span className="ml-1">Close</span>
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {filteredCommands.length} result{filteredCommands.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>
    </div>
  );
}
