import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { extractWikiLinks, resolveWikiLink } from "@/lib/wikilinks";

const BRAIN_DIR = process.env.BRAIN_DIR || path.join(process.cwd(), "..", "brain");

interface Document {
  slug: string;
  title: string;
  content: string;
}

function extractTitle(content: string, filename: string): string {
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) return h1Match[1];
  
  return filename
    .replace(/\.md$/, "")
    .replace(/^\d{4}-\d{2}-\d{2}-?/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getAllDocuments(): Document[] {
  const documents: Document[] = [];
  const categories = ["journals", "concepts", "projects", "research"];

  for (const category of categories) {
    const categoryPath = path.join(BRAIN_DIR, category);
    
    if (!fs.existsSync(categoryPath)) continue;

    const files = fs.readdirSync(categoryPath).filter((f) => f.endsWith(".md"));

    for (const file of files) {
      const filePath = path.join(categoryPath, file);
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const { data: frontmatter, content } = matter(fileContent);
      
      const slug = `${category}/${file.replace(/\.md$/, "")}`;
      const title = frontmatter.title || extractTitle(content, file);

      documents.push({ slug, title, content });
    }
  }

  return documents;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetSlug = searchParams.get("slug");

    if (!targetSlug) {
      return NextResponse.json(
        { error: "Slug parameter is required" },
        { status: 400 }
      );
    }

    const documents = getAllDocuments();
    
    // Find the target document
    const targetDoc = documents.find(d => d.slug === targetSlug);
    if (!targetDoc) {
      return NextResponse.json({ backlinks: [], outlinks: [] });
    }

    // Find backlinks (documents that link TO this one)
    const backlinks: { slug: string; title: string; context: string }[] = [];
    
    for (const doc of documents) {
      if (doc.slug === targetSlug) continue;

      const links = extractWikiLinks(doc.content);
      
      for (const link of links) {
        // Check if this link points to our target
        const resolved = resolveWikiLink(link.target, [{ slug: targetSlug, title: targetDoc.title }]);
        
        if (resolved) {
          // Extract context around the link
          const contextStart = Math.max(0, link.startIndex - 60);
          const contextEnd = Math.min(doc.content.length, link.endIndex + 60);
          let context = doc.content.slice(contextStart, contextEnd);
          
          if (contextStart > 0) context = "..." + context;
          if (contextEnd < doc.content.length) context = context + "...";
          context = context.replace(/\n/g, " ").replace(/\s+/g, " ").trim();

          backlinks.push({
            slug: doc.slug,
            title: doc.title,
            context,
          });
          break; // Only count each document once
        }
      }
    }

    // Find outlinks (links FROM this document to others)
    const outlinks: { slug: string; title: string; exists: boolean }[] = [];
    const targetLinks = extractWikiLinks(targetDoc.content);
    
    const seenTargets = new Set<string>();
    for (const link of targetLinks) {
      if (seenTargets.has(link.target.toLowerCase())) continue;
      seenTargets.add(link.target.toLowerCase());

      const resolved = resolveWikiLink(link.target, documents);
      outlinks.push({
        slug: resolved?.slug || link.target,
        title: resolved?.title || link.target,
        exists: !!resolved,
      });
    }

    return NextResponse.json({ backlinks, outlinks });
  } catch (error) {
    console.error("Error getting backlinks:", error);
    return NextResponse.json(
      { error: "Failed to get backlinks" },
      { status: 500 }
    );
  }
}
