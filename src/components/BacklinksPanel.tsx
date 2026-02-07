"use client";

import { useState, useEffect } from "react";

interface Backlink {
  slug: string;
  title: string;
  context: string;
}

interface Outlink {
  slug: string;
  title: string;
  exists: boolean;
}

interface BacklinksPanelProps {
  documentSlug: string;
  onNavigate: (slug: string) => void;
}

export default function BacklinksPanel({ documentSlug, onNavigate }: BacklinksPanelProps) {
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [outlinks, setOutlinks] = useState<Outlink[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (!documentSlug) return;

    setLoading(true);
    fetch(`/api/backlinks?slug=${encodeURIComponent(documentSlug)}`)
      .then(res => res.json())
      .then(data => {
        setBacklinks(data.backlinks || []);
        setOutlinks(data.outlinks || []);
        setLoading(false);
      })
      .catch(() => {
        setBacklinks([]);
        setOutlinks([]);
        setLoading(false);
      });
  }, [documentSlug]);

  const hasLinks = backlinks.length > 0 || outlinks.length > 0;

  if (loading) {
    return (
      <div className="border-t border-gray-800 mt-8 pt-6">
        <div className="text-gray-500 text-sm">Loading links...</div>
      </div>
    );
  }

  if (!hasLinks) {
    return null; // Don't show panel if no links
  }

  return (
    <div className="border-t border-gray-800 mt-8 pt-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 text-sm font-medium transition-colors"
      >
        <svg
          className={`w-4 h-4 transition-transform ${expanded ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span>
          {backlinks.length + outlinks.length} Link{backlinks.length + outlinks.length !== 1 ? "s" : ""}
        </span>
      </button>

      {expanded && (
        <div className="space-y-6">
          {/* Backlinks */}
          {backlinks.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
                </svg>
                {backlinks.length} Backlink{backlinks.length !== 1 ? "s" : ""}
              </h4>
              <ul className="space-y-2">
                {backlinks.map((link) => (
                  <li key={link.slug}>
                    <button
                      onClick={() => onNavigate(link.slug)}
                      className="block w-full text-left p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors group"
                    >
                      <div className="text-indigo-400 group-hover:text-indigo-300 font-medium text-sm">
                        {link.title}
                      </div>
                      <div className="text-gray-500 text-xs mt-1 line-clamp-2">
                        {link.context}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Outlinks */}
          {outlinks.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {outlinks.length} Outgoing Link{outlinks.length !== 1 ? "s" : ""}
              </h4>
              <div className="flex flex-wrap gap-2">
                {outlinks.map((link) => (
                  <button
                    key={link.slug}
                    onClick={() => link.exists && onNavigate(link.slug)}
                    disabled={!link.exists}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      link.exists
                        ? "bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30"
                        : "bg-red-500/10 text-red-400 cursor-not-allowed line-through"
                    }`}
                    title={link.exists ? `Go to ${link.title}` : `"${link.title}" does not exist`}
                  >
                    {link.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
