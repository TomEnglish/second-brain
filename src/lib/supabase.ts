import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client with service role key (bypasses RLS)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Database types
export interface Document {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  category: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Book {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  status: 'intake' | 'outlining' | 'writing' | 'production' | 'published';
  bible_content: string | null;
  created_at: string;
  updated_at: string;
}

export interface Chapter {
  id: string;
  book_id: string;
  order_num: number;
  title: string;
  content: string | null;
  status: 'draft' | 'reviewed' | 'final';
  created_at: string;
  updated_at: string;
}

export interface Outline {
  id: string;
  book_id: string;
  version: string;
  content: string;
  created_at: string;
}

export interface ResearchNote {
  id: string;
  book_id: string;
  title: string;
  content: string;
  evidence_tier: number | null;
  created_at: string;
  updated_at: string;
}

export interface Template {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  category: string;
  variables: any[];
  content: string;
  created_at: string;
}
