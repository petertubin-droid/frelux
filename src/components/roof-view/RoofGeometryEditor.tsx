/**
 * FRELUX ROOF GEOMETRY — Interactive SVG Editor
 *
 * An SVG-based editor where the user can:
 *   - Click to add boundary points (vertices)
 *   - Drag points to move them
 *   - Click a point to delete it
 *   - Switch between roof sections
 *   - Add/remove sections
 *   - Confirm the geometry
 *
 * AI-generated geometry (if available) can be loaded into the editor,
 * but it is NEVER treated as automatically correct — the user must confirm.
 *
 * Feature 3: Editable Roof Tracing
 */

import { useState, useRef, useCallback, useMemo } from "react";
import {
  Plus,
  Trash2,
  CheckCircle2,
  MousePointer2,
  Move,
  Eraser,
  Layers,
} from "lucide-react";
import type { RoofGeometry } from "@/lib/roof/geometry-types";
import {
  addVertex,
  moveVertex,
  deleteVertex,
  addSection,
  removeSection,
  renameSection,
  confirmGeometry,
  polygonArea,
  isValidSection,
} from "@/lib/roof/geometry-engine";
import { Button } from "@/components/ui/shadcn/button";

const SVG_WIDTH = 600;
const SVG_HEIGHT = 400;
const POINT_RADIUS = 6;
const HIT_RADIUS = 12;

type Tool = "add" | "move" | "delete";

interface RoofGeometryEditorProps {
  geometry: RoofGeometry;
  onChange: (geometry: RoofGeometry) => void;
  /** Optional background image (e.g. from Roof View) to trace over */
  backgroundImageUrl?: string;
  disabled?: boolean;
}

