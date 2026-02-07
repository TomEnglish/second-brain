"use client";

import { useState, useEffect } from "react";

interface Book {
  slug: string;
  title: string;
  status: "intake" | "outlining" | "writing" | "production" | "published";
  chapters: string[];
  outlines: string[];
  researchNotes: string[];
}

interface BookManagerProps {
  selectedBook: any;
  onClose: () => void;
}

export default function BookManager({ selectedBook, onClose }: BookManagerProps) {
  const [activeTab, setActiveTab] = useState<"bible" | "outlines" | "chapters" | "export">("bible");
  const [bookData, setBookData] = useState<Book | null>(null);

  useEffect(() => {
    if (selectedBook) {
      loadBookData();
    }
  }, [selectedBook]);

  async function loadBookData() {
    try {
      const res = await fetch(`/api/books/${selectedBook.slug}`);
      const data = await res.json();
      setBookData(data);
    } catch (err) {
      console.error("Failed to load book data:", err);
    }
  }

  const statusColors = {
    intake: "bg-blue-500/20 text-blue-300",
    outlining: "bg-yellow-500/20 text-yellow-300",
    writing: "bg-purple-500/20 text-purple-300",
    production: "bg-orange-500/20 text-orange-300",
    published: "bg-green-500/20 text-green-300",
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] border border-gray-700 rounded-lg w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-white">{selectedBook?.title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {bookData && (
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs ${statusColors[bookData.status]}`}>
                {bookData.status}
              </span>
              <span className="text-sm text-gray-400">
                {bookData.chapters.length} chapters · {bookData.outlines.length} outlines
              </span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700">
          <nav className="flex px-6">
            <button
              onClick={() => setActiveTab("bible")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "bible"
                  ? "border-indigo-500 text-indigo-300"
                  : "border-transparent text-gray-400 hover:text-gray-300"
              }`}
            >
              📖 Book Bible
            </button>
            <button
              onClick={() => setActiveTab("outlines")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "outlines"
                  ? "border-indigo-500 text-indigo-300"
                  : "border-transparent text-gray-400 hover:text-gray-300"
              }`}
            >
              📝 Outlines
            </button>
            <button
              onClick={() => setActiveTab("chapters")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "chapters"
                  ? "border-indigo-500 text-indigo-300"
                  : "border-transparent text-gray-400 hover:text-gray-300"
              }`}
            >
              📄 Chapters
            </button>
            <button
              onClick={() => setActiveTab("export")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "export"
                  ? "border-indigo-500 text-indigo-300"
                  : "border-transparent text-gray-400 hover:text-gray-300"
              }`}
            >
              📦 Export
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === "bible" && <BibleTab book={bookData} />}
          {activeTab === "outlines" && <OutlinesTab book={bookData} />}
          {activeTab === "chapters" && <ChaptersTab book={bookData} />}
          {activeTab === "export" && <ExportTab book={bookData} />}
        </div>
      </div>
    </div>
  );
}

function BibleTab({ book }: { book: Book | null }) {
  if (!book) return <div className="text-gray-400">Loading...</div>;
  
  return (
    <div className="prose prose-invert max-w-none">
      <p className="text-gray-400">
        The Book Bible is the master reference document for this book project.
      </p>
      <div className="mt-4 p-4 bg-gray-900 rounded-lg border border-gray-700">
        <p className="text-sm text-gray-400">
          Edit the Book Bible by opening: <code className="text-indigo-300">books/{book.slug}/BOOK_BIBLE.md</code>
        </p>
      </div>
    </div>
  );
}

function OutlinesTab({ book }: { book: Book | null }) {
  if (!book) return <div className="text-gray-400">Loading...</div>;
  
  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">Outline Versions</h3>
        <p className="text-sm text-gray-400 mb-4">
          Track your outline iterations from high-level to detailed chapter outlines.
        </p>
      </div>

      {book.outlines.length === 0 ? (
        <div className="text-center py-12 bg-gray-900 rounded-lg border border-gray-700">
          <p className="text-gray-400">No outlines yet. Create your first outline!</p>
          <button className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600">
            Create High-Level Outline
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {book.outlines.map((outline, index) => (
            <div
              key={index}
              className="p-4 bg-gray-900 rounded-lg border border-gray-700 hover:border-indigo-500/50 transition-colors cursor-pointer"
            >
              <h4 className="font-medium text-white">{outline}</h4>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChaptersTab({ book }: { book: Book | null }) {
  if (!book) return <div className="text-gray-400">Loading...</div>;
  
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Chapters</h3>
          <p className="text-sm text-gray-400">
            Draft, edit, and organize your book chapters.
          </p>
        </div>
        <button className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600">
          + New Chapter
        </button>
      </div>

      {book.chapters.length === 0 ? (
        <div className="text-center py-12 bg-gray-900 rounded-lg border border-gray-700">
          <p className="text-gray-400">No chapters yet. Start writing!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {book.chapters.map((chapter, index) => (
            <div
              key={index}
              className="flex items-center gap-4 p-4 bg-gray-900 rounded-lg border border-gray-700 hover:border-indigo-500/50 transition-colors cursor-pointer"
            >
              <div className="flex-shrink-0 w-8 h-8 bg-indigo-500/20 rounded flex items-center justify-center text-indigo-300 font-semibold">
                {index + 1}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-white">{chapter}</h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded">
                  Draft
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ExportTab({ book }: { book: Book | null }) {
  if (!book) return <div className="text-gray-400">Loading...</div>;
  
  const [exporting, setExporting] = useState(false);

  async function exportToKDP(format: "docx" | "epub") {
    if (!book) return;
    
    setExporting(true);
    try {
      const res = await fetch(`/api/books/${book.slug}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${book.slug}.${format}`;
        a.click();
      }
    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed. Check console for details.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">Export for KDP</h3>
        <p className="text-sm text-gray-400 mb-4">
          Generate publication-ready files for Kindle Direct Publishing.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* DOCX Export */}
        <div className="p-6 bg-gray-900 rounded-lg border border-gray-700">
          <h4 className="text-lg font-semibold text-white mb-2">📄 DOCX</h4>
          <p className="text-sm text-gray-400 mb-4">
            Microsoft Word format with page breaks, TOC, and proper formatting for KDP upload.
          </p>
          <ul className="text-sm text-gray-400 mb-4 space-y-1">
            <li>✓ Page breaks before chapters</li>
            <li>✓ Table of Contents</li>
            <li>✓ Front and back matter</li>
          </ul>
          <button
            onClick={() => exportToKDP("docx")}
            disabled={exporting || book.chapters.length === 0}
            className="w-full px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? "Exporting..." : "Export DOCX"}
          </button>
        </div>

        {/* EPUB Export */}
        <div className="p-6 bg-gray-900 rounded-lg border border-gray-700">
          <h4 className="text-lg font-semibold text-white mb-2">📚 EPUB</h4>
          <p className="text-sm text-gray-400 mb-4">
            E-book format with chapter splits and navigation. Often works better with KDP previewer.
          </p>
          <ul className="text-sm text-gray-400 mb-4 space-y-1">
            <li>✓ Auto chapter splits</li>
            <li>✓ Navigation TOC</li>
            <li>✓ Better KDP compatibility</li>
          </ul>
          <button
            onClick={() => exportToKDP("epub")}
            disabled={exporting || book.chapters.length === 0}
            className="w-full px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? "Exporting..." : "Export EPUB"}
          </button>
        </div>
      </div>

      {book.chapters.length === 0 && (
        <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-sm text-yellow-300">
            ⚠️ No chapters found. Write some chapters before exporting.
          </p>
        </div>
      )}

      {/* Export preview */}
      <div className="mt-8 p-6 bg-gray-900 rounded-lg border border-gray-700">
        <h4 className="text-lg font-semibold text-white mb-4">📋 Export Checklist</h4>
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2 text-gray-300">
            <input type="checkbox" className="rounded" />
            All chapters use H1 headings
          </label>
          <label className="flex items-center gap-2 text-gray-300">
            <input type="checkbox" className="rounded" />
            Citations present and formatted
          </label>
          <label className="flex items-center gap-2 text-gray-300">
            <input type="checkbox" className="rounded" />
            About the Author section exists
          </label>
          <label className="flex items-center gap-2 text-gray-300">
            <input type="checkbox" className="rounded" />
            Disclaimers in place
          </label>
          <label className="flex items-center gap-2 text-gray-300">
            <input type="checkbox" className="rounded" />
            Front matter complete
          </label>
        </div>
      </div>
    </div>
  );
}
