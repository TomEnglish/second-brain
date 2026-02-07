"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import DocumentViewer from "@/components/DocumentViewer";
import DocumentEditor from "@/components/DocumentEditor";
import QuickCapture from "@/components/QuickCapture";
import GraphView from "@/components/GraphView";
import DailyNotesBar from "@/components/DailyNotesBar";
import CommandPalette from "@/components/CommandPalette";
import TemplatePicker from "@/components/TemplatePicker";
import BookManager from "@/components/BookManager";

interface Document {
  slug: string;
  title: string;
  category: string;
  date?: string;
  content: string;
  tags?: string[];
}

type ViewMode = "document" | "graph";

export default function Home() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCapture, setShowCapture] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("document");
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showBookManager, setShowBookManager] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      setDocuments(data);
      return data;
    } catch (err) {
      console.error("Failed to fetch documents:", err);
      return [];
    }
  }, []);

  useEffect(() => {
    fetchDocuments().then((data) => {
      if (data.length > 0 && !selectedDoc) {
        setSelectedDoc(data[0]);
      }
    });
  }, [fetchDocuments]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for command palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      // Cmd/Ctrl + N for new document
      if ((e.metaKey || e.ctrlKey) && e.key === "n" && !e.shiftKey) {
        e.preventDefault();
        setShowCapture(true);
      }
      // Cmd/Ctrl + Shift + N for new from template
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "N") {
        e.preventDefault();
        setShowTemplatePicker(true);
      }
      // Cmd/Ctrl + T for templates (alternative)
      if ((e.metaKey || e.ctrlKey) && e.key === "t") {
        e.preventDefault();
        setShowTemplatePicker(true);
      }
      // Cmd/Ctrl + E for edit
      if ((e.metaKey || e.ctrlKey) && e.key === "e" && selectedDoc && !isEditing) {
        e.preventDefault();
        setIsEditing(true);
      }
      // Cmd/Ctrl + G for graph view toggle
      if ((e.metaKey || e.ctrlKey) && e.key === "g") {
        e.preventDefault();
        setViewMode(v => v === "graph" ? "document" : "graph");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedDoc, isEditing]);

  const handleDocumentCreated = async () => {
    const docs = await fetchDocuments();
    // Select the newest document (first in journals, or first overall)
    if (docs.length > 0) {
      const journals = docs.filter((d: Document) => d.category === "journals");
      const newest = journals.length > 0 
        ? journals.sort((a: Document, b: Document) => (b.date || "").localeCompare(a.date || ""))[0]
        : docs[0];
      setSelectedDoc(newest);
    }
  };

  const handleSaveDocument = async (content: string) => {
    if (!selectedDoc) return;

    const response = await fetch("/api/documents", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: selectedDoc.slug,
        content,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to save document");
    }

    // Refresh documents and update selected
    const docs = await fetchDocuments();
    const updated = docs.find((d: Document) => d.slug === selectedDoc.slug);
    if (updated) {
      setSelectedDoc(updated);
    }
    setIsEditing(false);
  };

  const handleDeleteDocument = async () => {
    if (!selectedDoc) return;

    const response = await fetch(`/api/documents?slug=${encodeURIComponent(selectedDoc.slug)}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete document");
    }

    // Refresh and select another document
    const docs = await fetchDocuments();
    setSelectedDoc(docs.length > 0 ? docs[0] : null);
  };

  // Navigate to a document by slug (for wiki links and graph)
  const handleNavigate = useCallback((slug: string) => {
    const doc = documents.find(d => d.slug === slug);
    if (doc) {
      setSelectedDoc(doc);
      setViewMode("document"); // Switch to document view when navigating
      // Scroll to top when navigating
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [documents]);

  // Go to today's daily note (create if it doesn't exist)
  const handleGoToToday = useCallback(async () => {
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0]; // YYYY-MM-DD
    const slug = `journals/${dateStr}`;
    
    // Check if it already exists
    const existing = documents.find(d => d.slug === slug);
    if (existing) {
      setSelectedDoc(existing);
      setViewMode("document");
      return;
    }
    
    // Create today's note via API
    try {
      const response = await fetch("/api/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateStr }),
      });
      
      if (response.ok) {
        const docs = await fetchDocuments();
        const newDoc = docs.find((d: Document) => d.slug === slug);
        if (newDoc) {
          setSelectedDoc(newDoc);
          setViewMode("document");
        }
      }
    } catch (err) {
      console.error("Failed to create today's note:", err);
    }
  }, [documents, fetchDocuments]);

  // Toggle graph view
  const handleToggleGraph = useCallback(() => {
    setViewMode(v => v === "graph" ? "document" : "graph");
  }, []);

  // Handle template selection - create document from template
  const handleTemplateSelect = useCallback(async (templateData: { title: string; content: string; category: string }) => {
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: templateData.title,
          content: templateData.content,
          category: templateData.category,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create document from template");
      }

      // Refresh documents and select the new one
      const docs = await fetchDocuments();
      const newDoc = docs.find((d: Document) => d.title === templateData.title);
      if (newDoc) {
        setSelectedDoc(newDoc);
        setViewMode("document");
        // Start editing immediately so user can customize
        setIsEditing(true);
      }
    } catch (err) {
      console.error("Failed to create document from template:", err);
    }
  }, [fetchDocuments]);

  // Show templates
  const handleShowTemplates = useCallback(() => {
    setShowTemplatePicker(true);
  }, []);

  const filteredDocs = documents.filter((doc) => {
    // Text search filter
    const matchesSearch = searchQuery === "" ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Tag filter
    const matchesTag = selectedTag === null || doc.tags?.includes(selectedTag);
    
    return matchesSearch && matchesTag;
  });

  const groupedDocs = filteredDocs.reduce((acc, doc) => {
    if (!acc[doc.category]) {
      acc[doc.category] = [];
    }
    acc[doc.category].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <Sidebar
        groupedDocs={groupedDocs}
        selectedDoc={selectedDoc}
        onSelectDoc={(doc) => {
          setSelectedDoc(doc);
          // If it's a book, open the book manager
          if (doc.category === "books" && doc.title.toLowerCase().includes("bible")) {
            setShowBookManager(true);
          }
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNewDocument={() => setShowCapture(true)}
        onOpenCommandPalette={() => setShowCommandPalette(true)}
        selectedTag={selectedTag}
        onSelectTag={setSelectedTag}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar with daily notes and view toggle */}
        <div className="flex items-center justify-between border-b border-gray-800 bg-[#0d0d0d]">
          {/* Daily Notes Bar */}
          <DailyNotesBar
            documents={documents}
            selectedDoc={selectedDoc}
            onSelectDoc={setSelectedDoc}
            onDocumentCreated={fetchDocuments}
          />
          
          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1 mr-4">
            <button
              onClick={() => setViewMode("document")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === "document"
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
              title="Document View (⌘G)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("graph")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === "graph"
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
              title="Graph View (⌘G)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </button>
          </div>
        </div>

        {/* Active tag filter banner */}
        {selectedTag && (
          <div className="px-4 py-2 bg-indigo-600/20 border-b border-indigo-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-indigo-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filtering by tag: <span className="font-medium">#{selectedTag}</span>
              <span className="text-indigo-400/70">
                ({filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''})
              </span>
            </div>
            <button
              onClick={() => setSelectedTag(null)}
              className="flex items-center gap-1 px-2 py-1 text-sm text-indigo-300 hover:text-white hover:bg-indigo-600/40 rounded transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear filter
            </button>
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 overflow-auto">
          {viewMode === "graph" ? (
          <GraphView 
            onSelectDocument={handleNavigate}
            selectedSlug={selectedDoc?.slug}
          />
        ) : selectedDoc ? (
          isEditing ? (
            <DocumentEditor
              document={selectedDoc}
              onSave={handleSaveDocument}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <DocumentViewer
              document={selectedDoc}
              documents={documents}
              onEdit={() => setIsEditing(true)}
              onDelete={handleDeleteDocument}
              onNavigate={handleNavigate}
              onTagClick={setSelectedTag}
            />
          )
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <h2 className="text-xl font-medium mb-2">Welcome to Second Brain</h2>
              <p>Select a document from the sidebar to view it</p>
              <button
                onClick={() => setShowCapture(true)}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
              >
                Create your first document
              </button>
            </div>
          </div>
        )}
        </div>
      </main>

      {/* Quick Capture Modal */}
      <QuickCapture
        isOpen={showCapture}
        onClose={() => setShowCapture(false)}
        onDocumentCreated={handleDocumentCreated}
      />

      {/* Command Palette */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        documents={documents}
        selectedDoc={selectedDoc}
        onSelectDoc={(doc) => {
          setSelectedDoc(doc);
          setViewMode("document");
        }}
        onNewDocument={() => setShowCapture(true)}
        onToggleGraph={handleToggleGraph}
        onEditDocument={() => setIsEditing(true)}
        onGoToToday={handleGoToToday}
        onShowTemplates={handleShowTemplates}
      />

      {/* Template Picker */}
      <TemplatePicker
        isOpen={showTemplatePicker}
        onClose={() => setShowTemplatePicker(false)}
        onSelectTemplate={handleTemplateSelect}
      />
    </div>
  );
}
