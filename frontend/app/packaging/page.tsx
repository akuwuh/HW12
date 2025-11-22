"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ZoomIn, ZoomOut, Play, Pause, Settings, Sun, Warehouse, Eye, EyeOff, ShoppingBag, Box, Square } from "lucide-react";
import ModelViewer from "@/components/ModelViewer";
import { AIChatPanel } from "@/components/AIChatPanel";

export default function Packaging() {
  const [currentModelUrl, setCurrentModelUrl] = useState<string>();
  const [selectedColor, setSelectedColor] = useState("#60a5fa");
  const [selectedTexture, setSelectedTexture] = useState("matte");
  const [lightingMode, setLightingMode] = useState<"studio" | "sunset" | "warehouse" | "forest">("studio");
  const [displayMode, setDisplayMode] = useState<"solid" | "wireframe">("solid");
  const [zoomAction, setZoomAction] = useState<"in" | "out" | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [selectedPackageType, setSelectedPackageType] = useState<"bag" | "box" | null>(null);
  const [hasWindow, setHasWindow] = useState(false);

  // Reset zoom action after it's been processed
  useEffect(() => {
    if (zoomAction) {
      const timer = setTimeout(() => setZoomAction(null), 200);
      return () => clearTimeout(timer);
    }
  }, [zoomAction]);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {/* 3D Viewer */}
        <div className="flex-1 relative bg-muted/30">
          <ModelViewer
            modelUrl={currentModelUrl}
            onModelLoaded={setCurrentModelUrl}
            selectedColor={selectedColor}
            selectedTexture={selectedTexture}
            lightingMode={lightingMode}
            wireframe={displayMode === "wireframe"}
            zoomAction={zoomAction}
            autoRotate={autoRotate}
          />

          {/* Floating Controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <Button size="icon" variant="secondary" onClick={() => setZoomAction("in")}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="secondary" onClick={() => setZoomAction("out")}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="secondary" onClick={() => setAutoRotate(!autoRotate)}>
              {autoRotate ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="secondary">
                  <Settings className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLightingMode("studio")}>
                  <Settings className="w-4 h-4 mr-2" />
                  Studio Lighting
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLightingMode("sunset")}>
                  <Sun className="w-4 h-4 mr-2" />
                  Sunset Lighting
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLightingMode("warehouse")}>
                  <Warehouse className="w-4 h-4 mr-2" />
                  Warehouse Lighting
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setDisplayMode("solid")}>
                  <Eye className="w-4 h-4 mr-2" />
                  Solid View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDisplayMode("wireframe")}>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Wireframe View
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="w-[380px] border-l-2 border-black bg-card overflow-hidden flex flex-col flex-shrink-0">
          <div className="border-b-2 border-black flex-shrink-0 px-4 py-3">
            <h2 className="text-sm font-semibold">
              Chat
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col">
            {/* Package Type Selection */}
            <div className="mb-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Package Type</p>
              <div className="flex gap-2">
                <Button
                  variant={selectedPackageType === "bag" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedPackageType("bag")}
                  className="flex-1"
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Bag
                </Button>
                <Button
                  variant={selectedPackageType === "box" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedPackageType("box")}
                  className="flex-1"
                >
                  <Box className="w-4 h-4 mr-2" />
                  Box
                </Button>
              </div>
              {selectedPackageType && (
                <Button
                  variant={hasWindow ? "default" : "outline"}
                  size="sm"
                  onClick={() => setHasWindow(!hasWindow)}
                  className="w-full text-xs h-8"
                >
                  <Square className="w-3 h-3 mr-1.5" />
                  Window
                </Button>
              )}
            </div>
            <AIChatPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
