"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Download } from "lucide-react";

export default function FinalView() {
  const [environmentText, setEnvironmentText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!environmentText.trim()) return;
    
    setIsGenerating(true);
    // TODO: Implement Gemini API call to generate image
    // This will take the model's image and feed it to Gemini
    // along with the environment description
    setTimeout(() => {
      setIsGenerating(false);
      // Placeholder for now - will be replaced with actual generated image URL
      setGeneratedImage(null);
    }, 2000);
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Preview Area */}
        <div className="flex-1 relative bg-muted/30 min-h-0 flex flex-col">
          {/* Environment Input */}
          <div className="bg-card flex-shrink-0">
            <div className="container mx-auto px-6 py-3 max-w-7xl">
              <div className="flex items-center justify-between gap-4 pl-80">
                <div className="flex items-center gap-3 flex-1 justify-center">
                  <Input
                    type="text"
                    placeholder="Describe the environment (e.g., product on a store shelf in a modern retail store)"
                    value={environmentText}
                    onChange={(e) => setEnvironmentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && environmentText.trim() && !isGenerating) {
                        handleGenerate();
                      }
                    }}
                    className="w-full max-w-2xl h-12 text-base box-border"
                    disabled={isGenerating}
                  />
                  <Button
                    onClick={handleGenerate}
                    disabled={!environmentText.trim() || isGenerating}
                    size="icon"
                    className="h-12 w-12 bg-white border-2 border-black hover:bg-gray-100 box-border"
                  >
                    <Send className="w-4 h-4 text-black" />
                  </Button>
                </div>
                <div className="flex gap-2 ml-16">
                  <button suppressHydrationWarning className="flex flex-col items-center justify-center p-1 rounded-lg border-2 border-black bg-card hover:bg-accent transition-all duration-200 hover:scale-[1.02] active:scale-95 group cursor-pointer w-12 h-12">
                    <Download className="w-3 h-3 mb-0.5 transition-transform group-hover:-translate-y-1" />
                    <span className="font-bold text-[10px] leading-tight">2D Dieline</span>
                  </button>
                  <button suppressHydrationWarning className="flex flex-col items-center justify-center p-1 rounded-lg border-2 border-black bg-card hover:bg-accent transition-all duration-200 hover:scale-[1.02] active:scale-95 group cursor-pointer w-12 h-12">
                    <Download className="w-3 h-3 mb-0.5 transition-transform group-hover:-translate-y-1" />
                    <span className="font-bold text-[10px] leading-tight">3D Model</span>
                  </button>
                  <button suppressHydrationWarning className="flex flex-col items-center justify-center p-1 rounded-lg border-2 border-black bg-card hover:bg-accent transition-all duration-200 hover:scale-[1.02] active:scale-95 group cursor-pointer w-12 h-12">
                    <Download className="w-3 h-3 mb-0.5 transition-transform group-hover:-translate-y-1" />
                    <span className="font-bold text-[10px] leading-tight">Render Image</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 w-full flex items-center justify-center p-4 overflow-auto">
            {generatedImage ? (
              <div className="w-full h-full flex items-center justify-center">
                <img 
                  src={generatedImage} 
                  alt="Generated product in environment" 
                  className="max-w-full max-h-full object-contain rounded-lg border-2 border-black bg-background"
                />
              </div>
            ) : (
              <div className="text-center w-full">
                <div className="mb-6">
                  <div className="w-full max-w-2xl h-96 mx-auto bg-muted rounded-lg border-2 border-dashed border-black flex items-center justify-center mb-4">
                    <p className="text-muted-foreground text-sm">
                      {isGenerating ? "Generating..." : "Generated image will appear here"}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Enter an environment description to generate your product image
                </p>
              </div>
            )}
          </div>
        </div>


      </div>
    </div>
  );
}
