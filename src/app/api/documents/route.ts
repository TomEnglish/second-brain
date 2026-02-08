import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import matter from "gray-matter";

// GET - List all documents
export async function GET(request: NextRequest) {
  try {
    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform to match existing interface
    const formatted = documents.map(doc => ({
      slug: doc.slug,
      title: doc.title,
      category: doc.category,
      content: doc.content,
      tags: doc.tags || [],
      date: doc.created_at.split('T')[0], // YYYY-MM-DD
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

// POST - Create new document
export async function POST(request: NextRequest) {
  try {
    const { title, content, category } = await request.json();

    if (!title || !content || !category) {
      return NextResponse.json(
        { error: "Title, content, and category are required" },
        { status: 400 }
      );
    }

    // Generate slug from title
    const slug = `${category}/${title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}`;

    // Parse frontmatter for tags
    const { data: frontmatter } = matter(content);
    const tags = frontmatter.tags || [];

    const { data, error } = await supabase
      .from('documents')
      .insert({
        slug,
        title,
        category,
        content,
        tags,
        user_id: '00000000-0000-0000-0000-000000000000', // TODO: Replace with actual user ID from auth
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, document: data });
  } catch (error: any) {
    console.error("Error creating document:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create document" },
      { status: 500 }
    );
  }
}

// PUT - Update existing document
export async function PUT(request: NextRequest) {
  try {
    const { slug, content } = await request.json();

    if (!slug || !content) {
      return NextResponse.json(
        { error: "Slug and content are required" },
        { status: 400 }
      );
    }

    // Parse frontmatter for tags
    const { data: frontmatter } = matter(content);
    const tags = frontmatter.tags || [];

    const { data, error} = await supabase
      .from('documents')
      .update({ content, tags })
      .eq('slug', slug)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, document: data });
  } catch (error: any) {
    console.error("Error updating document:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update document" },
      { status: 500 }
    );
  }
}

// DELETE - Delete document
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

    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('slug', slug);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete document" },
      { status: 500 }
    );
  }
}
