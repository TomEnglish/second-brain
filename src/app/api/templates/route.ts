import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import matter from "gray-matter";

// GET - List all templates
export async function GET() {
  try {
    const { data: templates, error } = await supabase
      .from('templates')
      .select('*')
      .order('name');

    if (error) throw error;

    return NextResponse.json(templates);
  } catch (error: any) {
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

    const { data: template, error } = await supabase
      .from('templates')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !template) {
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
  } catch (error: any) {
    console.error("Error applying template:", error);
    return NextResponse.json(
      { error: "Failed to apply template" },
      { status: 500 }
    );
  }
}

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
