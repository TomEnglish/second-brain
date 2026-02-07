"use client";

import { useState, useEffect, useRef } from "react";

interface TemplateVariable {
  name: string;
  label: string;
  placeholder?: string;
}

interface Template {
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  variables: TemplateVariable[];
}

interface TemplatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: { title: string; content: string; category: string }) => void;
}

export default function TemplatePicker({
  isOpen,
  onClose,
  onSelectTemplate,
}: TemplatePickerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Fetch templates
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetch("/api/templates")
        .then((res) => res.json())
        .then((data) => {
          setTemplates(data);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Failed to fetch templates:", err);
          setIsLoading(false);
        });
      
      // Focus search when opening
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setSelectedTemplate(null);
      setVariables({});
      setSearchQuery("");
    }
  }, [isOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === "Escape") {
        if (selectedTemplate) {
          setSelectedTemplate(null);
          setVariables({});
        } else {
          onClose();
        }
      }
      
      // Cmd/Ctrl + Enter to apply
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && selectedTemplate) {
        handleApplyTemplate();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedTemplate, variables]);

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    // Initialize variables with empty values
    const initialVars: Record<string, string> = {};
    template.variables.forEach((v) => {
      initialVars[v.name] = "";
    });
    setVariables(initialVars);
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) return;

    setIsApplying(true);
    try {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: selectedTemplate.slug,
          variables,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to apply template");
      }

      const result = await response.json();
      onSelectTemplate(result);
      onClose();
    } catch (err) {
      console.error("Failed to apply template:", err);
    } finally {
      setIsApplying(false);
    }
  };

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group templates by category
  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    const category = template.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(template);
    return acc;
  }, {} as Record<string, Template[]>);

  const categoryLabels: Record<string, string> = {
    journals: "📓 Journals",
    concepts: "💡 Concepts",
    projects: "🚀 Projects",
    research: "🔬 Research",
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-[#1a1a1a] border border-gray-700 rounded-xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>📋</span>
            {selectedTemplate ? (
              <>
                <button
                  onClick={() => {
                    setSelectedTemplate(null);
                    setVariables({});
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  Templates
                </button>
                <span className="text-gray-600">/</span>
                <span>{selectedTemplate.icon} {selectedTemplate.name}</span>
              </>
            ) : (
              "Choose a Template"
            )}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
            </div>
          ) : selectedTemplate ? (
            // Variable Input Form
            <div className="space-y-4">
              <p className="text-gray-400 text-sm">{selectedTemplate.description}</p>
              
              {selectedTemplate.variables.length > 0 ? (
                <div className="space-y-4 mt-4">
                  <h3 className="text-sm font-medium text-gray-300">Fill in the details:</h3>
                  {selectedTemplate.variables.map((variable) => (
                    <div key={variable.name}>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        {variable.label}
                      </label>
                      <input
                        type="text"
                        value={variables[variable.name] || ""}
                        onChange={(e) =>
                          setVariables((prev) => ({
                            ...prev,
                            [variable.name]: e.target.value,
                          }))
                        }
                        placeholder={variable.placeholder}
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                        autoFocus={selectedTemplate.variables.indexOf(variable) === 0}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm italic">
                  This template has no custom fields. Click "Use Template" to create the document.
                </p>
              )}

              {/* Preview hint */}
              <div className="mt-6 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                <p className="text-xs text-gray-500">
                  📝 The template will automatically include today's date and time. 
                  You can edit everything after creating the document.
                </p>
              </div>
            </div>
          ) : (
            // Template List
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search templates..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Template Grid */}
              {Object.keys(groupedTemplates).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No templates found</p>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="mt-2 text-sm text-indigo-400 hover:text-indigo-300"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              ) : (
                Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                  <div key={category}>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">
                      {categoryLabels[category] || category}
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {categoryTemplates.map((template) => (
                        <button
                          key={template.slug}
                          onClick={() => handleSelectTemplate(template)}
                          className="text-left p-3 rounded-lg border border-gray-700 hover:border-indigo-500 hover:bg-indigo-500/10 transition-all group"
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{template.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-white group-hover:text-indigo-300 transition-colors">
                                {template.name}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {template.description}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedTemplate && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800 bg-gray-900/50">
            <span className="text-xs text-gray-500">
              Press <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">⌘</kbd> + <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">Enter</kbd> to create
            </span>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedTemplate(null);
                  setVariables({});
                }}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleApplyTemplate}
                disabled={isApplying}
                className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isApplying ? "Creating..." : "Use Template"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
