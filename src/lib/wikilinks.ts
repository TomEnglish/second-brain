/**
 * Wiki Links Utility
 * Parses [[wiki links]] from markdown content and provides lookup/resolution.
 */

export interface WikiLink {
  raw: string;        // The full match including brackets: [[link|alias]]
  target: string;     // The link target: "link"
  alias?: string;     // Optional display text: "alias"
  startIndex: number; // Position in string
  endIndex: number;   // End position
}

// Regex to match [[link]] or [[link|alias]]
const WIKI_LINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

/**
 * Extract all wiki links from content
 */
export function extractWikiLinks(content: string): WikiLink[] {
  const links: WikiLink[] = [];
  let match;

  while ((match = WIKI_LINK_REGEX.exec(content)) !== null) {
    links.push({
      raw: match[0],
      target: match[1].trim(),
      alias: match[2]?.trim(),
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  // Reset regex state
  WIKI_LINK_REGEX.lastIndex = 0;

  return links;
}

/**
 * Normalize a wiki link target to a slug
 * Handles various formats:
 * - "Document Name" → "document-name"
 * - "concepts/second-brain-system" → "concepts/second-brain-system"
 * - "2026-01-29" → "journals/2026-01-29" (date-like patterns default to journals)
 */
export function normalizeWikiTarget(target: string): string {
  // If it already has a category prefix, return as-is (normalized)
  if (target.includes("/")) {
    return target.toLowerCase().trim();
  }

  // Check if it's a date pattern (journal entry)
  if (/^\d{4}-\d{2}-\d{2}$/.test(target)) {
    return `journals/${target}`;
  }

  // Otherwise normalize to slug format
  return target
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .trim();
}

/**
 * Find matching document from a list of documents
 */
export function resolveWikiLink(
  target: string,
  documents: { slug: string; title: string }[]
): { slug: string; title: string } | null {
  const normalized = normalizeWikiTarget(target);
  
  // Try exact slug match first
  const exactMatch = documents.find(d => d.slug === normalized);
  if (exactMatch) return exactMatch;

  // Try matching just the filename part (without category)
  const filenameMatch = documents.find(d => {
    const filename = d.slug.split("/").pop() || "";
    return filename === normalized || filename === target.toLowerCase().replace(/\s+/g, "-");
  });
  if (filenameMatch) return filenameMatch;

  // Try title match (case-insensitive)
  const titleMatch = documents.find(
    d => d.title.toLowerCase() === target.toLowerCase()
  );
  if (titleMatch) return titleMatch;

  // Try fuzzy title match (title contains target or target contains title)
  const fuzzyMatch = documents.find(
    d => 
      d.title.toLowerCase().includes(target.toLowerCase()) ||
      target.toLowerCase().includes(d.title.toLowerCase())
  );
  if (fuzzyMatch) return fuzzyMatch;

  return null;
}

/**
 * Get all documents that link TO a specific document
 */
export function getBacklinks(
  targetSlug: string,
  targetTitle: string,
  documents: { slug: string; title: string; content: string }[]
): { slug: string; title: string; context: string }[] {
  const backlinks: { slug: string; title: string; context: string }[] = [];

  for (const doc of documents) {
    // Don't include self-references
    if (doc.slug === targetSlug) continue;

    const links = extractWikiLinks(doc.content);
    
    for (const link of links) {
      // Check if this link points to our target
      const resolved = resolveWikiLink(link.target, [{ slug: targetSlug, title: targetTitle }]);
      
      if (resolved) {
        // Extract context around the link
        const contextStart = Math.max(0, link.startIndex - 50);
        const contextEnd = Math.min(doc.content.length, link.endIndex + 50);
        let context = doc.content.slice(contextStart, contextEnd);
        
        // Clean up context
        if (contextStart > 0) context = "..." + context;
        if (contextEnd < doc.content.length) context = context + "...";
        context = context.replace(/\n/g, " ").trim();

        backlinks.push({
          slug: doc.slug,
          title: doc.title,
          context,
        });
        break; // Only count each document once
      }
    }
  }

  return backlinks;
}

/**
 * Replace wiki links in content with rendered HTML/elements
 * This is a simple text replacement - for React, use the WikiLinkRenderer component
 */
export function replaceWikiLinks(
  content: string,
  documents: { slug: string; title: string }[],
  linkRenderer: (target: string, alias: string, resolved: { slug: string; title: string } | null) => string
): string {
  return content.replace(WIKI_LINK_REGEX, (match, target, alias) => {
    const resolved = resolveWikiLink(target, documents);
    return linkRenderer(target, alias || target, resolved);
  });
}
