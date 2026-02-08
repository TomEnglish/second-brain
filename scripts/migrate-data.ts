/**
 * Migration script to seed Supabase with initial data
 * Run with: npx ts-node scripts/migrate-data.ts
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Hardcoded user ID for now (replace with actual auth user)
const USER_ID = '00000000-0000-0000-0000-000000000000';

async function migrateDocuments() {
  console.log('📄 Migrating documents...');
  
  const brainDir = path.join(__dirname, '..', '..', 'brain');
  const categories = ['journals', 'concepts', 'projects', 'research'];
  
  for (const category of categories) {
    const categoryDir = path.join(brainDir, category);
    
    if (!fs.existsSync(categoryDir)) {
      console.log(`  ⚠️  Skipping ${category} (directory not found)`);
      continue;
    }
    
    const files = fs.readdirSync(categoryDir).filter(f => f.endsWith('.md'));
    
    for (const file of files) {
      const filePath = path.join(categoryDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const { data: frontmatter, content: body } = matter(content);
      
      const slug = `${category}/${file.replace('.md', '')}`;
      const title = frontmatter.title || file.replace('.md', '').replace(/-/g, ' ');
      const tags = frontmatter.tags || [];
      
      const { error } = await supabase
        .from('documents')
        .upsert({
          user_id: USER_ID,
          slug,
          title,
          category,
          content,
          tags,
        }, {
          onConflict: 'user_id,slug'
        });
      
      if (error) {
        console.error(`  ❌ Error migrating ${slug}:`, error.message);
      } else {
        console.log(`  ✅ Migrated ${slug}`);
      }
    }
  }
}

async function migrateBooks() {
  console.log('\n📚 Migrating books...');
  
  const booksDir = path.join(__dirname, '..', '..', 'brain', 'books');
  
  if (!fs.existsSync(booksDir)) {
    console.log('  ⚠️  No books directory found');
    return;
  }
  
  const bookFolders = fs.readdirSync(booksDir).filter(f => {
    const stat = fs.statSync(path.join(booksDir, f));
    return stat.isDirectory();
  });
  
  for (const bookFolder of bookFolders) {
    const bookDir = path.join(booksDir, bookFolder);
    const bibleFile = path.join(bookDir, 'BOOK_BIBLE.md');
    
    if (!fs.existsSync(bibleFile)) {
      console.log(`  ⚠️  Skipping ${bookFolder} (no BOOK_BIBLE.md)`);
      continue;
    }
    
    // Read Book Bible
    const bibleContent = fs.readFileSync(bibleFile, 'utf-8');
    const { data: bibleMatter } = matter(bibleContent);
    const title = bibleMatter.title || bookFolder.replace(/-/g, ' ');
    
    // Insert book
    const { data: book, error: bookError } = await supabase
      .from('books')
      .upsert({
        user_id: USER_ID,
        slug: bookFolder,
        title,
        status: 'intake',
        bible_content: bibleContent,
      }, {
        onConflict: 'user_id,slug'
      })
      .select()
      .single();
    
    if (bookError) {
      console.error(`  ❌ Error migrating book ${bookFolder}:`, bookError.message);
      continue;
    }
    
    console.log(`  ✅ Migrated book: ${title}`);
    
    // Migrate chapters
    const chaptersDir = path.join(bookDir, 'chapters');
    if (fs.existsSync(chaptersDir)) {
      const chapterFiles = fs.readdirSync(chaptersDir)
        .filter(f => f.endsWith('.md'))
        .sort();
      
      for (let i = 0; i < chapterFiles.length; i++) {
        const chapterFile = chapterFiles[i];
        const chapterPath = path.join(chaptersDir, chapterFile);
        const chapterContent = fs.readFileSync(chapterPath, 'utf-8');
        const { data: chapterMatter } = matter(chapterContent);
        const chapterTitle = chapterMatter.title || chapterFile.replace('.md', '');
        
        const { error } = await supabase
          .from('chapters')
          .upsert({
            book_id: book.id,
            order_num: i + 1,
            title: chapterTitle,
            content: chapterContent,
            status: 'draft',
          }, {
            onConflict: 'book_id,order_num'
          });
        
        if (error) {
          console.error(`    ❌ Error migrating chapter ${chapterTitle}:`, error.message);
        } else {
          console.log(`    ✅ Migrated chapter: ${chapterTitle}`);
        }
      }
    }
    
    // Migrate outlines
    const outlinesDir = path.join(bookDir, 'outlines');
    if (fs.existsSync(outlinesDir)) {
      const outlineFiles = fs.readdirSync(outlinesDir)
        .filter(f => f.endsWith('.md'))
        .sort();
      
      for (const outlineFile of outlineFiles) {
        const outlinePath = path.join(outlinesDir, outlineFile);
        const outlineContent = fs.readFileSync(outlinePath, 'utf-8');
        const version = outlineFile.replace('.md', '');
        
        const { error } = await supabase
          .from('outlines')
          .upsert({
            book_id: book.id,
            version,
            content: outlineContent,
          }, {
            onConflict: 'book_id,version'
          });
        
        if (error) {
          console.error(`    ❌ Error migrating outline ${version}:`, error.message);
        } else {
          console.log(`    ✅ Migrated outline: ${version}`);
        }
      }
    }
  }
}

async function migrateTemplates() {
  console.log('\n📋 Migrating templates...');
  
  const templatesDir = path.join(__dirname, '..', 'src', 'templates');
  
  if (!fs.existsSync(templatesDir)) {
    console.log('  ⚠️  No templates directory found');
    return;
  }
  
  const templateFiles = fs.readdirSync(templatesDir).filter(f => f.endsWith('.md'));
  
  for (const file of templateFiles) {
    const filePath = path.join(templatesDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data: frontmatter, content: body } = matter(content);
    
    const slug = file.replace('.md', '');
    const name = frontmatter.name || slug.replace(/-/g, ' ');
    const description = frontmatter.description || '';
    const icon = frontmatter.icon || '📄';
    const category = frontmatter.category || 'general';
    const variables = frontmatter.variables || [];
    
    const { error } = await supabase
      .from('templates')
      .upsert({
        user_id: USER_ID,
        slug,
        name,
        description,
        icon,
        category,
        variables,
        content: body.trim(),
      }, {
        onConflict: 'user_id,slug'
      });
    
    if (error) {
      console.error(`  ❌ Error migrating template ${slug}:`, error.message);
    } else {
      console.log(`  ✅ Migrated template: ${name}`);
    }
  }
}

async function main() {
  console.log('🚀 Starting migration to Supabase...\n');
  
  try {
    await migrateDocuments();
    await migrateBooks();
    await migrateTemplates();
    
    console.log('\n✅ Migration complete!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
