# Second Brain 🧠

A personal knowledge management system with integrated book writing workflow. Built with Next.js, Supabase, and deployed on Vercel.

## Features

### Core Knowledge Management
- 📓 **Documents** - Journals, concepts, projects, research notes
- 🔗 **Wiki Links** - `[[document-name]]` linking between notes
- 🔙 **Backlinks** - See what links to each document
- 📊 **Knowledge Graph** - Visual network of your notes
- 🏷️ **Tags** - Organize with flexible tagging
- 📅 **Daily Notes** - Quick daily journal entries
- 🔍 **Full-text Search** - Find anything instantly
- ⌘K **Command Palette** - Quick navigation and actions

### Book Writing Workflow
- 📚 **Book Projects** - Manage multiple book projects
- 📖 **Book Bible** - Master reference document per book
- 📝 **Outlines** - Iterative outline versions
- 📄 **Chapters** - Chapter management with status tracking
- 🔬 **Research Notes** - Linked research with evidence tiers
- 📦 **KDP Export** - Generate DOCX/EPUB for publishing

### Templates & Automation
- 📋 **Templates** - Book Bible, chapters, notes
- / **Slash Commands** - Quick content insertion
- 🤖 **Auto-save** - Never lose your work

---

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React, TypeScript
- **Backend:** Next.js API Routes
- **Database:** Supabase (PostgreSQL with Row Level Security)
- **Auth:** Supabase Auth
- **Deployment:** Vercel
- **Styling:** Tailwind CSS
- **Export:** Pandoc (DOCX/EPUB generation)

---

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- Supabase account (free tier)
- Vercel account (optional, for deployment)
- Pandoc installed (for book export)

```bash
# Install pandoc
# macOS
brew install pandoc

# Ubuntu/Debian
sudo apt-get install pandoc

# Windows
choco install pandoc
```

### 2. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Note your:
   - Project URL
   - Anon (public) key
   - Service role key

### 3. Set Up Database

Run the schema in Supabase SQL Editor:

```bash
# Copy schema
cat supabase/schema.sql

# Paste into Supabase SQL Editor and run
```

This creates:
- `documents` table
- `books` table
- `chapters` table
- `outlines` table
- `research_notes` table
- `templates` table
- Row Level Security policies
- Indexes for performance

### 4. Configure Environment Variables

```bash
# Copy example env file
cp .env.local.example .env.local

# Edit .env.local with your Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 5. Install Dependencies

```bash
npm install
```

### 6. Migrate Existing Data (Optional)

If you have existing files in `~/clawd/brain/`:

```bash
# Install ts-node for migration script
npm install -g ts-node

# Run migration
npx ts-node scripts/migrate-data.ts
```

This imports:
- Documents from `brain/journals/`, `brain/concepts/`, etc.
- Books from `brain/books/*/BOOK_BIBLE.md`
- Chapters from `brain/books/*/chapters/`
- Outlines from `brain/books/*/outlines/`
- Templates from `src/templates/`

### 7. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 8. Create Your Account

1. Go to `/login`
2. Click "Sign Up"
3. Enter email and password
4. Check email for confirmation link
5. Sign in!

---

## Deployment to Vercel

### Method 1: GitHub Integration (Recommended)

1. Push to GitHub:
```bash
git push origin main
```

2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
6. Deploy!

### Method 2: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Add environment variables in dashboard
# Then deploy to production
vercel --prod
```

---

## Usage Guide

### Creating Documents

**Quick Capture (⌘N):**
1. Press `⌘N`
2. Type title
3. Select category
4. Start writing

**From Template (⌘T):**
1. Press `⌘T`
2. Select template
3. Fill variables
4. Customize

### Wiki Links

Link to other documents:
```markdown
See [[concepts/metabolism]] for details.
Check [[journals/2026-02-07]] for context.
```

### Tags

Add tags in frontmatter or inline:
```markdown
---
tags: [book, research, metabolism]
---

Content with #inline-tags
```

### Book Workflow

1. **Create Book Bible** (⌘T → "Book Bible")
2. Fill out 15 sections
3. Click Books → Your Book → BOOK_BIBLE.md
4. BookManager opens
5. **Outlines tab** → Create high-level outline
6. **Chapters tab** → Write chapters
7. **Export tab** → Generate DOCX/EPUB

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` | Command palette |
| `⌘N` | New document |
| `⌘T` | Templates |
| `⌘E` | Edit mode |
| `⌘G` | Toggle graph view |
| `/` | Slash commands (in editor) |

---

## File Structure

```
second-brain/
├── src/
│   ├── app/                 # Next.js app router
│   │   ├── api/            # API routes
│   │   ├── login/          # Login page
│   │   └── page.tsx        # Main app
│   ├── components/         # React components
│   ├── lib/               # Utilities
│   └── templates/         # Document templates
├── supabase/
│   └── schema.sql         # Database schema
├── scripts/
│   └── migrate-data.ts    # Data migration
└── middleware.ts          # Auth middleware
```

---

## Database Schema

### Documents
- **journals/** - Daily notes, logs
- **concepts/** - Ideas, theories, frameworks
- **projects/** - Project documentation
- **research/** - Research notes, papers
- **books/** - Book Bible documents

### Books
- **Book Bible** - Master reference
- **Chapters** - Chapter drafts with status
- **Outlines** - Version-controlled outlines
- **Research Notes** - Evidence and citations

### Templates
- Reusable document structures
- Variable substitution
- Category-specific

---

## Abundance Paradigm for Books

**Traditional:** Write exactly what's needed  
**New approach:** Generate abundance, select best

**For non-fiction:**
- Over-outline (3x more chapters than needed)
- Over-write (extensive drafts, prune to essentials)
- Over-reference (10x citations, pick winners)
- Over-research (summarize everything, select gems)

**Workflow:**
1. Fill Book Bible (review before proceeding)
2. Generate high-level outline (review structure)
3. Create detailed chapter outlines (review before writing)
4. Write abundant chapter drafts
5. Prune and refine

---

## Export Options

### DOCX (Word)
- Page breaks before chapters
- Table of contents
- KDP-ready formatting

### EPUB (E-book)
- Chapter navigation
- Reflowable layout
- Works better with KDP previewer

### Future: PDF, Markdown, Plain text

---

## Contributing

This is a personal project, but feel free to fork and adapt!

---

## License

MIT

---

## Credits

Built by Elliott English with Clawdot (Claude Opus 4.5)

**Inspiration:**
- Obsidian (note-taking)
- Notion (blocks and databases)
- Roam Research (bidirectional links)

---

*Your knowledge, organized. Your books, published.*
