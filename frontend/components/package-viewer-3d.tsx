"use client"

import { useRef, useMemo, useEffect } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import type { ThreeEvent } from "@react-three/fiber"
import { OrbitControls, PerspectiveCamera, Environment } from "@react-three/drei"
import { OrbitControls as OrbitControlsImpl } from "three-stdlib"
import * as THREE from "three"
import type { PackageModel, PanelId } from "@/lib/packaging-types"
import { MiniDielineHud } from "@/components/mini-dieline-hud"

interface PackageViewer3DProps {
  model: PackageModel
  selectedPanelId?: PanelId | null
  onPanelSelect?: (panelId: PanelId | null) => void
  color?: string
  panelTextures?: Partial<Record<PanelId, string>>
  lightingMode?: "studio" | "sunset" | "warehouse" | "forest"
  wireframe?: boolean
  zoomAction?: "in" | "out" | null
  autoRotate?: boolean
}

function BoxPackage3D({
  dimensions,
  selectedPanelId,
  onPanelSelect,
  color = "#93c5fd",
  panelTextures = {},
  wireframe = false,
  autoRotate = true,
}: {
  dimensions: { width: number; height: number; depth: number }
  selectedPanelId?: PanelId | null
  onPanelSelect?: (panelId: PanelId | null) => void
  color?: string
  panelTextures?: Partial<Record<PanelId, string>>
  wireframe?: boolean
  autoRotate?: boolean
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const { width, height, depth } = dimensions

  const fixedScale = 0.01 // 1mm = 0.01 Three.js units
  const w = width * fixedScale
  const h = height * fixedScale
  const d = depth * fixedScale

  useFrame((state) => {
    if (meshRef.current && autoRotate) {
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.2
    }
  })

  // Create materials array that updates when textures change
  const materials = useMemo(() => {
    const faceToPanelMap: Record<number, PanelId> = {
      0: "right",
      1: "left",
      2: "top",
      3: "bottom",
      4: "front",
      5: "back",
    }

    const textureLoader = new THREE.TextureLoader()

    return Array.from({ length: 6 }, (_, i) => {
      const panelId = faceToPanelMap[i]
      const textureUrl = panelTextures[panelId]

      // If texture exists, start with white color, otherwise use the base color
      const material = new THREE.MeshStandardMaterial({
        color: textureUrl ? 0xffffff : color,
        roughness: 0.3,
        metalness: 0.1,
        wireframe,
      })

      // Set selection highlight
      if (panelId === selectedPanelId) {
        material.emissive.set("#fbbf24")
        material.emissiveIntensity = 0.3
      }

      // Load texture IMMEDIATELY if available
      if (textureUrl) {
        console.log(`[BoxPackage3D] 🎨 Loading texture for ${panelId}`)
        textureLoader.load(
          textureUrl,
          (texture) => {
            // Enable texture flipping for correct orientation
            texture.flipY = true
            
            // Use ClampToEdge to prevent border artifacts
            texture.wrapS = THREE.ClampToEdgeWrapping
            texture.wrapT = THREE.ClampToEdgeWrapping
            
            // Use nearest or linear filtering to prevent edge bleeding
            texture.minFilter = THREE.LinearFilter
            texture.magFilter = THREE.LinearFilter
            
            // Ensure texture covers full UV space (0-1)
            texture.repeat.set(1, 1)
            texture.offset.set(0, 0)
            
            // Apply to material
            material.map = texture
            material.color.setHex(0xffffff) // Set to white so texture shows true colors
            material.needsUpdate = true
            console.log(`[BoxPackage3D] ✅ Texture applied to ${panelId}`)
          },
          undefined,
          (error) => {
            console.error(`[BoxPackage3D] ❌ Failed to load texture for ${panelId}:`, error)
          }
        )
      }

      return material
    })
  }, [panelTextures, selectedPanelId, color, wireframe])

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (!onPanelSelect) return

    event.stopPropagation()
    const intersection = event.intersections?.[0]
    if (!intersection || intersection.faceIndex == null) return

    // Each face has 2 triangles, so divide by 2 to get face index
    const faceIndex = Math.floor(intersection.faceIndex / 2)

    // Three.js BoxGeometry face order: [right, left, top, bottom, front, back]
    const faceToPanelMap: Record<number, PanelId> = {
      0: "right",
      1: "left",
      2: "top",
      3: "bottom",
      4: "front",
      5: "back",
    }
    
    if (faceIndex >= 0 && faceIndex < 6) {
      const clickedPanel = faceToPanelMap[faceIndex]
      
      if (clickedPanel === selectedPanelId) {
        onPanelSelect(null) // Deselect if clicking same panel
      } else {
        onPanelSelect(clickedPanel)
      }
    }
  }

  return (
    <mesh
      ref={meshRef}
      castShadow
      receiveShadow
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = "pointer"
      }}
      onPointerOut={() => {
        document.body.style.cursor = "default"
      }}
    >
      <boxGeometry args={[w, h, d]} />
      <primitive object={materials} attach="material" />
    </mesh>
  )
}

