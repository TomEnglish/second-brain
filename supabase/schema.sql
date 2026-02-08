-- Second Brain Database Schema
-- For Supabase + Vercel deployment

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Documents table (journals, concepts, projects, research)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL, -- journals, concepts, projects, research, books
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, slug)
);

-- Books table
CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'intake', -- intake, outlining, writing, production, published
  bible_content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, slug)
);

-- Chapters table
CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  order_num INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  status TEXT DEFAULT 'draft', -- draft, reviewed, final
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(book_id, order_num)
);

-- Outlines table
CREATE TABLE outlines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  version TEXT NOT NULL, -- v1-high-level, v2-detailed, etc.
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(book_id, version)
);

-- Research notes table
CREATE TABLE research_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  evidence_tier INTEGER, -- 1-5 (1=strongest)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Templates table
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📄',
  category TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, slug)
);

-- Indexes for performance
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_tags ON documents USING GIN(tags);
CREATE INDEX idx_books_user_id ON books(user_id);
CREATE INDEX idx_chapters_book_id ON chapters(book_id);
CREATE INDEX idx_outlines_book_id ON outlines(book_id);
CREATE INDEX idx_research_notes_book_id ON research_notes(book_id);
CREATE INDEX idx_templates_user_id ON templates(user_id);

-- Full-text search on documents
CREATE INDEX idx_documents_content_search ON documents USING GIN(to_tsvector('english', content));
CREATE INDEX idx_documents_title_search ON documents USING GIN(to_tsvector('english', title));

-- Row Level Security (RLS) policies
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Documents policies
CREATE POLICY "Users can view their own documents"
  ON documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
  ON documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
  ON documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
  ON documents FOR DELETE
  USING (auth.uid() = user_id);

-- Books policies
CREATE POLICY "Users can view their own books"
  ON books FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own books"
  ON books FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own books"
  ON books FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own books"
  ON books FOR DELETE
  USING (auth.uid() = user_id);

-- Chapters policies (inherit from books)
CREATE POLICY "Users can view chapters of their books"
  ON chapters FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM books WHERE books.id = chapters.book_id AND books.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert chapters into their books"
  ON chapters FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM books WHERE books.id = chapters.book_id AND books.user_id = auth.uid()
  ));

CREATE POLICY "Users can update chapters of their books"
  ON chapters FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM books WHERE books.id = chapters.book_id AND books.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete chapters of their books"
  ON chapters FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM books WHERE books.id = chapters.book_id AND books.user_id = auth.uid()
  ));

-- Outlines policies
CREATE POLICY "Users can view outlines of their books"
  ON outlines FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM books WHERE books.id = outlines.book_id AND books.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert outlines into their books"
  ON outlines FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM books WHERE books.id = outlines.book_id AND books.user_id = auth.uid()
  ));

CREATE POLICY "Users can update outlines of their books"
  ON outlines FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM books WHERE books.id = outlines.book_id AND books.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete outlines of their books"
  ON outlines FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM books WHERE books.id = outlines.book_id AND books.user_id = auth.uid()
  ));

-- Research notes policies
CREATE POLICY "Users can view research notes of their books"
  ON research_notes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM books WHERE books.id = research_notes.book_id AND books.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert research notes into their books"
  ON research_notes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM books WHERE books.id = research_notes.book_id AND books.user_id = auth.uid()
  ));

CREATE POLICY "Users can update research notes of their books"
  ON research_notes FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM books WHERE books.id = research_notes.book_id AND books.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete research notes of their books"
  ON research_notes FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM books WHERE books.id = research_notes.book_id AND books.user_id = auth.uid()
  ));

-- Templates policies
CREATE POLICY "Users can view their own templates"
  ON templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own templates"
  ON templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON templates FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chapters_updated_at BEFORE UPDATE ON chapters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_research_notes_updated_at BEFORE UPDATE ON research_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
