import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

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

    const brainDir = path.join(process.cwd(), "..", "brain", "books", params.slug);
    const chaptersDir = path.join(brainDir, "chapters");
    const exportsDir = path.join(brainDir, "exports");
    
    // Ensure exports directory exists
    await fs.mkdir(exportsDir, { recursive: true });

    // Combine all chapters
    const files = await fs.readdir(chaptersDir);
    const chapterFiles = files.filter(f => f.endsWith(".md")).sort();
    
    if (chapterFiles.length === 0) {
      return NextResponse.json(
        { error: "No chapters found" },
        { status: 400 }
      );
    }

    let manuscript = "";
    for (const file of chapterFiles) {
      const content = await fs.readFile(path.join(chaptersDir, file), "utf-8");
      manuscript += content + "\n\n";
    }

    const manuscriptPath = path.join(exportsDir, "manuscript.md");
    await fs.writeFile(manuscriptPath, manuscript);

    // Generate output file
    const outputPath = path.join(exportsDir, `${params.slug}.${format}`);
    
    if (format === "docx") {
      // Add page breaks for DOCX
      const pagebreak = '```{=openxml}\n<w:p><w:r><w:br w:type="page"/></w:r></w:p>\n```';
      
      const manuscriptWithBreaks = manuscript.replace(
        /^# /gm,
        `${pagebreak}\n\n# `
      );
      
      await fs.writeFile(manuscriptPath, manuscriptWithBreaks);
      
      await execAsync(
        `pandoc "${manuscriptPath}" --toc --toc-depth=1 -o "${outputPath}" --metadata title="${params.slug}"`
      );
    } else {
      // EPUB
      await execAsync(
        `pandoc "${manuscriptPath}" --toc --toc-depth=1 --split-level=1 -o "${outputPath}" --metadata title="${params.slug}"`
      );
    }

    // Read the generated file and return it
    const fileBuffer = await fs.readFile(outputPath);
    
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": format === "docx" 
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : "application/epub+zip",
        "Content-Disposition": `attachment; filename="${params.slug}.${format}"`,
      },
    });
  } catch (error: any) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
