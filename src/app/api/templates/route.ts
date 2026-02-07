import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import matter from "gray-matter";

const BRAIN_DIR = process.env.BRAIN_DIR || path.join(process.cwd(), "..", "brain");
const TEMPLATES_DIR = path.join(BRAIN_DIR, "templates");

interface TemplateVariable {
  name: string;
  label: string;
  placeholder?: string;
}

interface Template {
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  variables: TemplateVariable[];
  content: string;
}

// Ensure templates directory exists
if (!fs.existsSync(TEMPLATES_DIR)) {
  fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
}

function getTemplates(): Template[] {
  const templates: Template[] = [];

  if (!fs.existsSync(TEMPLATES_DIR)) {
    return templates;
  }

  const files = fs.readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith(".md"));

  for (const file of files) {
    const filePath = path.join(TEMPLATES_DIR, file);
    const fileContent = fs.readFileSync(filePath, "utf-8");
    
    const { data: frontmatter, content } = matter(fileContent);
    
    const slug = file.replace(/\.md$/, "");
    
    templates.push({
      slug,
      name: frontmatter.name || slug,
      description: frontmatter.description || "",
      icon: frontmatter.icon || "📄",
      category: frontmatter.category || "concepts",
      variables: Array.isArray(frontmatter.variables) ? frontmatter.variables : [],
      content: content.trim(),
    });
  }

  return templates.sort((a, b) => a.name.localeCompare(b.name));
}

// Process template variables and replace placeholders
function processTemplate(content: string, variables: Record<string, string>): string {
  let processed = content;
  
  // Built-in variables
  const now = new Date();
  const builtins: Record<string, string> = {
    date: now.toISOString().split("T")[0], // YYYY-MM-DD
    time: now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    datetime: now.toLocaleString("en-US"),
    year: now.getFullYear().toString(),
    month: (now.getMonth() + 1).toString().padStart(2, "0"),
    day: now.getDate().toString().padStart(2, "0"),
    weekday: now.toLocaleDateString("en-US", { weekday: "long" }),
  };
  
  // Replace built-in variables
  for (const [key, value] of Object.entries(builtins)) {
    processed = processed.replace(new RegExp(`\\{\\{${key}\\}\\}`, "gi"), value);
  }
  
  // Replace custom variables
  for (const [key, value] of Object.entries(variables)) {
    processed = processed.replace(new RegExp(`\\{\\{${key}\\}\\}`, "gi"), value || "");
  }
  
  return processed;
}

// GET - List all templates
export async function GET() {
  try {
    const templates = getTemplates();
    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error reading templates:", error);
    return NextResponse.json(
      { error: "Failed to read templates" },
      { status: 500 }
    );
  }
}

// POST - Apply a template (returns processed content)
export async function POST(request: NextRequest) {
  try {
    const { slug, variables = {} } = await request.json();

    if (!slug || typeof slug !== "string") {
      return NextResponse.json(
        { error: "Template slug is required" },
        { status: 400 }
      );
    }

    const templates = getTemplates();
    const template = templates.find((t) => t.slug === slug);

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Process the template content with variables
    const processedContent = processTemplate(template.content, variables);
    
    // Extract title from processed content (first H1)
    const titleMatch = processedContent.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : template.name;

    return NextResponse.json({
      title,
      content: processedContent,
      category: template.category,
    });
  } catch (error) {
    console.error("Error applying template:", error);
    return NextResponse.json(
      { error: "Failed to apply template" },
      { status: 500 }
    );
  }
}
