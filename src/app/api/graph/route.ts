import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { extractWikiLinks } from "@/lib/wikilinks";

export async function GET() {
  try {
    const { data: documents, error } = await supabase
      .from('documents')
      .select('slug, title, category, content');

    if (error) throw error;

    const nodes = documents.map((doc) => ({
      id: doc.slug,
      name: doc.title,
      category: doc.category,
    }));

    const links: { source: string; target: string }[] = [];
    
    documents.forEach((doc) => {
      const wikiLinks = extractWikiLinks(doc.content);
      wikiLinks.forEach((link) => {
        // Only add link if target exists
        if (documents.some((d) => d.slug === link.target || d.slug.endsWith(`/${link.target}`))) {
          const targetDoc = documents.find((d) => d.slug === link.target || d.slug.endsWith(`/${link.target}`));
          if (targetDoc) {
            links.push({
              source: doc.slug,
              target: targetDoc.slug,
            });
          }
        }
      });
    });

    return NextResponse.json({ nodes, links });
  } catch (error: any) {
    console.error("Error generating graph:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