export function RoofGeometryEditor({
  geometry,
  onChange,
  backgroundImageUrl,
  disabled,
}: RoofGeometryEditorProps) {
  const [tool, setTool] = useState<Tool>("add");
  const [draggingPointId, setDraggingPointId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const activeSection = useMemo(
    () =>
      geometry.sections.find((s) => s.id === geometry.activeSectionId) ?? null,
    [geometry],
  );

  // ── Convert screen coordinates to SVG coordinates ──
  const getSvgCoords = useCallback(
    (e: React.MouseEvent): { x: number; y: number } => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      const scaleX = SVG_WIDTH / rect.width;
      const scaleY = SVG_HEIGHT / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    [],
  );

  // ── SVG click handler ──
  const handleSvgClick = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      if (!activeSection) return;
      if (tool !== "add") return;
      if (draggingPointId) return; // don't add when finishing a drag

      const { x, y } = getSvgCoords(e);
      onChange(addVertex(geometry, activeSection.id, { x, y }));
    },
    [
      disabled,
      activeSection,
      tool,
      draggingPointId,
      getSvgCoords,
      geometry,
      onChange,
    ],
  );

  // ── Point mouse down (start drag or delete) ──
  const handlePointMouseDown = useCallback(
    (e: React.MouseEvent, pointId: string) => {
      e.stopPropagation();
      if (disabled) return;

      if (tool === "delete") {
        if (!activeSection) return;
        onChange(deleteVertex(geometry, activeSection.id, pointId));
        return;
      }

      if (tool === "move") {
        setDraggingPointId(pointId);
      }
    },
    [disabled, tool, activeSection, geometry, onChange],
  );

  // ── SVG mouse move (dragging a point) ──
  const handleSvgMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggingPointId || !activeSection || disabled) return;
      const { x, y } = getSvgCoords(e);
      onChange(moveVertex(geometry, activeSection.id, draggingPointId, x, y));
    },
    [
      draggingPointId,
      activeSection,
      disabled,
      getSvgCoords,
      geometry,
      onChange,
    ],
  );

  // ── SVG mouse up (end drag) ──
  const handleSvgMouseUp = useCallback(() => {
    setDraggingPointId(null);
  }, []);

  // ── Add new section ──
  const handleAddSection = useCallback(() => {
    const name = `Section ${geometry.sections.length + 1}`;
    onChange(addSection(geometry, name));
  }, [geometry, onChange]);

  // ── Confirm geometry ──
  const handleConfirm = useCallback(() => {
    onChange(confirmGeometry(geometry));
  }, [geometry, onChange]);

  // ── Get polygon points string for SVG ──
  const getPointsString = (vertices: { x: number; y: number }[]): string => {
    return vertices.map((v) => `${v.x},${v.y}`).join(" ");
  };

  const hasValidSections = geometry.sections.some((s) => isValidSection(s));
  const allConfirmed = geometry.confirmed;

  return (
    <div className="space-y-4">
      {/* Section tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {geometry.sections.map((section, _i) => (
          <Button
            key={section.id}
            onClick={() =>
              onChange({ ...geometry, activeSectionId: section.id })
            }
            disabled={disabled}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              geometry.activeSectionId === section.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted"
            }`}
          >
            <Layers aria-hidden="true" className="w-3 h-3" />
            {section.name}
            {section.confirmed && (
              <CheckCircle2 aria-hidden="true" className="w-3 h-3 text-green-400" />
            )}
          </Button>
        ))}
        <Button
          onClick={handleAddSection}
          disabled={disabled}
          className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:border-border hover:text-muted-foreground disabled:opacity-50"
        >
          <Plus aria-hidden="true" className="w-3 h-3" />
          Add Section
        </Button>
      </div>

      {/* Active section name editor + remove */}
      {activeSection && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={activeSection.name}
            onChange={(e) =>
              onChange(
                renameSection(geometry, activeSection.id, e.target.value),
              )
            }
            disabled={disabled}
            className="flex-1 rounded-lg border border-border px-3 py-1.5 text-sm"
            placeholder="Section name"
          />
          {geometry.sections.length > 1 && (
            <Button
              onClick={() =>
                onChange(removeSection(geometry, activeSection.id))
              }
              disabled={disabled}
              className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50"
            >
              <Trash2 aria-hidden="true" className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      )}

      {/* Tool selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Tool:</span>
        {(
          [
            { id: "add", label: "Add Points", icon: MousePointer2 },
            { id: "move", label: "Move Points", icon: Move },
            { id: "delete", label: "Delete Points", icon: Eraser },
          ] as const
        ).map((t) => (
          <Button
            key={t.id}
            onClick={() => setTool(t.id)}
            disabled={disabled}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
              tool === t.id
                ? "bg-background text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </Button>
        ))}
      </div>

      {/* SVG Canvas */}
      <div className="relative rounded-xl border border-border overflow-hidden bg-muted/50">
        <svg
          ref={svgRef}
          width="100%"
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="block touch-none"
          style={{
            cursor: disabled
              ? "not-allowed"
              : tool === "add"
                ? "crosshair"
                : tool === "delete"
                  ? "pointer"
                  : "default",
          }}
          onClick={handleSvgClick}
          onMouseMove={handleSvgMouseMove}
          onMouseUp={handleSvgMouseUp}
          onMouseLeave={handleSvgMouseUp}
        >
          {/* Background image (for tracing) */}
          {backgroundImageUrl && (
            <image
              href={backgroundImageUrl}
              x={0}
              y={0}
              width={SVG_WIDTH}
              height={SVG_HEIGHT}
              opacity={0.6}
              preserveAspectRatio="xMidYMid slice"
            />
          )}

          {/* Grid (subtle) */}
          <defs>
            <pattern
              id="roof-grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="rgba(128,128,128,0.12)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="url(#roof-grid)" />

          {/* Render all sections as polygons (inactive ones faded) */}
          {geometry.sections.map((section) => {
            if (section.vertices.length < 2) return null;
            const isActive = section.id === geometry.activeSectionId;
            const fill = isActive
              ? "rgba(124, 58, 237, 0.1)"
              : "rgba(128, 128, 128, 0.05)";
            const stroke = isActive
              ? "rgb(124, 58, 237)"
              : "rgba(128, 128, 128, 0.4)";

            return (
              <polygon
                key={section.id}
                points={getPointsString(section.vertices)}
                fill={fill}
                stroke={stroke}
                strokeWidth={2}
                strokeDasharray={section.confirmed ? "none" : "6,3"}
              />
            );
          })}

          {/* Render vertices for active section */}
          {activeSection &&
            activeSection.vertices.map((point) => {
              const isDragging = point.id === draggingPointId;
              return (
                <g key={point.id}>
                  {/* Hit area (larger for easier interaction) */}
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={HIT_RADIUS}
                    fill="transparent"
                    style={{
                      cursor:
                        tool === "move"
                          ? "grab"
                          : tool === "delete"
                            ? "pointer"
                            : "default",
                    }}
                    onMouseDown={(e) => handlePointMouseDown(e, point.id)}
                  />
                  {/* Visible point */}
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={POINT_RADIUS}
                    fill={
                      isDragging
                        ? "#ec4899"
                        : tool === "delete"
                          ? "#ef4444"
                          : "#7c3aed"
                    }
                    stroke="white"
                    strokeWidth={2}
                    style={{ pointerEvents: "none" }}
                  />
                </g>
              );
            })}

          {/* Connecting lines for < 2 vertices in active section */}
          {activeSection && activeSection.vertices.length === 1 && (
            <circle
              cx={activeSection.vertices[0].x}
              cy={activeSection.vertices[0].y}
              r={POINT_RADIUS}
              fill="#7c3aed"
              stroke="white"
              strokeWidth={2}
            />
          )}
        </svg>

        {/* Hint overlay */}
        {activeSection && activeSection.vertices.length === 0 && !disabled && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="rounded-lg bg-black/60 backdrop-blur px-4 py-2 text-xs text-primary-foreground">
              Click on the canvas to add boundary points
            </div>
          </div>
        )}
      </div>

      {/* Section info */}
      {activeSection && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{activeSection.vertices.length} vertices</span>
          {activeSection.vertices.length >= 3 && (
            <>
              <span>·</span>
              <span>
                Area: {polygonArea(activeSection.vertices).toFixed(0)} px²
              </span>
              {isValidSection(activeSection) ? (
                <span className="text-green-600">· Valid polygon</span>
              ) : (
                <span className="text-amber-600">
                  · Needs ≥3 non-collinear points
                </span>
              )}
            </>
          )}
          <span>·</span>
          <span>Source: {activeSection.source}</span>
        </div>
      )}

      {/* Confirm button */}
      {hasValidSections && !allConfirmed && (
        <Button variant="ghost"
          onClick={handleConfirm}
          disabled={disabled}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-accent-green px-4 py-2.5 text-sm font-medium text-primary-foreground -green/90 transition-colors"
        >
          <CheckCircle2 aria-hidden="true" className="w-4 h-4" />
          Confirm Roof Geometry
        </Button>
      )}
      {allConfirmed && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs font-medium text-green-700">
          <CheckCircle2 aria-hidden="true" className="w-4 h-4" />
          Geometry confirmed — ready for calculation
        </div>
      )}
    </div>
  );
}

export default RoofGeometryEditor;
