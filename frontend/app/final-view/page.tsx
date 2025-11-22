"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

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
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Preview Area */}
      <div className="flex-1 relative bg-muted/30">
        <div className="w-full h-full flex items-center justify-center p-8">
          {generatedImage ? (
            <div className="w-full h-full flex items-center justify-center">
              <img 
                src={generatedImage} 
                alt="Generated product in environment" 
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>
          ) : (
            <div className="text-center max-w-md">
              <div className="mb-6">
                <div className="w-64 h-64 mx-auto bg-muted rounded-lg border-2 border-dashed border-black flex items-center justify-center mb-4">
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

      {/* Environment Input */}
      <div className="bg-card flex-shrink-0">
        <div className="container mx-auto px-6 py-6 max-w-4xl">
          <div className="flex items-center gap-3">
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
              className="flex-1 h-12 text-base"
              disabled={isGenerating}
            />
            <Button 
              variant="default"
              onClick={handleGenerate}
              disabled={!environmentText.trim() || isGenerating}
              size="icon"
              className="h-12 w-12"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
