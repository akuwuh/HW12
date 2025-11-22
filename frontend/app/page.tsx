"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Sparkles, Upload, Image as ImageIcon, Box } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleStart = () => {
    if (!prompt.trim()) return;
    // In a real app, we would pass this prompt to the product page
    // possibly via query params or context
    router.push("/product");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleStart();
    }
  };

  const suggestions = [
    { icon: Box, text: "Design a modern perfume bottle" },
    { icon: Sparkles, text: "Create eco-friendly cereal box" },
    { icon: ImageIcon, text: "Generate minimal coffee packaging" },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 md:p-8 max-w-4xl mx-auto w-full">
      <div className="flex flex-col items-center w-full space-y-8 transition-all duration-500 ease-out">
        
        <div className="space-y-2 text-center mb-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            What do you want to build?
          </h1>
          <p className="text-muted-foreground text-lg">
            Describe your packaging idea and let AI visualize it for you.
          </p>
        </div>

        <div 
          className={`
            w-full max-w-2xl relative group
            transition-all duration-300 ease-in-out
            ${isFocused ? "scale-[1.02]" : "scale-100"}
          `}
        >
          <div className="relative bg-background rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            <Textarea
              placeholder="I want a hexagonal box for organic tea..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="min-h-[120px] w-full resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-4 text-lg bg-transparent"
            />
            
            <div className="flex items-center justify-between p-3 border-t-2 border-black bg-muted/30">
              <div className="flex gap-2">
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg border-black hover:bg-background" title="Upload reference image">
                  <Upload className="w-4 h-4" />
                </Button>
              </div>
              
              <Button 
                onClick={handleStart}
                disabled={!prompt.trim()}
                className={`
                  transition-all duration-300 
                  ${prompt.trim() ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}
                `}
              >
                Generate
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {suggestions.map((suggestion, i) => (
            <button
              key={i}
              onClick={() => setPrompt(suggestion.text)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-background border-2 border-black rounded-full 
                         hover:bg-secondary hover:scale-105 active:scale-95 transition-all duration-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              <suggestion.icon className="w-4 h-4" />
              {suggestion.text}
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
