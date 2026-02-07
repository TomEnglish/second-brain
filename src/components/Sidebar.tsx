"use client";

import { useState } from "react";
import TagsPanel from "./TagsPanel";

interface Document {
  slug: string;
  title: string;
  category: string;
  date?: string;
  content: string;
  tags?: string[];
}

interface SidebarProps {
  groupedDocs: Record<string, Document[]>;
  selectedDoc: Document | null;
  onSelectDoc: (doc: Document) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNewDocument: () => void;
  onOpenCommandPalette?: () => void;
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
}

const categoryIcons: Record<string, string> = {
  journals: "📓",
  concepts: "💡",
  projects: "🚀",
  research: "🔬",
  books: "📚",
};

const categoryOrder = ["journals", "books", "concepts", "projects", "research"];

export default function Sidebar({
  groupedDocs,
  selectedDoc,
  onSelectDoc,
  searchQuery,
  onSearchChange,
  onNewDocument,
  onOpenCommandPalette,
  selectedTag,
  onSelectTag,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleCategory = (category: string) => {
    setCollapsed((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const sortedCategories = Object.keys(groupedDocs).sort(
    (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
  );

  return (
    <aside className="w-72 bg-[#111] border-r border-gray-800 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="text-2xl">🧠</span>
            Second Brain
          </h1>
          <button
            onClick={onNewDocument}
            className="p-2 text-gray-400 hover:text-white hover:bg-indigo-500/20 rounded-lg transition-colors"
            title="New document (⌘N)"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">Knowledge Management</p>
      </div>

      {/* Command Palette trigger */}
      <div className="px-3 pt-3">
        <button
          onClick={onOpenCommandPalette}
          className="w-full flex items-center gap-2 px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-500 hover:border-indigo-500/50 hover:text-gray-400 transition-colors text-left"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="flex-1">Search or command...</span>
          <kbd className="px-1.5 py-0.5 text-xs bg-gray-800 rounded border border-gray-600">⌘K</kbd>
        </button>
      </div>
      
      {/* Quick filter */}
      <div className="p-3 border-b border-gray-800">
        <input
          type="text"
          placeholder="Filter documents..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-3 py-1.5 bg-gray-900/50 border border-gray-700/50 rounded text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
        />
      </div>

      {/* Document tree */}
      <nav className="flex-1 overflow-auto p-2">
        {sortedCategories.map((category) => (
          <div key={category} className="mb-2">
            {/* Category header */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors"
            >
              <span
                className={`transition-transform ${
                  collapsed[category] ? "" : "rotate-90"
                }`}
              >
                ▶
              </span>
              <span>{categoryIcons[category] || "📁"}</span>
              <span className="capitalize">{category}</span>
              <span className="ml-auto text-xs text-gray-600">
                {groupedDocs[category].length}
              </span>
            </button>

            {/* Documents */}
            {!collapsed[category] && (
              <div className="ml-4 mt-1 space-y-0.5">
                {groupedDocs[category]
                  .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
                  .map((doc) => (
                    <button
                      key={doc.slug}
                      onClick={() => onSelectDoc(doc)}
                      className={`w-full text-left px-3 py-1.5 rounded text-sm truncate transition-colors ${
                        selectedDoc?.slug === doc.slug
                          ? "bg-indigo-500/20 text-indigo-300"
                          : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                      }`}
                    >
                      {doc.title}
                    </button>
                  ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Tags Panel */}
      <TagsPanel
        selectedTag={selectedTag}
        onSelectTag={onSelectTag}
      />

      {/* Footer with keyboard hints */}
      <div className="p-3 border-t border-gray-800 text-xs text-gray-600">
        <div className="flex items-center justify-between mb-2">
          <span>⌘K</span><span className="text-gray-500">Command palette</span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span>⌘N</span><span className="text-gray-500">New document</span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span>⌘T</span><span className="text-gray-500">Templates</span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span>⌘G</span><span className="text-gray-500">Toggle graph</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-mono">/</span><span className="text-gray-500">Slash commands</span>
        </div>
      </div>
    </aside>
  );
}
