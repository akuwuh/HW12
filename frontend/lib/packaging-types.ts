// Package type definitions and configurations
export type PackageType = "box" | "bag" | "cylinder"

export interface PackageDimensions {
  width: number
  height: number
  depth: number
}

export interface PackageConfig {
  type: PackageType
  dimensions: PackageDimensions
  name: string
  icon: string
}

// Dieline point for 2D editing
export interface DielinePoint {
  x: number
  y: number
  type: "corner" | "fold" | "cut"
}

export interface DielinePath {
  points: DielinePoint[]
  closed: boolean
}

// Default dimensions for each package type
export const DEFAULT_PACKAGE_DIMENSIONS: Record<PackageType, PackageDimensions> = {
  box: { width: 100, height: 150, depth: 100 },
  bag: { width: 120, height: 180, depth: 60 },
  cylinder: { width: 80, height: 150, depth: 80 },
}

// Generate dieline paths based on package type and dimensions
export function generateDieline(type: PackageType, dimensions: PackageDimensions): DielinePath[] {
  const { width, height, depth } = dimensions

  switch (type) {
    case "box":
      return generateBoxDieline(width, height, depth)
    case "bag":
      return generateBagDieline(width, height, depth)
    case "cylinder":
      return generateCylinderDieline(width, height, depth)
    default:
      return []
  }
}

// Box dieline generator (classic box with flaps)
function generateBoxDieline(w: number, h: number, d: number): DielinePath[] {
  const margin = 10
  const flapSize = d * 0.5

  // Top flap
  const topFlap: DielinePoint[] = [
    { x: margin + w, y: margin, type: "corner" },
    { x: margin + w + d, y: margin, type: "corner" },
    { x: margin + w + d, y: margin + flapSize, type: "fold" },
    { x: margin + w, y: margin + flapSize, type: "fold" },
  ]

  // Front face
  const frontFace: DielinePoint[] = [
    { x: margin + w, y: margin + flapSize, type: "fold" },
    { x: margin + w + d, y: margin + flapSize, type: "fold" },
    { x: margin + w + d, y: margin + flapSize + h, type: "fold" },
    { x: margin + w, y: margin + flapSize + h, type: "fold" },
  ]

  // Bottom flap
  const bottomFlap: DielinePoint[] = [
    { x: margin + w, y: margin + flapSize + h, type: "fold" },
    { x: margin + w + d, y: margin + flapSize + h, type: "fold" },
    { x: margin + w + d, y: margin + flapSize + h + d, type: "corner" },
    { x: margin + w, y: margin + flapSize + h + d, type: "corner" },
  ]

  // Left side panel
  const leftPanel: DielinePoint[] = [
    { x: margin, y: margin + flapSize, type: "corner" },
    { x: margin + w, y: margin + flapSize, type: "fold" },
    { x: margin + w, y: margin + flapSize + h, type: "fold" },
    { x: margin, y: margin + flapSize + h, type: "corner" },
  ]

  // Right side panel
  const rightPanel: DielinePoint[] = [
    { x: margin + w + d, y: margin + flapSize, type: "fold" },
    { x: margin + w + d + w, y: margin + flapSize, type: "fold" },
    { x: margin + w + d + w, y: margin + flapSize + h, type: "fold" },
    { x: margin + w + d, y: margin + flapSize + h, type: "fold" },
  ]

  // Back panel
  const backPanel: DielinePoint[] = [
    { x: margin + w + d + w, y: margin + flapSize, type: "fold" },
    { x: margin + w + d + w + d, y: margin + flapSize, type: "corner" },
    { x: margin + w + d + w + d, y: margin + flapSize + h, type: "corner" },
    { x: margin + w + d + w, y: margin + flapSize + h, type: "fold" },
  ]

  return [
    { points: topFlap, closed: true },
    { points: frontFace, closed: true },
    { points: bottomFlap, closed: true },
    { points: leftPanel, closed: true },
    { points: rightPanel, closed: true },
    { points: backPanel, closed: true },
  ]
}

// Bag dieline (flat with side gussets)
function generateBagDieline(w: number, h: number, d: number): DielinePath[] {
  const margin = 10

  const mainPath: DielinePoint[] = [
    { x: margin, y: margin, type: "corner" },
    { x: margin + w, y: margin, type: "corner" },
    { x: margin + w, y: margin + h, type: "fold" },
    { x: margin + w, y: margin + h * 2, type: "corner" },
    { x: margin, y: margin + h * 2, type: "corner" },
    { x: margin, y: margin + h, type: "fold" },
  ]

  const gussetLeft: DielinePoint[] = [
    { x: margin - d / 2, y: margin + h * 0.3, type: "fold" },
    { x: margin, y: margin + h * 0.3, type: "fold" },
    { x: margin, y: margin + h * 0.7, type: "fold" },
    { x: margin - d / 2, y: margin + h * 0.7, type: "fold" },
  ]

  const gussetRight: DielinePoint[] = [
    { x: margin + w, y: margin + h * 0.3, type: "fold" },
    { x: margin + w + d / 2, y: margin + h * 0.3, type: "fold" },
    { x: margin + w + d / 2, y: margin + h * 0.7, type: "fold" },
    { x: margin + w, y: margin + h * 0.7, type: "fold" },
  ]

  return [
    { points: mainPath, closed: true },
    { points: gussetLeft, closed: true },
    { points: gussetRight, closed: true },
  ]
}


// Cylinder dieline (wrap around label)
function generateCylinderDieline(w: number, h: number, d: number): DielinePath[] {
  const margin = 10
  const circumference = Math.PI * w

  // Body wrap
  const bodyPath: DielinePoint[] = [
    { x: margin, y: margin + w / 2, type: "fold" },
    { x: margin + circumference, y: margin + w / 2, type: "fold" },
    { x: margin + circumference, y: margin + w / 2 + h, type: "fold" },
    { x: margin, y: margin + w / 2 + h, type: "fold" },
  ]

  // Top circle (approximated with octagon)
  const topCircle: DielinePoint[] = []
  const topCenterX = margin + circumference / 2
  const topCenterY = margin
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI * 2) / 8
    topCircle.push({
      x: topCenterX + Math.cos(angle) * (w / 2),
      y: topCenterY + Math.sin(angle) * (w / 2),
      type: i === 0 ? "fold" : "corner",
    })
  }

  // Bottom circle
  const bottomCircle: DielinePoint[] = []
  const bottomCenterX = margin + circumference / 2
  const bottomCenterY = margin + w / 2 + h + w / 2
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI * 2) / 8
    bottomCircle.push({
      x: bottomCenterX + Math.cos(angle) * (w / 2),
      y: bottomCenterY + Math.sin(angle) * (w / 2),
      type: i === 0 ? "fold" : "corner",
    })
  }

  return [
    { points: bodyPath, closed: true },
    { points: topCircle, closed: true },
    { points: bottomCircle, closed: true },
  ]
}
