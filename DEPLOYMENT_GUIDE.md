# Deployment Guide: Second Brain to Vercel + Supabase

**Built:** February 8, 2026 (overnight)  
**For:** Elliott English

---

## 🎯 What Was Built

A fully cloud-based version of Second Brain:
- ✅ All data in Supabase (PostgreSQL cloud database)
- ✅ Deployed to Vercel (accessible from anywhere)
- ✅ User authentication (sign up/sign in)
- ✅ Migration script for your existing Apex Predators book
- ✅ Row Level Security (your data is private)
- ✅ Full API refactor (no more filesystem dependencies)

---

## 🚀 Quick Deployment (30 minutes)

### Step 1: Create Supabase Project (5 min)

1. Go to https://supabase.com
2. Click "New Project"
3. Name: `second-brain`
4. Database password: (generate strong one)
5. Region: (closest to you - US East)
6. Click "Create new project"
7. Wait ~2 minutes for provisioning

**Save these values:**
- Project URL: `https://xxxxx.supabase.co`
- Anon key: `eyJhbGciOiJI...`
- Service role key: `eyJhbGciOiJI...` (different from anon)

Find them in: Settings → API

### Step 2: Set Up Database (5 min)

1. In Supabase, go to "SQL Editor"
2. Click "New query"
3. Copy entire contents of `~/clawd/second-brain/supabase/schema.sql`
4. Paste into SQL editor
5. Click "Run"
6. Should see: "Success. No rows returned"

This creates all tables, indexes, and security policies.

### Step 3: Configure Environment (2 min)

On your local machine:

```bash
cd ~/clawd/second-brain

# Create .env.local file
cat > .env.local <<EOF
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR-SERVICE-ROLE-KEY
EOF

# Replace YOUR-PROJECT, YOUR-ANON-KEY, YOUR-SERVICE-ROLE-KEY with actual values
```

### Step 4: Migrate Your Data (5 min)

```bash
# Install dependencies if not already
cd ~/clawd/second-brain
npm install

# Run migration script
npm run migrate
```

This imports:
- Apex Predators book from `~/clawd/brain/books/apex-predators/`
- Book Bible template
- Any other documents in brain/

You'll see output like:
```
📄 Migrating documents...
📚 Migrating books...
  ✅ Migrated book: Apex Predators
📋 Migrating templates...
  ✅ Migrated template: Book Bible
✅ Migration complete!
```

### Step 5: Test Locally (3 min)

```bash
npm run dev
```

Open http://localhost:3000

1. Go to `/login`
2. Click "Sign Up"
3. Email: your-email@example.com
4. Password: (choose secure password)
5. Check email for confirmation link
6. Click confirmation link
7. Sign in
8. Should see your documents!

### Step 6: Deploy to Vercel (10 min)

#### Option A: GitHub → Vercel (Recommended)

```bash
# Push to GitHub (if not already)
cd ~/clawd/second-brain
git push origin main
```

Then:
1. Go to https://vercel.com
2. Click "New Project"
3. Import from GitHub: `second-brain`
4. Framework: Next.js (auto-detected)
5. Click "Environment Variables"
6. Add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon key
   - `SUPABASE_SERVICE_ROLE_KEY` = your service role key
7. Click "Deploy"
8. Wait ~2 minutes
9. Done! App live at `https://second-brain-xxx.vercel.app`

#### Option B: Vercel CLI

```bash
# Login to Vercel
vercel login

# Deploy
cd ~/clawd/second-brain
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: second-brain
# - Directory: ./
# - Override settings? No

# Add environment variables in dashboard
# Then deploy to production:
vercel --prod
```

---

## 🔒 Security Notes

### Row Level Security (RLS)

Every table has RLS policies:
- Users can only see/edit their own data
- Books, chapters, outlines belong to book owner
- Service role key bypasses RLS (used by API)

### Authentication

- Email/password authentication via Supabase
- Email confirmation required
- Password reset available
- No public access (must be logged in)

---

## 📊 What Changed from Local Version

### Before (Filesystem)
```
~/clawd/brain/
├── journals/
├── concepts/
├── books/
└── templates/
```

Data stored locally, one user, filesystem operations.

### After (Supabase)
```
Supabase Database:
├── documents (table)
├── books (table)
├── chapters (table)
├── outlines (table)
├── research_notes (table)
└── templates (table)
```

