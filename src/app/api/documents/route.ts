import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import matter from "gray-matter";

const BRAIN_DIR = process.env.BRAIN_DIR || path.join(process.cwd(), "..", "brain");

// Ensure brain directories exist
const CATEGORIES = ["journals", "concepts", "projects", "research"];
for (const cat of CATEGORIES) {
  const catPath = path.join(BRAIN_DIR, cat);
  if (!fs.existsSync(catPath)) {
    fs.mkdirSync(catPath, { recursive: true });
  }
}

interface Document {
  slug: string;
  title: string;
  category: string;
  date?: string;
  content: string;
  tags: string[];
}

function extractTags(content: string): string[] {
  // Match #tags (but not ## headers or #123 numbers)
  const tagRegex = /(?:^|\s)#([a-zA-Z][a-zA-Z0-9_-]*)/g;
  const tags: string[] = [];
  let match;
  
  while ((match = tagRegex.exec(content)) !== null) {
    const tag = match[1].toLowerCase();
    if (!tags.includes(tag)) {
      tags.push(tag);
    }
  }
  
  return tags.sort();
}

function extractTitle(content: string, filename: string): string {
  // Try to get title from first H1
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) {
    return h1Match[1];
  }
  
  // Fall back to filename
  return filename
    .replace(/\.md$/, "")
    .replace(/^\d{4}-\d{2}-\d{2}-?/, "") // Remove date prefix
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase()); // Title case
}

function extractDate(filename: string): string | undefined {
  const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
  return dateMatch ? dateMatch[1] : undefined;
}

function getDocuments(): Document[] {
  const documents: Document[] = [];
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
      
      // Parse frontmatter if present
      const { data: frontmatter, content } = matter(fileContent);
      
      const slug = `${category}/${file.replace(/\.md$/, "")}`;
      const title = frontmatter.title || extractTitle(content, file);
      const date = frontmatter.date || extractDate(file);

      // Extract tags from frontmatter and content
      const frontmatterTags = Array.isArray(frontmatter.tags) 
        ? frontmatter.tags.map((t: string) => t.toLowerCase())
        : [];
      const contentTags = extractTags(content);
      const combinedTags = [...frontmatterTags, ...contentTags];
      const allTags = Array.from(new Set(combinedTags)).sort();

      documents.push({
        slug,
        title,
        category,
        date,
        content,
        tags: allTags,
      });
    }
  }

  return documents;
}

export async function GET() {
  try {
    const documents = getDocuments();
    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error reading documents:", error);
    return NextResponse.json(
      { error: "Failed to read documents" },
      { status: 500 }
    );
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Spaces to hyphens
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .trim();
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

export async function POST(request: NextRequest) {
  try {
    const { title, content, category } = await request.json();

    // Validate
    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    if (!CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      );
    }

    const today = getTodayDate();
    const slug = slugify(title);
    
    // Generate filename - for journals, use date prefix
    let filename: string;
    if (category === "journals") {
      filename = `${today}.md`;
    } else if (category === "research") {
      filename = `${today}-${slug}.md`;
    } else {
      filename = `${slug}.md`;
    }

    const filePath = path.join(BRAIN_DIR, category, filename);

    // Check if file exists (for non-journals, prevent overwrite)
    if (category !== "journals" && fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "A document with this name already exists" },
        { status: 409 }
      );
    }

    // For journals, append if exists
    if (category === "journals" && fs.existsSync(filePath)) {
      const existing = fs.readFileSync(filePath, "utf-8");
      const timestamp = new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const appendContent = `\n\n---\n\n## ${title} (${timestamp})\n\n${content || "*No content*"}`;
      fs.writeFileSync(filePath, existing + appendContent, "utf-8");
    } else {
      // Create frontmatter
      const frontmatter = `---
title: "${title.replace(/"/g, '\\"')}"
date: ${today}
---

`;
      const fileContent = frontmatter + (content ? `# ${title}\n\n${content}` : `# ${title}\n\n*Start writing...*`);
      fs.writeFileSync(filePath, fileContent, "utf-8");
    }

    // Return the created document
    const newDoc = {
      slug: `${category}/${filename.replace(/\.md$/, "")}`,
      title,
      category,
      date: today,
      content: content || "",
      tags: extractTags(content || ""),
    };

    return NextResponse.json(newDoc, { status: 201 });
  } catch (error) {
    console.error("Error creating document:", error);
    return NextResponse.json(
      { error: "Failed to create document" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { slug, content } = await request.json();

    if (!slug || typeof slug !== "string") {
      return NextResponse.json(
        { error: "Slug is required" },
        { status: 400 }
      );
    }

    // Parse slug into category and filename
    const [category, ...rest] = slug.split("/");
    const filename = rest.join("/") + ".md";
    const filePath = path.join(BRAIN_DIR, category, filename);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Read existing file to preserve frontmatter
    const existing = fs.readFileSync(filePath, "utf-8");
    const { data: frontmatter } = matter(existing);

    // Rebuild file with preserved frontmatter
    const newFrontmatter = Object.keys(frontmatter).length > 0
      ? `---\n${Object.entries(frontmatter).map(([k, v]) => `${k}: ${typeof v === 'string' ? `"${v}"` : v}`).join('\n')}\n---\n\n`
      : "";
    
    fs.writeFileSync(filePath, newFrontmatter + content, "utf-8");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating document:", error);
    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { error: "Slug is required" },
        { status: 400 }
      );
    }

    // Parse slug into category and filename
    const [category, ...rest] = slug.split("/");
    const filename = rest.join("/") + ".md";
    const filePath = path.join(BRAIN_DIR, category, filename);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Move to trash instead of deleting (safer)
    const trashDir = path.join(BRAIN_DIR, ".trash");
    if (!fs.existsSync(trashDir)) {
      fs.mkdirSync(trashDir, { recursive: true });
    }

    const trashPath = path.join(trashDir, `${category}-${filename}`);
    fs.renameSync(filePath, trashPath);

    return NextResponse.json({ success: true, trashedTo: trashPath });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
