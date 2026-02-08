import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { extractWikiLinks } from "@/lib/wikilinks";

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

    // Get all documents
    const { data: documents, error } = await supabase
      .from('documents')
      .select('*');

    if (error) throw error;

    // Find documents that link to the target
    const backlinks = documents.filter((doc) => {
      const links = extractWikiLinks(doc.content);
      return links.some(link => link.target === targetSlug || `${doc.category}/${link.target}` === targetSlug);
    });

    // Format backlinks
    const formatted = backlinks.map((doc) => ({
      slug: doc.slug,
      title: doc.title,
      category: doc.category,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Error fetching backlinks:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
