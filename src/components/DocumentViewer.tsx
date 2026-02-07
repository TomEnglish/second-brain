"use client";

import { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import BacklinksPanel from "./BacklinksPanel";
import { processWikiLinks, createWikiLinkComponent } from "./WikiLinkRenderer";

interface Document {
  slug: string;
  title: string;
  category: string;
  date?: string;
  content: string;
  tags?: string[];
}

interface DocumentViewerProps {
  document: Document;
  documents: Document[]; // All documents for wiki link resolution
  onEdit?: () => void;
  onDelete?: () => void;
  onNavigate?: (slug: string) => void;
  onTagClick?: (tag: string) => void;
}

export default function DocumentViewer({ 
  document, 
  documents,
  onEdit, 
  onDelete,
  onNavigate,
  onTagClick
}: DocumentViewerProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Process wiki links in content
  const { processedContent, linkMap } = useMemo(() => {
    return processWikiLinks(document.content, documents);
  }, [document.content, documents]);

  // Create the link component with wiki link handling
  const LinkComponent = useMemo(() => {
    return createWikiLinkComponent(linkMap, (slug) => {
      onNavigate?.(slug);
    });
  }, [linkMap, onNavigate]);

  return (
    <article className="max-w-4xl mx-auto p-8">
      {/* Document header */}
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <span className="capitalize">{document.category}</span>
            {document.date && (
              <>
                <span>•</span>
                <span>{formatDate(document.date)}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                title="Edit document (⌘E)"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Delete document"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white">{document.title}</h1>

        {/* Tags */}
        {document.tags && document.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {document.tags.map((tag) => (
              <button
                key={tag}
                onClick={() => onTagClick?.(tag)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-800 hover:bg-indigo-600/30 text-gray-400 hover:text-indigo-300 rounded-full text-sm transition-colors cursor-pointer"
                title={`Filter by #${tag}`}
              >
                <span className="opacity-60">#</span>
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Delete confirmation */}
        {showDeleteConfirm && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-300 text-sm mb-3">
              Are you sure you want to delete &quot;{document.title}&quot;? It will be moved to trash.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onDelete?.();
                  setShowDeleteConfirm(false);
                }}
                className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Document content */}
      <div className="prose prose-invert max-w-none">
        <ReactMarkdown
          components={{
            h1: ({ children }) => (
              <h1 className="text-2xl font-bold text-white mb-4 pb-2 border-b border-gray-800">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-xl font-semibold text-white mt-8 mb-4">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-lg font-medium text-gray-100 mt-6 mb-3">
                {children}
              </h3>
            ),
            p: ({ children }) => (
              <p className="mb-4 leading-relaxed text-gray-300">{children}</p>
            ),
            ul: ({ children }) => (
              <ul className="list-disc list-inside mb-4 space-y-2 text-gray-300">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-300">
                {children}
              </ol>
            ),
            li: ({ children }) => <li className="text-gray-300">{children}</li>,
            code: ({ className, children }) => {
              const isInline = !className;
              if (isInline) {
                return (
                  <code className="bg-gray-800 px-1.5 py-0.5 rounded text-sm text-indigo-300">
                    {children}
                  </code>
                );
              }
              return (
                <code className={className}>{children}</code>
              );
            },
            pre: ({ children }) => (
              <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto mb-4 text-sm">
                {children}
              </pre>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-indigo-500 pl-4 italic text-gray-400 my-4">
                {children}
              </blockquote>
            ),
            a: LinkComponent,
            hr: () => <hr className="my-8 border-gray-800" />,
          }}
        >
          {processedContent}
        </ReactMarkdown>
      </div>

      {/* Backlinks Panel */}
      {onNavigate && (
        <BacklinksPanel 
          documentSlug={document.slug} 
          onNavigate={onNavigate} 
        />
      )}
    </article>
  );
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}
