import { ProductState, ProductStatus } from "@/lib/product-types";
import { 
  getDemoProductState, 
  getDemoProductStatus, 
  getDemoProductStateAfterEdit,
  isDemoMode,
  isDemoProductEdited,
  resetDemoProduct,
  startDemoEdit,
  isDemoEditInProgress,
  getDemoEditProgress,
  startDemoCreate,
  isDemoCreateInProgress,
  getDemoCreateProgress,
} from "./demo-fixtures";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Frontend demo mode - hydrate from fixtures without backend calls
const DEMO_FRONTEND = isDemoMode();

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage: string;
    const contentType = response.headers.get("content-type");
    
    try {
      if (contentType?.includes("application/json")) {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
      } else {
        errorMessage = await response.text();
      }
    } catch (e) {
      errorMessage = `Request failed with status ${response.status}`;
    }
    
    // Provide user-friendly messages for common errors
    if (response.status === 409 && errorMessage.includes("Generation already running")) {
      errorMessage = "A product generation is already in progress. Please wait for it to complete or use the recover option.";
    }
    
    throw new Error(errorMessage || `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function createProduct(prompt: string, imageCount: number = 1): Promise<ProductStatus> {
  // Demo mode: simulate create with mock delay
  if (DEMO_FRONTEND) {
    console.log("[Demo Mode] 🎭 Starting mock create for prompt:", prompt);
    // Start the demo create timer
    startDemoCreate();
    // Return immediately with "in_progress" status - polling will handle the rest
    return {
      status: "in_progress",
      progress: 0,
      message: "Demo create starting...",
      updated_at: new Date().toISOString(),
    };
  }
  
  const response = await fetch(`${API_BASE}/product/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, image_count: imageCount }),
  });

  return handleResponse(response);
}

export async function editProduct(prompt: string): Promise<ProductStatus> {
  // Demo mode: simulate edit with mock delay
  if (DEMO_FRONTEND) {
    console.log("[Demo Mode] 🎭 Starting mock edit for prompt:", prompt);
    // Start the demo edit timer
    startDemoEdit();
    // Return immediately with "in_progress" status - polling will handle the rest
    return {
      status: "in_progress",
      progress: 0,
      message: "Demo edit starting...",
      updated_at: new Date().toISOString(),
    };
  }
  
  const response = await fetch(`${API_BASE}/product/edit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  return handleResponse(response);
}

export async function getProductState(): Promise<ProductState> {
  if (DEMO_FRONTEND) {
    // Return edited state if edit has completed
    if (isDemoProductEdited()) {
      console.log("[Demo Mode] 🎭 Returning demo product state AFTER EDIT from fixtures");
      return getDemoProductStateAfterEdit();
    }
    console.log("[Demo Mode] 🎭 Returning demo product state from fixtures");
    return getDemoProductState();
  }
  const response = await fetch(`${API_BASE}/product`);
  return handleResponse<ProductState>(response);
}

export async function getProductStatus(): Promise<ProductStatus> {
  if (DEMO_FRONTEND) {
    // Check if demo create is in progress
    if (isDemoCreateInProgress()) {
      const { progress, isComplete, message } = getDemoCreateProgress();
      console.log("[Demo Mode] 🎭 Create progress:", progress, isComplete ? "(complete)" : "");
      
      if (isComplete) {
        // Return complete status with model
        const createFixture = getDemoProductState();
        return {
          status: "complete",
          progress: 100,
          message: "Demo create complete!",
          model_file: createFixture.trellis_output?.model_file,
          preview_image: createFixture.images?.[0],
          updated_at: new Date().toISOString(),
        };
      }
      
      return {
        status: "in_progress",
        progress,
        message,
        updated_at: new Date().toISOString(),
      };
    }
    
    // Check if demo edit is in progress
    if (isDemoEditInProgress()) {
      const { progress, isComplete, message } = getDemoEditProgress();
      console.log("[Demo Mode] 🎭 Edit progress:", progress, isComplete ? "(complete)" : "");
      
      if (isComplete) {
        // Return complete status with new model
        const editFixture = getDemoProductStateAfterEdit();
        return {
          status: "complete",
          progress: 100,
          message: "Demo edit complete!",
          model_file: editFixture.trellis_output?.model_file,
          preview_image: editFixture.images?.[0],
          updated_at: new Date().toISOString(),
        };
      }
      
      return {
        status: "in_progress",
        progress,
        message,
        updated_at: new Date().toISOString(),
      };
    }
    
    console.log("[Demo Mode] 🎭 Returning demo product status from fixtures");
    return getDemoProductStatus();
  }
  const response = await fetch(`${API_BASE}/product/status`);
  return handleResponse<ProductStatus>(response);
}

export async function rewindProduct(
  iterationIndex: number,
): Promise<{ status: string; iteration_index: number; total_iterations: number }> {
  // Demo mode: simulate rewind
  if (DEMO_FRONTEND) {
    console.log("[Demo Mode] 🎭 Rewinding to iteration:", iterationIndex);
    // Reset edit state if rewinding to before the edit
    if (iterationIndex === 0) {
      resetDemoProduct();
    }
    return {
      status: "success",
      iteration_index: iterationIndex,
      total_iterations: isDemoProductEdited() ? 2 : 1,
    };
  }
  
  const response = await fetch(`${API_BASE}/product/rewind/${iterationIndex}`, {
    method: "POST",
  });
  return handleResponse(response);
}

export async function recoverProductState(): Promise<{ recovered: boolean; message?: string }> {
  if (DEMO_FRONTEND) {
    console.log("[Demo Mode] 🎭 Recovery not needed - using fixtures");
    return { recovered: false, message: "Demo mode - no recovery needed" };
  }
  const response = await fetch(`${API_BASE}/product/recover`, {
    method: "POST",
  });
  return handleResponse(response);
}

export async function exportProductFormats(): Promise<{ status: string; files: Record<string, string> }> {
  const response = await fetch(`${API_BASE}/product/export`, {
    method: "POST",
  });
  return handleResponse(response);
}

export async function downloadProductExport(format: "blend" | "stl" | "jpg"): Promise<Blob> {
  const response = await fetch(`${API_BASE}/product/export/${format}`);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed with status ${response.status}`);
  }
  return response.blob();
}

export async function clearProductState(): Promise<{ message: string; state: ProductState }> {
  // Demo mode: reset to initial demo state
  if (DEMO_FRONTEND) {
    console.log("[Demo Mode] 🎭 Clearing product state (resetting demo)");
    resetDemoProduct();
    return {
      message: "Demo state cleared",
      state: getDemoProductState(),
    };
  }
  
  const response = await fetch(`${API_BASE}/product/clear`, {
    method: "POST",
  });
  return handleResponse(response);
}

