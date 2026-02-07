"use client";

import { useState, useEffect, useRef, useMemo } from "react";

interface SlashCommand {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "basic" | "lists" | "media" | "advanced";
  insert: string;
  cursorOffset?: number; // Where to place cursor after insertion (from start of insert)
}

const SLASH_COMMANDS: SlashCommand[] = [
  // Basic blocks
  {
    id: "h1",
    name: "Heading 1",
    description: "Large section heading",
    icon: "H₁",
    category: "basic",
    insert: "# ",
  },
  {
    id: "h2",
    name: "Heading 2",
    description: "Medium section heading",
    icon: "H₂",
    category: "basic",
    insert: "## ",
  },
  {
    id: "h3",
    name: "Heading 3",
    description: "Small section heading",
    icon: "H₃",
    category: "basic",
    insert: "### ",
  },
  {
    id: "text",
    name: "Text",
    description: "Plain text paragraph",
    icon: "¶",
    category: "basic",
    insert: "",
  },
  {
    id: "quote",
    name: "Quote",
    description: "Blockquote for citations",
    icon: "❝",
    category: "basic",
    insert: "> ",
  },
  {
    id: "divider",
    name: "Divider",
    description: "Horizontal line separator",
    icon: "—",
    category: "basic",
    insert: "---\n\n",
  },
  // Lists
  {
    id: "bullet",
    name: "Bullet List",
    description: "Simple bullet point",
    icon: "•",
    category: "lists",
    insert: "- ",
  },
  {
    id: "numbered",
    name: "Numbered List",
    description: "Numbered list item",
    icon: "1.",
    category: "lists",
    insert: "1. ",
  },
  {
    id: "todo",
    name: "To-do",
    description: "Checkbox task item",
    icon: "☐",
    category: "lists",
    insert: "- [ ] ",
  },
  {
    id: "done",
    name: "Done",
    description: "Completed checkbox",
    icon: "☑",
    category: "lists",
    insert: "- [x] ",
  },
  // Media
  {
    id: "code",
    name: "Code Block",
    description: "Syntax-highlighted code",
    icon: "</>",
    category: "media",
    insert: "```\n\n```",
    cursorOffset: 4,
  },
  {
    id: "codeblock",
    name: "Code (with language)",
    description: "Code block with language",
    icon: "{ }",
    category: "media",
    insert: "```javascript\n\n```",
    cursorOffset: 14,
  },
  {
    id: "table",
    name: "Table",
    description: "Create a table",
    icon: "▦",
    category: "media",
    insert: "| Column 1 | Column 2 | Column 3 |\n|----------|----------|----------|\n|          |          |          |\n",
    cursorOffset: 2,
  },
  {
    id: "image",
    name: "Image",
    description: "Embed an image",
    icon: "🖼",
    category: "media",
    insert: "![alt text](url)",
    cursorOffset: 2,
  },
  {
    id: "link",
    name: "Link",
    description: "Add a hyperlink",
    icon: "🔗",
    category: "media",
    insert: "[link text](url)",
    cursorOffset: 1,
  },
  // Advanced
  {
    id: "wikilink",
    name: "Wiki Link",
    description: "Link to another document",
    icon: "[[",
    category: "advanced",
    insert: "[[]]",
    cursorOffset: 2,
  },
  {
    id: "date",
    name: "Today's Date",
    description: "Insert current date",
    icon: "📅",
    category: "advanced",
    insert: new Date().toISOString().split("T")[0],
  },
  {
    id: "datetime",
    name: "Date & Time",
    description: "Insert current date and time",
    icon: "🕐",
    category: "advanced",
    insert: new Date().toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
  },
  {
    id: "callout",
    name: "Callout",
    description: "Highlighted note box",
    icon: "💡",
    category: "advanced",
    insert: "> [!NOTE]\n> ",
  },
  {
    id: "warning",
    name: "Warning",
    description: "Warning callout",
    icon: "⚠️",
    category: "advanced",
    insert: "> [!WARNING]\n> ",
  },
  {
    id: "math",
    name: "Math Block",
    description: "LaTeX math equation",
    icon: "∑",
    category: "advanced",
    insert: "$$\n\n$$",
    cursorOffset: 3,
  },
  {
    id: "tag",
    name: "Tag",
    description: "Add a hashtag",
    icon: "#",
    category: "advanced",
    insert: "#",
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  basic: "Basic Blocks",
  lists: "Lists",
  media: "Media",
  advanced: "Advanced",
};

interface SlashCommandMenuProps {
  isOpen: boolean;
  position: { top: number; left: number };
  searchQuery: string;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
}

export default function SlashCommandMenu({
  isOpen,
  position,
  searchQuery,
  onSelect,
  onClose,
}: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Filter commands based on search query
  const filteredCommands = useMemo(() => {
    if (!searchQuery) return SLASH_COMMANDS;
    
    const query = searchQuery.toLowerCase();
    return SLASH_COMMANDS.filter(
      (cmd) =>
        cmd.name.toLowerCase().includes(query) ||
        cmd.description.toLowerCase().includes(query) ||
        cmd.id.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Group filtered commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, SlashCommand[]> = {};
    filteredCommands.forEach((cmd) => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  // Flatten for keyboard navigation
  const flatCommands = useMemo(() => {
    const flat: SlashCommand[] = [];
    Object.keys(groupedCommands).forEach((category) => {
      flat.push(...groupedCommands[category]);
    });
    return flat;
  }, [groupedCommands]);

  // Reset selection when commands change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  // Scroll selected item into view
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => (i + 1) % flatCommands.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => (i - 1 + flatCommands.length) % flatCommands.length);
          break;
        case "Enter":
          e.preventDefault();
          if (flatCommands[selectedIndex]) {
            onSelect(flatCommands[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
        case "Tab":
          e.preventDefault();
          if (e.shiftKey) {
            setSelectedIndex((i) => (i - 1 + flatCommands.length) % flatCommands.length);
          } else {
            setSelectedIndex((i) => (i + 1) % flatCommands.length);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, flatCommands, selectedIndex, onSelect, onClose]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Delay to prevent immediate close
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Track the current flat index
  let currentFlatIndex = 0;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-72 max-h-80 overflow-y-auto bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-2xl"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      {/* Header */}
      <div className="sticky top-0 bg-[#1a1a1a] px-3 py-2 border-b border-gray-700">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="font-medium text-gray-400">Slash Commands</span>
          {searchQuery && (
            <span className="text-gray-600">• "{searchQuery}"</span>
          )}
        </div>
      </div>

      {flatCommands.length === 0 ? (
        <div className="px-4 py-8 text-center text-gray-500 text-sm">
          No commands match "{searchQuery}"
        </div>
      ) : (
        <div className="py-1">
          {Object.entries(groupedCommands).map(([category, commands]) => (
            <div key={category}>
              {/* Category header */}
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {CATEGORY_LABELS[category]}
              </div>
              
              {/* Commands in category */}
              {commands.map((cmd) => {
                const index = currentFlatIndex;
                currentFlatIndex++;
                const isSelected = index === selectedIndex;
                
                return (
                  <button
                    key={cmd.id}
                    ref={isSelected ? selectedRef : null}
                    onClick={() => onSelect(cmd)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full px-3 py-2 flex items-center gap-3 text-left transition-colors ${
                      isSelected
                        ? "bg-indigo-600/30 text-white"
                        : "text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    {/* Icon */}
                    <span className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-mono ${
                      isSelected ? "bg-indigo-600" : "bg-gray-800"
                    }`}>
                      {cmd.icon}
                    </span>
                    
                    {/* Name and description */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{cmd.name}</div>
                      <div className={`text-xs truncate ${
                        isSelected ? "text-indigo-200" : "text-gray-500"
                      }`}>
                        {cmd.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Footer hint */}
      <div className="sticky bottom-0 bg-[#1a1a1a] px-3 py-2 border-t border-gray-700 text-xs text-gray-500 flex items-center justify-between">
        <span>
          <kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-400">↑↓</kbd> navigate
        </span>
        <span>
          <kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-400">↵</kbd> select
        </span>
        <span>
          <kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-400">esc</kbd> close
        </span>
      </div>
    </div>
  );
}

export { SLASH_COMMANDS };
export type { SlashCommand };
