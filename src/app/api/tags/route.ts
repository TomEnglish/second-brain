import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import matter from "gray-matter";

const BRAIN_DIR = process.env.BRAIN_DIR || path.join(process.cwd(), "..", "brain");

interface TagInfo {
  name: string;
  count: number;
  documents: string[]; // slugs of documents with this tag
}

function extractTags(content: string): string[] {
  const tagRegex = /(?:^|\s)#([a-zA-Z][a-zA-Z0-9_-]*)/g;
  const tags: string[] = [];
  let match;
  
  while ((match = tagRegex.exec(content)) !== null) {
    const tag = match[1].toLowerCase();
    if (!tags.includes(tag)) {
      tags.push(tag);
    }
  }
  
  return tags;
}

export async function GET() {
  try {
    const tagMap = new Map<string, { count: number; documents: string[] }>();
    const categories = ["journals", "concepts", "projects", "research"];

    for (const category of categories) {
      const categoryPath = path.join(BRAIN_DIR, category);
      
      if (!fs.existsSync(categoryPath)) {
        continue;
      }

      const files = fs.readdirSync(categoryPath).filter((f) => f.endsWith(".md"));

      for (const file of files) {
        const filePath = path.join(categoryPath, file);
        const fileContent = fs.readFileSync(filePath, "utf-8");
        const slug = `${category}/${file.replace(/\.md$/, "")}`;
        
        // Parse frontmatter
        const { data: frontmatter, content } = matter(fileContent);
        
        // Get tags from frontmatter and content
        const frontmatterTags = Array.isArray(frontmatter.tags) 
          ? frontmatter.tags.map((t: string) => t.toLowerCase())
          : [];
        const contentTags = extractTags(content);
        const combinedTags = [...frontmatterTags, ...contentTags];
        const allTags = combinedTags.filter((tag, idx) => combinedTags.indexOf(tag) === idx);
        
        // Add to tag map
        for (const tag of allTags) {
          const existing = tagMap.get(tag);
          if (existing) {
            existing.count++;
            existing.documents.push(slug);
          } else {
            tagMap.set(tag, { count: 1, documents: [slug] });
          }
        }
      }
    }

    // Convert to array and sort by count (descending)
    const tags: TagInfo[] = Array.from(tagMap.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        documents: data.documents,
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json(tags);
  } catch (error) {
    console.error("Error reading tags:", error);
    return NextResponse.json(
      { error: "Failed to read tags" },
      { status: 500 }
    );
  }
}
