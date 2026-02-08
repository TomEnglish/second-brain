import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { format } = await request.json();
    
    if (!["docx", "epub"].includes(format)) {
      return NextResponse.json(
        { error: "Invalid format. Use 'docx' or 'epub'" },
        { status: 400 }
      );
    }

    // Get book
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('*')
      .eq('slug', params.slug)
      .single();

    if (bookError) throw bookError;

    // Get chapters
    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('*')
      .eq('book_id', book.id)
      .order('order_num');

    if (chaptersError) throw chaptersError;
    
    if (chapters.length === 0) {
      return NextResponse.json(
        { error: "No chapters found" },
        { status: 400 }
      );
    }

    // Combine all chapters
    let manuscript = "";
    for (const chapter of chapters) {
      manuscript += (chapter.content || "") + "\n\n";
    }

    // Create temp directory
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'book-export-'));
    const manuscriptPath = path.join(tmpDir, "manuscript.md");
    const outputPath = path.join(tmpDir, `${params.slug}.${format}`);

    try {
      await fs.writeFile(manuscriptPath, manuscript);

      if (format === "docx") {
        // Add page breaks for DOCX
        const pagebreak = '```{=openxml}\n<w:p><w:r><w:br w:type="page"/></w:r></w:p>\n```';
        const manuscriptWithBreaks = manuscript.replace(
          /^# /gm,
          `${pagebreak}\n\n# `
        );
        await fs.writeFile(manuscriptPath, manuscriptWithBreaks);
        
        await execAsync(
          `pandoc "${manuscriptPath}" --toc --toc-depth=1 -o "${outputPath}" --metadata title="${book.title}"`
        );
      } else {
        // EPUB
        await execAsync(
          `pandoc "${manuscriptPath}" --toc --toc-depth=1 --split-level=1 -o "${outputPath}" --metadata title="${book.title}"`
        );
      }

      // Read the generated file and return it
      const fileBuffer = await fs.readFile(outputPath);
      
      // Clean up temp files
      await fs.rm(tmpDir, { recursive: true });
      
      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": format === "docx" 
            ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : "application/epub+zip",
          "Content-Disposition": `attachment; filename="${params.slug}.${format}"`,
        },
      });
    } catch (execError) {
      // Clean up on error
      await fs.rm(tmpDir, { recursive: true }).catch(() => {});
      throw execError;
    }
  } catch (error: any) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
