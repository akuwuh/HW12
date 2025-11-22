"use client"

import { useRef, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, PerspectiveCamera, Environment, Gltf } from "@react-three/drei"
import * as THREE from "three"
import type { PackageType, PackageDimensions } from "@/lib/packaging-types"
import { MiniDielineHud } from "@/components/mini-dieline-hud"
import type { DielinePath } from "@/lib/packaging-types"

interface PackageViewer3DProps {
  packageType: PackageType
  dimensions: PackageDimensions
  color?: string
  dielines?: DielinePath[]
  modelUrl?: string | null
}

function Package3D({ packageType, dimensions, color = "#93c5fd", modelUrl }: PackageViewer3DProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const { width, height, depth } = dimensions

  // Normalize dimensions for display
  const scale = 2 / Math.max(width, height, depth)
  const w = width * scale
  const h = height * scale
  const d = depth * scale

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.2
    }
  })

  if (modelUrl) {
    return (
      <group ref={meshRef as any}>
        <Gltf src={modelUrl} scale={scale * 2} />
      </group>
    )
  }

  const renderPackage = () => {
    switch (packageType) {
      case "box":
        return (
          <mesh ref={meshRef} castShadow receiveShadow>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
          </mesh>
        )

      case "cylinder":
        return (
          <group ref={meshRef}>
            {/* Main cylinder body */}
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[w / 2, w / 2, h, 32]} />
              <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
            </mesh>
            {/* Top and bottom caps */}
            <mesh position={[0, h/2 + 0.01, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[w / 2, w / 2, 0.02, 32]} />
              <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
            </mesh>
            <mesh position={[0, -h/2 - 0.01, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[w / 2, w / 2, 0.02, 32]} />
              <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
            </mesh>
          </group>
        )

      case "bag":
        return (
          <group ref={meshRef}>
            {/* Main bag body (slightly tapered) */}
            <mesh castShadow receiveShadow position={[0, -h / 4, 0]}>
              <boxGeometry args={[w * 0.9, h * 0.8, d * 0.9]} />
              <meshStandardMaterial color={color} roughness={0.8} metalness={0.0} />
            </mesh>
            {/* Top fold/opening */}
            <mesh castShadow receiveShadow position={[0, h * 0.3, 0]}>
              <boxGeometry args={[w * 1.1, h * 0.1, d * 0.9]} />
              <meshStandardMaterial color={color} roughness={0.8} metalness={0.0} />
            </mesh>
            {/* Side gussets */}
            <mesh castShadow receiveShadow position={[-w * 0.45, -h / 4, 0]}>
              <boxGeometry args={[0.02, h * 0.8, d * 0.9]} />
              <meshStandardMaterial color={color} roughness={0.8} metalness={0.0} />
            </mesh>
            <mesh castShadow receiveShadow position={[w * 0.45, -h / 4, 0]}>
              <boxGeometry args={[0.02, h * 0.8, d * 0.9]} />
              <meshStandardMaterial color={color} roughness={0.8} metalness={0.0} />
            </mesh>
          </group>
        )

      default:
        return null
    }
  }

  return (
    <>
      {renderPackage()}
      <gridHelper args={[10, 10, "#e5e7eb", "#f3f4f6"]} />
    </>
  )
}

export function PackageViewer3D(props: PackageViewer3DProps) {
  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-border overflow-hidden relative">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[4, 3, 4]} />
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} minDistance={2} maxDistance={10} />

        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-5, 5, -5]} intensity={0.5} />

        {/* Environment for reflections */}
        <Environment preset="apartment" />

        {/* Package */}
        <Package3D {...props} />
      </Canvas>

      {props.dielines && <MiniDielineHud dielines={props.dielines} />}
    </div>
  )
}