function CylinderPackage3D({
  dimensions,
  selectedPanelId,
  onPanelSelect,
  color = "#93c5fd",
  panelTextures = {},
  wireframe = false,
  autoRotate = true,
}: {
  dimensions: { width: number; height: number; depth: number }
  selectedPanelId?: PanelId | null
  onPanelSelect?: (panelId: PanelId | null) => void
  color?: string
  panelTextures?: Partial<Record<PanelId, string>>
  wireframe?: boolean
  autoRotate?: boolean
}) {
  const groupRef = useRef<THREE.Group>(null)
  const { width, height } = dimensions

  const fixedScale = 0.01
  const radius = (width * fixedScale) / 2
  const cylinderHeight = height * fixedScale

  useFrame((state) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.2
    }
  })

  const baseMaterial = useMemo(() => {
    const bodyTexture = panelTextures["body"]
    
    const material = new THREE.MeshStandardMaterial({
      color: bodyTexture ? 0xffffff : color,
      roughness: 0.3,
      metalness: 0.1,
      wireframe,
    })
    
    // Apply body texture if available - load asynchronously
    if (bodyTexture) {
      const textureLoader = new THREE.TextureLoader()
      textureLoader.load(
        bodyTexture,
        (texture) => {
          texture.flipY = true
          // Use RepeatWrapping for horizontal (S) to seamlessly wrap around cylinder
          texture.wrapS = THREE.RepeatWrapping
          texture.wrapT = THREE.ClampToEdgeWrapping
          texture.minFilter = THREE.LinearFilter
          texture.magFilter = THREE.LinearFilter
          texture.repeat.set(1, 1)
          texture.offset.set(0, 0)
          material.map = texture
          material.color.setHex(0xffffff)
          material.needsUpdate = true
        },
        undefined,
        (error) => {
          console.error("[CylinderPackage3D] Failed to load body texture:", error)
        }
      )
    }
    
    return material
  }, [color, panelTextures, wireframe])

  const selectedMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#fbbf24",
        roughness: 0.3,
        metalness: 0.1,
        emissive: "#fbbf24",
        emissiveIntensity: 0.3,
        wireframe,
      }),
    [wireframe]
  )
  
  const topMaterial = useMemo(() => {
    const topTexture = panelTextures["top"]
    
    const material = new THREE.MeshStandardMaterial({
      color: topTexture ? 0xffffff : color,
      roughness: 0.3,
      metalness: 0.1,
      wireframe,
    })
    
    if (topTexture) {
      const textureLoader = new THREE.TextureLoader()
      textureLoader.load(
        topTexture,
        (texture) => {
          texture.flipY = true
          texture.wrapS = THREE.ClampToEdgeWrapping
          texture.wrapT = THREE.ClampToEdgeWrapping
          texture.minFilter = THREE.LinearFilter
          texture.magFilter = THREE.LinearFilter
          texture.repeat.set(1, 1)
          texture.offset.set(0, 0)
          material.map = texture
          material.color.setHex(0xffffff)
          material.needsUpdate = true
        },
        undefined,
        (error) => {
          console.error("[CylinderPackage3D] Failed to load top texture:", error)
        }
      )
    }
    
    return material
  }, [color, panelTextures, wireframe])
  
  const bottomMaterial = useMemo(() => {
    const bottomTexture = panelTextures["bottom"]
    
    const material = new THREE.MeshStandardMaterial({
      color: bottomTexture ? 0xffffff : color,
      roughness: 0.3,
      metalness: 0.1,
      wireframe,
    })
    
    if (bottomTexture) {
      const textureLoader = new THREE.TextureLoader()
      textureLoader.load(
        bottomTexture,
        (texture) => {
          texture.flipY = true
          texture.wrapS = THREE.ClampToEdgeWrapping
          texture.wrapT = THREE.ClampToEdgeWrapping
          texture.minFilter = THREE.LinearFilter
          texture.magFilter = THREE.LinearFilter
          texture.repeat.set(1, 1)
          texture.offset.set(0, 0)
          material.map = texture
          material.color.setHex(0xffffff)
          material.needsUpdate = true
        },
        undefined,
        (error) => {
          console.error("[CylinderPackage3D] Failed to load bottom texture:", error)
        }
      )
    }
    
    return material
  }, [color, panelTextures, wireframe])

  const handleBodyClick = (event: ThreeEvent<MouseEvent>) => {
    if (!onPanelSelect) return
    event.stopPropagation()
    if ("body" === selectedPanelId) {
      onPanelSelect(null)
    } else {
      onPanelSelect("body")
    }
  }

  const handleTopClick = (event: ThreeEvent<MouseEvent>) => {
    if (!onPanelSelect) return
    event.stopPropagation()
    if ("top" === selectedPanelId) {
      onPanelSelect(null)
    } else {
      onPanelSelect("top")
    }
  }

  const handleBottomClick = (event: ThreeEvent<MouseEvent>) => {
    if (!onPanelSelect) return
    event.stopPropagation()
    if ("bottom" === selectedPanelId) {
      onPanelSelect(null)
    } else {
      onPanelSelect("bottom")
    }
  }

  return (
    <group ref={groupRef}>
      {/* Main cylinder body */}
      <mesh
        castShadow
        receiveShadow
        onClick={handleBodyClick}
        onPointerOver={(e) => {
          e.stopPropagation()
          document.body.style.cursor = "pointer"
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default"
        }}
        material={selectedPanelId === "body" ? selectedMaterial : baseMaterial}
      >
        <cylinderGeometry args={[radius, radius, cylinderHeight, 32]} />
      </mesh>
      {/* Top cap */}
      <mesh
        position={[0, cylinderHeight / 2 + 0.01, 0]}
        castShadow
        receiveShadow
        onClick={handleTopClick}
        onPointerOver={(e) => {
          e.stopPropagation()
          document.body.style.cursor = "pointer"
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default"
        }}
        material={selectedPanelId === "top" ? selectedMaterial : topMaterial}
      >
        <cylinderGeometry args={[radius, radius, 0.02, 32]} />
      </mesh>
      {/* Bottom cap */}
      <mesh
        position={[0, -cylinderHeight / 2 - 0.01, 0]}
        castShadow
        receiveShadow
        onClick={handleBottomClick}
        onPointerOver={(e) => {
          e.stopPropagation()
          document.body.style.cursor = "pointer"
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default"
        }}
        material={selectedPanelId === "bottom" ? selectedMaterial : bottomMaterial}
      >
        <cylinderGeometry args={[radius, radius, 0.02, 32]} />
      </mesh>
    </group>
  )
}

