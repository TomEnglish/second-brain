import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
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

    // Get outlines
    const { data: outlines, error: outlinesError } = await supabase
      .from('outlines')
      .select('*')
      .eq('book_id', book.id)
      .order('created_at');

    if (outlinesError) throw outlinesError;

    // Get research notes
    const { data: researchNotes, error: researchError } = await supabase
      .from('research_notes')
      .select('*')
      .eq('book_id', book.id)
      .order('created_at');

    if (researchError) throw researchError;

    return NextResponse.json({
      slug: book.slug,
      title: book.title,
      status: book.status,
      bibleContent: book.bible_content,
      chapters: chapters.map(c => c.title),
      outlines: outlines.map(o => o.version),
      researchNotes: researchNotes.map(r => r.title),
    });
  } catch (error: any) {
    console.error("Error loading book:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
