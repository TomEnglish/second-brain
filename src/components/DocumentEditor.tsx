"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import SlashCommandMenu, { SlashCommand } from "./SlashCommandMenu";

interface BrainDocument {
  slug: string;
  title: string;
  category: string;
  date?: string;
  content: string;
}

interface DocumentEditorProps {
  document: BrainDocument;
  onSave: (content: string) => Promise<void>;
  onCancel: () => void;
}

export default function DocumentEditor({ document: doc, onSave, onCancel }: DocumentEditorProps) {
  const [content, setContent] = useState(doc.content);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Slash command state
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashPosition, setSlashPosition] = useState({ top: 0, left: 0 });
  const [slashQuery, setSlashQuery] = useState("");
  const [slashStartPos, setSlashStartPos] = useState<number | null>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Calculate caret position in pixels
  const getCaretCoordinates = useCallback((textarea: HTMLTextAreaElement, position: number) => {
    // Create a mirror div to measure text
    const mirror = document.createElement("div");
    const style = window.getComputedStyle(textarea);
    
    // Copy styles that affect text rendering
    const properties = [
      "fontFamily", "fontSize", "fontWeight", "fontStyle",
      "letterSpacing", "textTransform", "wordSpacing",
      "textIndent", "whiteSpace", "wordWrap", "lineHeight",
      "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
      "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
    ];
    
    mirror.style.cssText = properties.map(p => `${p.replace(/([A-Z])/g, "-$1").toLowerCase()}:${style.getPropertyValue(p.replace(/([A-Z])/g, "-$1").toLowerCase())}`).join(";");
    mirror.style.position = "absolute";
    mirror.style.top = "0";
    mirror.style.left = "-9999px";
    mirror.style.width = `${textarea.clientWidth}px`;
    mirror.style.overflow = "hidden";
    mirror.style.visibility = "hidden";
    
    document.body.appendChild(mirror);
    
    // Get text up to the caret
    const textBeforeCaret = textarea.value.substring(0, position);
    mirror.textContent = textBeforeCaret;
    
    // Create a span for the caret position
    const span = document.createElement("span");
    span.textContent = "|";
    mirror.appendChild(span);
    
    const rect = textarea.getBoundingClientRect();
    const spanRect = span.getBoundingClientRect();
    const mirrorRect = mirror.getBoundingClientRect();
    
    // Calculate position relative to textarea
    const relativeTop = spanRect.top - mirrorRect.top;
    const relativeLeft = spanRect.left - mirrorRect.left;
    
    document.body.removeChild(mirror);
    
    // Account for scroll
    const scrollTop = textarea.scrollTop;
    const scrollLeft = textarea.scrollLeft;
    
    return {
      top: rect.top + relativeTop - scrollTop + 24, // Add line height offset
      left: rect.left + relativeLeft - scrollLeft,
    };
  }, []);

  // Handle text changes and detect slash commands
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    setContent(newContent);
    
    // Check if we should open or update slash menu
    if (slashStartPos !== null) {
      // We're already in a slash command - update the query
      const query = newContent.substring(slashStartPos + 1, cursorPos);
      
      // Check if query contains space or newline (close menu)
      if (query.includes(" ") || query.includes("\n")) {
        closeSlashMenu();
      } else {
        setSlashQuery(query);
      }
    }
  };

  // Handle key events for slash detection
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Keyboard shortcuts
    if (e.key === "Escape") {
      if (showSlashMenu) {
        e.preventDefault();
        closeSlashMenu();
        return;
      }
      onCancel();
      return;
    }
    
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
      return;
    }

    // Let SlashCommandMenu handle navigation when open
    if (showSlashMenu && ["ArrowDown", "ArrowUp", "Enter", "Tab"].includes(e.key)) {
      return;
    }

    // Detect slash at start of line or after whitespace
    if (e.key === "/" && !showSlashMenu) {
      const textarea = textareaRef.current;
      if (!textarea) return;
      
      const cursorPos = textarea.selectionStart;
      const textBefore = content.substring(0, cursorPos);
      
      // Check if slash is at start of line or after whitespace
      const lastChar = textBefore.slice(-1);
      const isStartOfLine = cursorPos === 0 || lastChar === "\n";
      const isAfterWhitespace = lastChar === " " || lastChar === "\t";
      
      if (isStartOfLine || isAfterWhitespace || cursorPos === 0) {
        // Open slash menu
        const coords = getCaretCoordinates(textarea, cursorPos);
        setSlashPosition(coords);
        setSlashStartPos(cursorPos);
        setSlashQuery("");
        setShowSlashMenu(true);
      }
    }

    // Close slash menu on backspace past the slash
    if (e.key === "Backspace" && showSlashMenu && slashStartPos !== null) {
      const textarea = textareaRef.current;
      if (!textarea) return;
      
      if (textarea.selectionStart <= slashStartPos) {
        closeSlashMenu();
      }
    }
  };

  const closeSlashMenu = () => {
    setShowSlashMenu(false);
    setSlashQuery("");
    setSlashStartPos(null);
  };

  // Handle slash command selection
  const handleSlashSelect = (command: SlashCommand) => {
    if (slashStartPos === null || !textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    
    // Remove the slash and any query text
    const beforeSlash = content.substring(0, slashStartPos);
    const afterCursor = content.substring(cursorPos);
    
    // Get dynamic insert text (for dates which need to be computed fresh)
    let insertText = command.insert;
    if (command.id === "date") {
      insertText = new Date().toISOString().split("T")[0];
    } else if (command.id === "datetime") {
      insertText = new Date().toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    }
    
    const newContent = beforeSlash + insertText + afterCursor;
    setContent(newContent);
    
    // Set cursor position
    const newCursorPos = command.cursorOffset !== undefined
      ? slashStartPos + command.cursorOffset
      : slashStartPos + insertText.length;
    
    // Need to set cursor after React updates the textarea
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
    
    closeSlashMenu();
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(content);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = content !== doc.content;

  return (
    <div className="h-full flex flex-col">
      {/* Editor header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-gray-800 bg-[#111]">
        <div>
          <h1 className="text-xl font-bold text-white">{doc.title}</h1>
          <p className="text-sm text-gray-500">Editing • {doc.category}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded">/</kbd> commands
          </span>
          <span className="text-xs text-gray-500">
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded">⌘S</kbd> save
          </span>
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="px-4 py-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </header>

      {/* Editor body */}
      <div className="flex-1 p-8 relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="w-full h-full bg-transparent text-gray-200 font-mono text-sm leading-relaxed resize-none focus:outline-none"
          placeholder="Start writing... Type / for commands"
          spellCheck={false}
        />
        
        {/* Slash command menu */}
        <SlashCommandMenu
          isOpen={showSlashMenu}
          position={slashPosition}
          searchQuery={slashQuery}
          onSelect={handleSlashSelect}
          onClose={closeSlashMenu}
        />
      </div>

      {/* Editor footer - quick reference */}
      <footer className="px-8 py-2 border-t border-gray-800 bg-[#111]">
        <div className="flex items-center gap-6 text-xs text-gray-500">
          <span>
            <kbd className="px-1 py-0.5 bg-gray-800 rounded mr-1">/</kbd>
            Slash commands
          </span>
          <span>
            <kbd className="px-1 py-0.5 bg-gray-800 rounded mr-1">[[</kbd>
            Wiki link
          </span>
          <span>
            <kbd className="px-1 py-0.5 bg-gray-800 rounded mr-1">#</kbd>
            Tag
          </span>
          <span className="ml-auto text-gray-600">
            {content.split(/\s+/).filter(Boolean).length} words • {content.length} characters
          </span>
        </div>
      </footer>
    </div>
  );
}
