import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const brainDir = path.join(process.cwd(), "..", "brain", "books", params.slug);
    
    // Get book structure
    const bibleContent = await fs.readFile(
      path.join(brainDir, "BOOK_BIBLE.md"),
      "utf-8"
    ).catch(() => "");

    // Get chapters
    const chaptersDir = path.join(brainDir, "chapters");
    let chapters: string[] = [];
    try {
      const files = await fs.readdir(chaptersDir);
      chapters = files.filter(f => f.endsWith(".md")).sort();
    } catch {}

    // Get outlines
    const outlinesDir = path.join(brainDir, "outlines");
    let outlines: string[] = [];
    try {
      const files = await fs.readdir(outlinesDir);
      outlines = files.filter(f => f.endsWith(".md")).sort();
    } catch {}

    // Get research notes
    const researchDir = path.join(brainDir, "research");
    let researchNotes: string[] = [];
    try {
      const files = await fs.readdir(researchDir);
      researchNotes = files.filter(f => f.endsWith(".md")).sort();
    } catch {}

    return NextResponse.json({
      slug: params.slug,
      title: params.slug.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
      status: "intake",
      bibleContent,
      chapters,
      outlines,
      researchNotes,
    });
  } catch (error: any) {
    console.error("Error loading book:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
