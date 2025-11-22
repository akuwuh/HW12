"use client";

import { useEffect, useState } from "react";
import TestModelViewer from "@/components/TestModelViewer";

interface ProductState {
  trellis_output?: {
    model_file?: string;
  };
  status?: string;
}

export default function Test3DPage() {
  const [modelUrl, setModelUrl] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLatestModel = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("http://localhost:8000/product");
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data: ProductState = await response.json();
        
        if (data.trellis_output?.model_file) {
          setModelUrl(data.trellis_output.model_file);
          setError(null);
        } else if (data.status === "generating_model" || data.status === "generating_images") {
          setError("Model is still generating. Please wait and refresh.");
        } else {
          setError("No 3D model found. Please run the test pipeline first.");
        }
      } catch (err) {
        console.error("Error fetching model:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch model");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLatestModel();
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden">
      <TestModelViewer
        modelUrl={modelUrl}
        isLoading={isLoading}
        error={error}
      />
    </div>
  );
}