function Package3D({ 
  model, 
  selectedPanelId, 
  onPanelSelect, 
  color, 
  panelTextures,
  wireframe = false,
  autoRotate = true,
}: PackageViewer3DProps) {
  const { type, dimensions } = model

  switch (type) {
    case "box":
      return (
        <BoxPackage3D
          dimensions={dimensions}
          selectedPanelId={selectedPanelId}
          onPanelSelect={onPanelSelect}
          color={color}
          panelTextures={panelTextures}
          wireframe={wireframe}
          autoRotate={autoRotate}
        />
      )

    case "cylinder":
      return (
        <CylinderPackage3D
          dimensions={dimensions}
          selectedPanelId={selectedPanelId}
          onPanelSelect={onPanelSelect}
          color={color}
          panelTextures={panelTextures}
          wireframe={wireframe}
          autoRotate={autoRotate}
        />
      )

    default:
      return null
  }
}

export function PackageViewer3D(props: PackageViewer3DProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const {
    lightingMode = "studio",
    wireframe = false,
    zoomAction,
    autoRotate = true,
  } = props

  useEffect(() => {
    if (!zoomAction || !controlsRef.current) return

    const currentDistance = controlsRef.current.getDistance()
    const newDistance = zoomAction === "in" 
      ? Math.max(currentDistance * 0.8, 2) 
      : Math.min(currentDistance * 1.2, 10)

    controlsRef.current.minDistance = newDistance
    controlsRef.current.maxDistance = newDistance
    controlsRef.current.update()

    const timer = setTimeout(() => {
      if (controlsRef.current) {
        controlsRef.current.minDistance = 2
        controlsRef.current.maxDistance = 10
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [zoomAction])

  return (
    <div className="w-full h-full bg-linear-to-br from-slate-50 to-slate-100 rounded-lg border border-border overflow-hidden relative">
      <Canvas 
        key="packaging-viewer-canvas"
        shadows
        gl={{
          preserveDrawingBuffer: false,
          powerPreference: "high-performance",
          antialias: true,
        }}
        frameloop="always"
      >
        <PerspectiveCamera makeDefault position={[4, 3, 4]} />
        <OrbitControls 
          ref={controlsRef}
          enablePan={true} 
          enableZoom={true} 
          enableRotate={true} 
          minDistance={2} 
          maxDistance={10}
          enableDamping
          dampingFactor={0.05}
        />

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
        <Environment preset={lightingMode} background={false} />

        {/* Package */}
        <Package3D {...props} wireframe={wireframe} autoRotate={autoRotate} />
      </Canvas>

      {props.model.dielines && <MiniDielineHud dielines={props.model.dielines} />}
    </div>
  )
}
