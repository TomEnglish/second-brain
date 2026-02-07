import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const BRAIN_DIR = process.env.BRAIN_DIR || path.join(process.cwd(), "..", "brain");
const JOURNALS_DIR = path.join(BRAIN_DIR, "journals");

// Ensure journals directory exists
if (!fs.existsSync(JOURNALS_DIR)) {
  fs.mkdirSync(JOURNALS_DIR, { recursive: true });
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

function getFormattedDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getDayOfWeek(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

function getWeekNumber(dateStr: string): number {
  const date = new Date(dateStr + "T12:00:00");
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

function generateDailyTemplate(dateStr: string): string {
  const formattedDate = getFormattedDate(dateStr);
  const dayOfWeek = getDayOfWeek(dateStr);
  const weekNum = getWeekNumber(dateStr);
  const isWeekend = ["Saturday", "Sunday"].includes(dayOfWeek);
  
  const emoji = isWeekend ? "🌅" : "📝";
  
  return `---
title: "${formattedDate}"
date: ${dateStr}
type: daily-note
week: ${weekNum}
---

# ${emoji} ${formattedDate}

## Morning Intentions
*What do I want to accomplish today?*

- 

## Notes & Thoughts
*Capture ideas, observations, and reflections*



## Tasks
- [ ] 

## Evening Reflection
*How did the day go? What did I learn?*



---

*Links: [[${getPreviousDate(dateStr)}|← Yesterday]] | [[${getNextDate(dateStr)}|Tomorrow →]]*
`;
}

function getPreviousDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  date.setDate(date.getDate() - 1);
  return date.toISOString().split("T")[0];
}

function getNextDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0];
}

// GET: Check if a daily note exists
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || getTodayDate();
    
    const filePath = path.join(JOURNALS_DIR, `${date}.md`);
    const exists = fs.existsSync(filePath);
    
    if (exists) {
      const content = fs.readFileSync(filePath, "utf-8");
      return NextResponse.json({
        exists: true,
        date,
        slug: `journals/${date}`,
        content,
      });
    }
    
    return NextResponse.json({
      exists: false,
      date,
      slug: `journals/${date}`,
    });
  } catch (error) {
    console.error("Error checking daily note:", error);
    return NextResponse.json(
      { error: "Failed to check daily note" },
      { status: 500 }
    );
  }
}

// POST: Create a daily note
export async function POST(request: NextRequest) {
  try {
    let date = getTodayDate();
    
    // Check if a specific date was provided
    try {
      const body = await request.json();
      if (body.date) {
        // Validate date format
        if (/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
          date = body.date;
        }
      }
    } catch {
      // No body or invalid JSON, use today's date
    }
    
    const filePath = path.join(JOURNALS_DIR, `${date}.md`);
    
    // If file exists, just return success (don't overwrite)
    if (fs.existsSync(filePath)) {
      return NextResponse.json({
        success: true,
        created: false,
        date,
        slug: `journals/${date}`,
        message: "Daily note already exists",
      });
    }
    
    // Create new daily note with template
    const content = generateDailyTemplate(date);
    fs.writeFileSync(filePath, content, "utf-8");
    
    return NextResponse.json({
      success: true,
      created: true,
      date,
      slug: `journals/${date}`,
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating daily note:", error);
    return NextResponse.json(
      { error: "Failed to create daily note" },
      { status: 500 }
    );
  }
}
