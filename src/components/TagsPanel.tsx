"use client";

import { useState, useEffect } from "react";

interface TagInfo {
  name: string;
  count: number;
  documents: string[];
}

interface TagsPanelProps {
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  compact?: boolean;
}

export default function TagsPanel({ selectedTag, onSelectTag, compact = false }: TagsPanelProps) {
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTags() {
      try {
        const res = await fetch("/api/tags");
        const data = await res.json();
        setTags(data);
      } catch (err) {
        console.error("Failed to fetch tags:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTags();
  }, []);

  // Calculate tag sizes for cloud view (min 0.75rem, max 1.5rem)
  const maxCount = Math.max(...tags.map((t) => t.count), 1);
  const getTagSize = (count: number) => {
    const normalized = count / maxCount;
    return 0.75 + normalized * 0.75; // 0.75rem to 1.5rem
  };

  // Get color class based on count
  const getTagColor = (count: number) => {
    const normalized = count / maxCount;
    if (normalized > 0.7) return "text-indigo-400 hover:text-indigo-300";
    if (normalized > 0.4) return "text-purple-400 hover:text-purple-300";
    if (normalized > 0.2) return "text-blue-400 hover:text-blue-300";
    return "text-gray-400 hover:text-gray-300";
  };

  if (isLoading) {
    return (
      <div className="px-3 py-2">
        <div className="animate-pulse flex space-x-2">
          <div className="h-4 bg-gray-700 rounded w-12"></div>
          <div className="h-4 bg-gray-700 rounded w-16"></div>
          <div className="h-4 bg-gray-700 rounded w-10"></div>
        </div>
      </div>
    );
  }

  if (tags.length === 0) {
    return (
      <div className="px-3 py-2 text-gray-500 text-sm">
        No tags yet. Add #tags to your documents.
      </div>
    );
  }

  return (
    <div className="border-t border-gray-800">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-gray-400 hover:text-white transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
            Tags
          </span>
        </span>
        <span className="text-xs text-gray-500">{tags.length}</span>
      </button>

      {/* Tag Cloud */}
      {isExpanded && (
        <div className="px-3 pb-3">
          {/* Clear filter button */}
          {selectedTag && (
            <button
              onClick={() => onSelectTag(null)}
              className="mb-2 flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear filter: #{selectedTag}
            </button>
          )}

          {/* Tag cloud */}
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <button
                key={tag.name}
                onClick={() => onSelectTag(selectedTag === tag.name ? null : tag.name)}
                className={`
                  inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                  transition-all duration-150 cursor-pointer
                  ${
                    selectedTag === tag.name
                      ? "bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1 ring-offset-gray-900"
                      : `bg-gray-800 ${getTagColor(tag.count)}`
                  }
                `}
                style={{ fontSize: `${getTagSize(tag.count)}rem` }}
                title={`${tag.count} document${tag.count !== 1 ? "s" : ""}`}
              >
                <span className="opacity-60">#</span>
                {tag.name}
                <span className="text-xs opacity-50 ml-0.5">{tag.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
