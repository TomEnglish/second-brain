import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    // Get all documents and extract unique tags
    const { data: documents, error } = await supabase
      .from('documents')
      .select('tags');

    if (error) throw error;

    // Flatten and count tags
    const tagCounts: Record<string, number> = {};
    
    documents.forEach((doc) => {
      (doc.tags || []).forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    // Convert to array format
    const tags = Object.entries(tagCounts).map(([tag, count]) => ({
      tag,
      count,
    }));

    // Sort by count descending
    tags.sort((a, b) => b.count - a.count);

    return NextResponse.json(tags);
  } catch (error: any) {
    console.error("Error fetching tags:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
