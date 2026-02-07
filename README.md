# Second Brain

A personal knowledge management system for Elliott, built with NextJS.

## Features

- 📓 **Journals** - Daily entries recording conversations and progress
- 💡 **Concepts** - Deep dives on important topics
- 🚀 **Projects** - Project documentation and status
- 🔬 **Research** - Research reports and findings

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- React Markdown

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Document Structure

Documents are read from `~/clawd/brain/`:

```
brain/
├── concepts/       # Deep dive documents
├── journals/       # Daily entries (YYYY-MM-DD.md)
├── projects/       # Project-specific docs
└── research/       # Research compilations
```

## Document Format

Documents are Markdown files with optional YAML frontmatter:

```markdown
---
title: Document Title
date: 2026-01-29
---

# Document Title

Content goes here...
```

If no frontmatter, the title is extracted from the first H1 heading.

## Styling

The app is styled to feel like a mix of:
- **Obsidian** - Dark theme, clean markdown rendering
- **Linear** - Minimal sidebar, modern UI

---

*Built by Clawdot for Elliott*
