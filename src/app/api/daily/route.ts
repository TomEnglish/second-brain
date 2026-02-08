import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { date } = await request.json();

    if (!date) {
      return NextResponse.json(
        { error: "Date is required (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const slug = `journals/${date}`;
    const title = new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const content = `---
title: "${title}"
date: ${date}
tags: [journal, daily]
---

# ${title}

## Morning

## Afternoon

## Evening

## Notes
`;

    // Check if already exists
    const { data: existing } = await supabase
      .from('documents')
      .select('slug')
      .eq('slug', slug)
      .single();

    if (existing) {
      return NextResponse.json({ success: true, exists: true });
    }

    // Create new daily note
    const { error } = await supabase
      .from('documents')
      .insert({
        slug,
        title,
        category: 'journals',
        content,
        tags: ['journal', 'daily'],
        user_id: '00000000-0000-0000-0000-000000000000', // TODO: Replace with actual user ID
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error creating daily note:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
