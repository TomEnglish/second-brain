import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import matter from "gray-matter";

const BRAIN_DIR = process.env.BRAIN_DIR || path.join(process.cwd(), "..", "brain");

// Wiki link regex
const WIKI_LINK_REGEX = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

interface GraphNode {
  id: string;
  title: string;
  category: string;
  linkCount: number;
  size: number;
}

interface GraphLink {
  source: string;
  target: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

function normalizeToSlug(target: string): string {
  // If it already has a category prefix, return as-is
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

function findDocumentSlug(
  target: string,
  documents: { slug: string; title: string }[]
): string | null {
  const normalized = normalizeToSlug(target);
  
  // Try exact slug match first
  const exactMatch = documents.find(d => d.slug === normalized);
  if (exactMatch) return exactMatch.slug;

  // Try matching just the filename part (without category)
  const filenameMatch = documents.find(d => {
    const filename = d.slug.split("/").pop() || "";
    return filename === normalized || filename === target.toLowerCase().replace(/\s+/g, "-");
  });
  if (filenameMatch) return filenameMatch.slug;

  // Try title match (case-insensitive)
  const titleMatch = documents.find(
    d => d.title.toLowerCase() === target.toLowerCase()
  );
  if (titleMatch) return titleMatch.slug;

  // Try fuzzy title match
  const fuzzyMatch = documents.find(
    d => 
      d.title.toLowerCase().includes(target.toLowerCase()) ||
      target.toLowerCase().includes(d.title.toLowerCase())
  );
  if (fuzzyMatch) return fuzzyMatch.slug;

  return null;
}

function getGraphData(): GraphData {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const documents: { slug: string; title: string; content: string; category: string }[] = [];
  const categories = ["journals", "concepts", "projects", "research"];

  // First pass: collect all documents
  for (const category of categories) {
    const categoryPath = path.join(BRAIN_DIR, category);
    
    if (!fs.existsSync(categoryPath)) continue;

    const files = fs.readdirSync(categoryPath).filter((f) => f.endsWith(".md"));

    for (const file of files) {
      const filePath = path.join(categoryPath, file);
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const { data: frontmatter, content } = matter(fileContent);
      
      const slug = `${category}/${file.replace(/\.md$/, "")}`;
      
      // Extract title
      let title = frontmatter.title;
      if (!title) {
        const h1Match = content.match(/^#\s+(.+)$/m);
        title = h1Match 
          ? h1Match[1] 
          : file.replace(/\.md$/, "").replace(/^\d{4}-\d{2}-\d{2}-?/, "").replace(/-/g, " ");
      }

      documents.push({ slug, title, content, category });
    }
  }

  // Second pass: build graph
  const linkCounts: Record<string, number> = {};

  for (const doc of documents) {
    // Extract wiki links
    let match;
    while ((match = WIKI_LINK_REGEX.exec(doc.content)) !== null) {
      const target = match[1].trim();
      const targetSlug = findDocumentSlug(target, documents);
      
      if (targetSlug && targetSlug !== doc.slug) {
        // Avoid duplicate links
        const linkKey = `${doc.slug}|${targetSlug}`;
        const reverseLinkKey = `${targetSlug}|${doc.slug}`;
        
        const existingLinks = links.map(l => `${l.source}|${l.target}`);
        if (!existingLinks.includes(linkKey) && !existingLinks.includes(reverseLinkKey)) {
          links.push({ source: doc.slug, target: targetSlug });
        }
        
        // Count links for node sizing
        linkCounts[doc.slug] = (linkCounts[doc.slug] || 0) + 1;
        linkCounts[targetSlug] = (linkCounts[targetSlug] || 0) + 1;
      }
    }
    WIKI_LINK_REGEX.lastIndex = 0;
  }

  // Create nodes with sizing based on link count
  for (const doc of documents) {
    const linkCount = linkCounts[doc.slug] || 0;
    nodes.push({
      id: doc.slug,
      title: doc.title,
      category: doc.category,
      linkCount,
      size: Math.max(4, Math.min(20, 4 + linkCount * 2)), // Size between 4 and 20
    });
  }

  return { nodes, links };
}

export async function GET() {
  try {
    const graphData = getGraphData();
    return NextResponse.json(graphData);
  } catch (error) {
    console.error("Error building graph:", error);
    return NextResponse.json(
      { error: "Failed to build graph" },
      { status: 500 }
    );
  }
}
