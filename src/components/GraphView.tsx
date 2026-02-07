"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";

// Dynamically import to avoid SSR issues
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-900">
      <div className="text-gray-400">Loading graph...</div>
    </div>
  ),
});

interface GraphNode {
  id: string;
  title: string;
  category: string;
  linkCount: number;
  size: number;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface GraphViewProps {
  onSelectDocument: (slug: string) => void;
  selectedSlug?: string;
}

// Category colors
const CATEGORY_COLORS: Record<string, string> = {
  journals: "#60a5fa", // blue
  concepts: "#a78bfa", // purple
  projects: "#34d399", // green
  research: "#fbbf24", // amber
};

export default function GraphView({ onSelectDocument, selectedSlug }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Fetch graph data
  useEffect(() => {
    fetch("/api/graph")
      .then((res) => res.json())
      .then((data) => setGraphData(data))
      .catch((err) => console.error("Failed to load graph:", err));
  }, []);

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Node click handler
  const handleNodeClick = useCallback(
    (node: any) => {
      if (node) onSelectDocument(node.id);
    },
    [onSelectDocument]
  );

  // Node hover handlers
  const handleNodeHover = useCallback((node: any) => {
    setHoveredNode(node as GraphNode | null);
    if (containerRef.current) {
      containerRef.current.style.cursor = node ? "pointer" : "grab";
    }
  }, []);

  // Custom node rendering
  const paintNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const n = node as GraphNode;
      const isSelected = n.id === selectedSlug;
      const isHovered = n.id === hoveredNode?.id;
      const size = n.size || 6;
      const color = CATEGORY_COLORS[n.category] || "#6b7280";

      // Draw node circle
      ctx.beginPath();
      ctx.arc(n.x || 0, n.y || 0, size, 0, 2 * Math.PI);
      
      // Fill with gradient
      const gradient = ctx.createRadialGradient(
        n.x || 0, n.y || 0, 0,
        n.x || 0, n.y || 0, size
      );
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, isSelected || isHovered ? color : adjustColor(color, -30));
      ctx.fillStyle = gradient;
      ctx.fill();

      // Highlight ring for selected/hovered
      if (isSelected || isHovered) {
        ctx.strokeStyle = isSelected ? "#fff" : "rgba(255,255,255,0.5)";
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.stroke();
      }

      // Draw label for hovered or selected nodes, or if zoomed in
      if ((isHovered || isSelected || globalScale > 1.5) && n.title) {
        const fontSize = Math.max(10, 12 / globalScale);
        ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        
        // Text background
        const textWidth = ctx.measureText(n.title).width;
        ctx.fillStyle = "rgba(17, 24, 39, 0.85)";
        ctx.fillRect(
          (n.x || 0) - textWidth / 2 - 4,
          (n.y || 0) + size + 4,
          textWidth + 8,
          fontSize + 4
        );
        
        // Text
        ctx.fillStyle = "#f9fafb";
        ctx.fillText(n.title, n.x || 0, (n.y || 0) + size + 6);
      }
    },
    [selectedSlug, hoveredNode]
  );

  // Custom link rendering
  const paintLink = useCallback(
    (link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const sourceNode = link.source as GraphNode;
      const targetNode = link.target as GraphNode;
      
      if (!sourceNode.x || !targetNode.x) return;

      const isConnected = 
        sourceNode.id === selectedSlug || 
        targetNode.id === selectedSlug ||
        sourceNode.id === hoveredNode?.id ||
        targetNode.id === hoveredNode?.id;

      ctx.beginPath();
      ctx.moveTo(sourceNode.x, sourceNode.y || 0);
      ctx.lineTo(targetNode.x, targetNode.y || 0);
      ctx.strokeStyle = isConnected ? "rgba(139, 92, 246, 0.6)" : "rgba(75, 85, 99, 0.3)";
      ctx.lineWidth = isConnected ? 1.5 : 0.5;
      ctx.stroke();
    },
    [selectedSlug, hoveredNode]
  );

  if (!graphData) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="text-gray-400">Loading knowledge graph...</div>
      </div>
    );
  }

  if (graphData.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="text-center text-gray-400">
          <p className="text-lg mb-2">No documents yet</p>
          <p className="text-sm">Create some documents with [[wiki links]] to see your knowledge graph</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-full bg-gray-900">
      {/* Legend */}
      <div className="absolute top-4 left-4 z-10 bg-gray-800/90 backdrop-blur rounded-lg p-3 text-sm">
        <div className="text-gray-300 font-medium mb-2">Categories</div>
        <div className="space-y-1">
          {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
            <div key={cat} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: color }}
              />
              <span className="text-gray-400 capitalize">{cat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="absolute top-4 right-4 z-10 bg-gray-800/90 backdrop-blur rounded-lg p-3 text-sm">
        <div className="text-gray-400">
          <span className="text-gray-200 font-medium">{graphData.nodes.length}</span> documents
        </div>
        <div className="text-gray-400">
          <span className="text-gray-200 font-medium">{graphData.links.length}</span> connections
        </div>
      </div>

      {/* Hovered node info */}
      {hoveredNode && (
        <div className="absolute bottom-4 left-4 z-10 bg-gray-800/90 backdrop-blur rounded-lg p-3 max-w-xs">
          <div className="text-gray-200 font-medium">{hoveredNode.title}</div>
          <div className="text-gray-400 text-sm capitalize">{hoveredNode.category}</div>
          <div className="text-gray-500 text-xs mt-1">
            {hoveredNode.linkCount} connection{hoveredNode.linkCount !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 right-4 z-10 text-gray-500 text-xs">
        Scroll to zoom • Drag to pan • Click node to view
      </div>

      {/* Graph */}
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        nodeCanvasObject={paintNode}
        linkCanvasObject={paintLink}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
          const n = node as GraphNode;
          ctx.beginPath();
          ctx.arc(n.x || 0, n.y || 0, (n.size || 6) + 4, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        }}
        cooldownTicks={100}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        linkDirectionalParticles={0}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        backgroundColor="#111827"
      />
    </div>
  );
}

// Helper to adjust color brightness
function adjustColor(color: string, amount: number): string {
  const hex = color.replace("#", "");
  const r = Math.max(0, Math.min(255, parseInt(hex.slice(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.slice(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.slice(4, 6), 16) + amount));
  return `rgb(${r}, ${g}, ${b})`;
}