Data in cloud, multi-user support, SQL queries.

### API Changes

All routes refactored:
- `GET /api/documents` → Supabase query instead of fs.readdir
- `POST /api/documents` → Supabase insert instead of fs.writeFile
- `PUT /api/documents` → Supabase update
- `DELETE /api/documents` → Supabase delete

Same interface, different backend.

---

## 🧪 Testing Checklist

After deployment, test:

- [ ] Sign up with email
- [ ] Confirm email
- [ ] Sign in
- [ ] See Apex Predators book (if migrated)
- [ ] Create new document (⌘N)
- [ ] Edit document (⌘E)
- [ ] Add wiki link `[[test]]`
- [ ] View backlinks
- [ ] View graph (⌘G)
- [ ] Add tags `#test`
- [ ] Filter by tag
- [ ] Create from template (⌘T → Book Bible)
- [ ] Open book manager (click Book Bible doc)
- [ ] Export book (if chapters exist)
- [ ] Command palette (⌘K)
- [ ] Search documents
- [ ] Create daily note

---

## 🐛 Troubleshooting

### "Failed to fetch documents"
- Check `.env.local` has correct Supabase URL and keys
- Verify database schema was run successfully
- Check Supabase logs (Dashboard → Logs)

### "No rows returned" when querying
- Run migration script: `npm run migrate`
- Check RLS policies in Supabase (Database → Policies)
- Verify you're signed in

### Export not working
- Ensure pandoc is installed: `pandoc --version`
- Check chapters exist in database
- Check Vercel logs for errors

### Can't sign in
- Verify email is confirmed
- Check Supabase Auth logs (Authentication → Users)
- Try password reset

---

## 📈 Next Steps (Optional)

### Add More Features
- Real-time collaboration (Supabase Realtime)
- Image uploads (Supabase Storage)
- Advanced search (Full-text search already included)
- Mobile app (React Native + Supabase)

### Optimize
- Add caching layer (Redis)
- Optimize queries (indexes already included)
- Add analytics (Vercel Analytics)

### Scale
- Upgrade Supabase plan (if needed)
- Add CDN for assets
- Implement rate limiting

---

## 💰 Costs

**Free tier limits:**
- **Supabase:** 500MB database, 1GB file storage, 2GB bandwidth/month
- **Vercel:** 100GB bandwidth, unlimited deployments

**Your usage:**
- Text documents = tiny (KB each)
- Books = small (MB total)
- Well within free tier

**When to upgrade:**
- 1000+ documents
- Heavy image usage
- Multiple collaborators

---

## 🔑 Environment Variables Reference

### NEXT_PUBLIC_SUPABASE_URL
- **Type:** Public
- **Where:** Supabase Dashboard → Settings → API → Project URL
- **Example:** `https://abcdefgh.supabase.co`

### NEXT_PUBLIC_SUPABASE_ANON_KEY
- **Type:** Public (safe to expose to browser)
- **Where:** Supabase Dashboard → Settings → API → Project API keys → anon public
- **Used for:** Client-side queries with RLS

### SUPABASE_SERVICE_ROLE_KEY
- **Type:** Secret (never expose)
- **Where:** Supabase Dashboard → Settings → API → Project API keys → service_role secret
- **Used for:** Server-side operations that bypass RLS

---

## 📞 Support

**Issues:**
- Check Supabase logs: Dashboard → Logs
- Check Vercel logs: Project → Deployments → View Function Logs
- Test API directly: `curl https://your-app.vercel.app/api/documents`

**Database:**
- Query in Supabase SQL Editor
- Check RLS policies: Database → Policies
- View auth users: Authentication → Users

---

## ✅ Success Criteria

You've successfully deployed when:

1. ✅ App is live at `your-second-brain.vercel.app`
2. ✅ Can sign up and sign in
3. ✅ Can create/edit documents
4. ✅ Apex Predators book is accessible
5. ✅ Book Bible template works
6. ✅ Export generates DOCX/EPUB
7. ✅ All keyboard shortcuts work
8. ✅ Graph view renders
9. ✅ Wiki links and backlinks work
10. ✅ Data persists across sessions

---

**🎉 You now have a fully cloud-based Second Brain accessible from anywhere!**

Wake up to: https://second-brain-xxx.vercel.app

---

*Built overnight by Clawdot 🌙*
*February 8, 2026*
