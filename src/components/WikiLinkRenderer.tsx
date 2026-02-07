"use client";

import { extractWikiLinks, resolveWikiLink } from "@/lib/wikilinks";
import { useMemo } from "react";

interface Document {
  slug: string;
  title: string;
}

interface WikiLinkRendererProps {
  content: string;
  documents: Document[];
  onNavigate: (slug: string) => void;
}

/**
 * Pre-processes content to replace [[wiki links]] with special markers,
 * then returns content that can be rendered with ReactMarkdown.
 * 
 * Since ReactMarkdown doesn't natively support wiki links, we convert them
 * to a special format that we can intercept in the link renderer.
 */
export function processWikiLinks(
  content: string,
  documents: Document[]
): { processedContent: string; linkMap: Map<string, { target: string; exists: boolean; title: string }> } {
  const linkMap = new Map<string, { target: string; exists: boolean; title: string }>();
  
  let processedContent = content;
  const links = extractWikiLinks(content);
  
  // Process in reverse order to maintain string indices
  for (let i = links.length - 1; i >= 0; i--) {
    const link = links[i];
    const resolved = resolveWikiLink(link.target, documents);
    
    const displayText = link.alias || (resolved?.title || link.target);
    const markerId = `wikilink-${i}`;
    
    linkMap.set(markerId, {
      target: resolved?.slug || link.target,
      exists: !!resolved,
      title: displayText,
    });
    
    // Replace with markdown link using special scheme
    const replacement = `[${displayText}](wikilink://${markerId})`;
    processedContent = 
      processedContent.slice(0, link.startIndex) + 
      replacement + 
      processedContent.slice(link.endIndex);
  }
  
  return { processedContent, linkMap };
}

/**
 * Component that renders content with wiki link support
 */
export function useWikiLinks(content: string, documents: Document[]) {
  return useMemo(() => {
    return processWikiLinks(content, documents);
  }, [content, documents]);
}

/**
 * Creates a link component for ReactMarkdown that handles wiki links
 */
export function createWikiLinkComponent(
  linkMap: Map<string, { target: string; exists: boolean; title: string }>,
  onNavigate: (slug: string) => void
) {
  return function WikiLinkAnchor({ 
    href, 
    children 
  }: { 
    href?: string; 
    children?: React.ReactNode 
  }) {
    // Check if this is a wiki link
    if (href?.startsWith("wikilink://")) {
      const markerId = href.replace("wikilink://", "");
      const linkInfo = linkMap.get(markerId);
      
      if (linkInfo) {
        if (linkInfo.exists) {
          return (
            <button
              onClick={(e) => {
                e.preventDefault();
                onNavigate(linkInfo.target);
              }}
              className="text-indigo-400 hover:text-indigo-300 underline decoration-dotted underline-offset-2 cursor-pointer"
              title={`Go to: ${linkInfo.title}`}
            >
              {children}
            </button>
          );
        } else {
          // Broken link styling
          return (
            <span
              className="text-red-400 underline decoration-wavy underline-offset-2 cursor-help"
              title={`"${linkInfo.title}" does not exist - click to create?`}
            >
              {children}
            </span>
          );
        }
      }
    }
    
    // Regular external link
    return (
      <a
        href={href}
        className="text-indigo-400 hover:text-indigo-300 underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    );
  };
}
