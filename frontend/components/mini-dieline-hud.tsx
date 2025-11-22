"use client"

import type { DielinePath } from "@/lib/packaging-types"

interface MiniDielineHudProps {
  dielines: DielinePath[]
}

export function MiniDielineHud({ dielines }: MiniDielineHudProps) {
  if (!dielines || dielines.length === 0) return null

  // Calculate the bounding box of all paths
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  dielines.forEach((path) => {
    path.points.forEach((point) => {
      minX = Math.min(minX, point.x)
      minY = Math.min(minY, point.y)
      maxX = Math.max(maxX, point.x)
      maxY = Math.max(maxY, point.y)
    })
  })

  const width = maxX - minX
  const height = maxY - minY
  const padding = Math.max(width, height) * 0.1

  // Calculate viewBox with padding
  const viewBoxX = minX - padding
  const viewBoxY = minY - padding
  const viewBoxWidth = width + padding * 2
  const viewBoxHeight = height + padding * 2

  return (
    <div className="absolute bottom-4 right-4 bg-card/95 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg">
      <div className="text-xs font-medium text-muted-foreground mb-1 px-1">Dieline</div>
      <svg
        width="180"
        height="180"
        viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`}
        className="bg-background/50 rounded"
      >
        {dielines.map((path, i) => {
          const pathString = path.points.map((point, idx) => `${idx === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ")

          let strokeColor = "#94a3b8" // Default gray

          // Color code by path type based on first point
          if (path.points.length > 0) {
            const firstPointType = path.points[0].type
            if (firstPointType === "fold") strokeColor = "#10b981" // Green for fold lines
            if (firstPointType === "cut") strokeColor = "#ef4444" // Red for cut lines
          }

          return (
            <path
              key={i}
              d={pathString + (path.closed ? " Z" : "")}
              fill="none"
              stroke={strokeColor}
              strokeWidth={viewBoxWidth * 0.005}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )
        })}
      </svg>
    </div>
  )
}
