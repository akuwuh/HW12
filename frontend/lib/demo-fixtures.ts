/**
 * Demo fixtures loader for frontend-only demo mode.
 * 
 * This module provides pre-configured ProductState and ProductStatus
 * from demo_fixtures.json without requiring backend calls.
 * 
 * Enable with: NEXT_PUBLIC_DEMO_MODE=frontend
 */

import { ProductState, ProductStatus, ProductIteration, TrellisArtifacts } from "./product-types";
import type { PackagingState, PanelTexture } from "./packaging-types";

// Demo fixture data - embedded directly to avoid runtime file reads
// These values come from backend/demo_fixtures.json
const DEMO_FIXTURES = {
  product_create: {
    prompt: "Create a Lego Donkey Kong Labubu",
    model_url: "/demo_create.glb",  // Local file in public/
    preview_images: ["/labubudklego.jpeg"],
    no_background_images: [] as string[],
  },
  product_edit: {
    prompt: "Make it performative",
    model_url: "/demo_edit.glb",  // Local file in public/
    preview_images: ["/labubu_edit.jpeg"],
    no_background_images: [] as string[],
  },
};

// Simple stable IDs for demo mode caching - version suffix forces cache refresh
const DEMO_CREATE_ITERATION_ID = "demo_create_v2";
const DEMO_EDIT_ITERATION_ID = "demo_edit_v2";

/**
 * Get demo product state showing the "create" result.
 * Returns a fully-formed ProductState matching backend schema.
 */
export function getDemoProductState(): ProductState {
  const now = new Date().toISOString();
  const createFixture = DEMO_FIXTURES.product_create;
  
  const trellisOutput: TrellisArtifacts = {
    model_file: createFixture.model_url,
    no_background_images: createFixture.no_background_images,
  };
  
  const createIteration: ProductIteration = {
    id: DEMO_CREATE_ITERATION_ID,
    type: "create",
    prompt: createFixture.prompt,
    images: createFixture.preview_images,
    trellis_output: trellisOutput,
    created_at: now,
    note: "Demo fixture - pre-loaded for presentation",
  };
  
  return {
    prompt: createFixture.prompt,
    mode: "idle",
    status: "complete",
    message: "Demo product loaded",
    in_progress: false,
    image_count: createFixture.preview_images.length,
    images: createFixture.preview_images,
    trellis_output: trellisOutput,
    iterations: [createIteration],
    created_at: now,
    updated_at: now,
  };
}

/**
 * Get demo product status (for polling endpoint simulation).
 */
export function getDemoProductStatus(): ProductStatus {
  const createFixture = DEMO_FIXTURES.product_create;
  
  return {
    status: "complete",
    progress: 100,
    message: "Demo product ready",
    model_file: createFixture.model_url,
    preview_image: createFixture.preview_images[0],
    updated_at: new Date().toISOString(),
  };
}

/**
 * Get demo product state showing the "edit" result.
 * Includes both create and edit iterations for full history.
 */
export function getDemoProductStateAfterEdit(): ProductState {
  const now = new Date().toISOString();
  const createFixture = DEMO_FIXTURES.product_create;
  const editFixture = DEMO_FIXTURES.product_edit;
  
  const createTrellisOutput: TrellisArtifacts = {
    model_file: createFixture.model_url,
    no_background_images: createFixture.no_background_images,
  };
  
  const editTrellisOutput: TrellisArtifacts = {
    model_file: editFixture.model_url,
    no_background_images: editFixture.no_background_images,
  };
  
  const createIteration: ProductIteration = {
    id: DEMO_CREATE_ITERATION_ID,
    type: "create",
    prompt: createFixture.prompt,
    images: createFixture.preview_images,
    trellis_output: createTrellisOutput,
    created_at: now,
    note: "Demo fixture - pre-loaded for presentation",
  };
  
  const editIteration: ProductIteration = {
    id: DEMO_EDIT_ITERATION_ID,
    type: "edit",
    prompt: editFixture.prompt,
    images: editFixture.preview_images,
    trellis_output: editTrellisOutput,
    created_at: now,
    note: "Demo fixture - edit result",
  };
  
  return {
    prompt: createFixture.prompt,
    latest_instruction: editFixture.prompt,
    mode: "idle",
    status: "complete",
    message: "Demo product (edited) loaded",
    in_progress: false,
    image_count: editFixture.preview_images.length,
    images: editFixture.preview_images,
    trellis_output: editTrellisOutput,
    iterations: [createIteration, editIteration],
    created_at: now,
    updated_at: now,
  };
}

/**
 * Check if frontend demo mode is enabled.
 */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "frontend";
}

// ============= PRODUCT DEMO STATE =============

// Duration constants - adjust these to change mock loading times
const DEMO_CREATE_DURATION_MS = 6000; // 6 seconds for demo create
const DEMO_EDIT_DURATION_MS = 3000; // 3 seconds for demo edit

// Track whether demo product has been "created"
let demoProductCreated = false;

// Track whether demo product has been "edited"
let demoProductEdited = false;

// Track demo create in progress (with start time for progress simulation)
let demoCreateStartTime: number | null = null;

// Track demo edit in progress (with start time for progress simulation)
let demoEditStartTime: number | null = null;

/**
 * Check if demo product has been "edited"
 */
export function isDemoProductEdited(): boolean {
  return demoProductEdited;
}

/**
 * Mark demo product as edited (after mock edit completes)
 */
export function setDemoProductEdited(edited: boolean): void {
  demoProductEdited = edited;
}

/**
 * Reset demo product state (for clear/reset)
 */
export function resetDemoProduct(): void {
  demoProductCreated = false;
  demoProductEdited = false;
  demoCreateStartTime = null;
  demoEditStartTime = null;
}

// ============= DEMO CREATE FUNCTIONS =============

/**
 * Check if demo product has been "created"
 */
export function isDemoProductCreated(): boolean {
  return demoProductCreated;
}

/**
 * Start a demo create (begins progress simulation)
 */
export function startDemoCreate(): void {
  demoCreateStartTime = Date.now();
  demoProductCreated = false;
}

/**
 * Check if a demo create is in progress
 */
export function isDemoCreateInProgress(): boolean {
  return demoCreateStartTime !== null && !demoProductCreated;
}

/**
 * Get demo create progress (0-100) and check if complete
 * Returns { progress, isComplete, message }
 */
export function getDemoCreateProgress(): { progress: number; isComplete: boolean; message: string } {
  if (!demoCreateStartTime) {
    return { progress: 0, isComplete: false, message: "Not started" };
  }
  
  const elapsed = Date.now() - demoCreateStartTime;
  const progress = Math.min(100, Math.floor((elapsed / DEMO_CREATE_DURATION_MS) * 100));
  
  if (progress >= 100) {
    // Mark as complete and created
    demoProductCreated = true;
    demoCreateStartTime = null;
    return { progress: 100, isComplete: true, message: "Demo create complete!" };
  }
  
  // Progress messages for create
  const messages = [
    "Analyzing prompt...",
    "Generating concept images...",
    "Refining details...",
    "Building 3D model...",
    "Finalizing product...",
  ];
  const messageIndex = Math.min(Math.floor(progress / 20), messages.length - 1);
  
  return { progress, isComplete: false, message: messages[messageIndex] };
}

// ============= DEMO EDIT FUNCTIONS =============

/**
 * Start a demo edit (begins progress simulation)
 */
export function startDemoEdit(): void {
  demoEditStartTime = Date.now();
  demoProductEdited = false;
}

/**
 * Check if a demo edit is in progress
 */
export function isDemoEditInProgress(): boolean {
  return demoEditStartTime !== null && !demoProductEdited;
}

/**
 * Get demo edit progress (0-100) and check if complete
 * Returns { progress, isComplete, message }
 */
export function getDemoEditProgress(): { progress: number; isComplete: boolean; message: string } {
  if (!demoEditStartTime) {
    return { progress: 0, isComplete: false, message: "Not started" };
  }
  
  const elapsed = Date.now() - demoEditStartTime;
  const progress = Math.min(100, Math.floor((elapsed / DEMO_EDIT_DURATION_MS) * 100));
  
  if (progress >= 100) {
    // Mark as complete and edited
    demoProductEdited = true;
    demoEditStartTime = null;
    return { progress: 100, isComplete: true, message: "Demo edit complete!" };
  }
  
  // Progress messages
  const messages = [
    "Analyzing edit request...",
    "Generating new variations...",
    "Processing images...",
    "Building 3D model...",
    "Finalizing edit...",
  ];
  const messageIndex = Math.min(Math.floor(progress / 20), messages.length - 1);
  
  return { progress, isComplete: false, message: messages[messageIndex] };
}

// ============= PACKAGING DEMO FIXTURES =============

// Demo packaging textures - these are the final panel images
const DEMO_PACKAGING_TEXTURES = {
  front: "/demo_pkg_front.jpg",
  back: "/demo_pkg_back.jpg",
  left: "/demo_pkg_left.jpg",
  right: "/demo_pkg_right.jpg",
  top: "/demo_pkg_top.jpg",
  bottom: "/demo_pkg_bottom.jpg",
};

// Track demo packaging state (textures loaded or not)
let demoPackagingGenerated = false;

/**
 * Get empty packaging state for demo mode (before generation).
 * Box has no textures initially.
 */
export function getDemoPackagingStateEmpty(): PackagingState {
  const now = new Date().toISOString();
  const dimensions = { width: 100, height: 150, depth: 100 };
  return {
    current_package_type: "box",
    box_state: {
      dimensions,
      panel_textures: {},
    },
    cylinder_state: {
      dimensions: { width: 80, height: 150, depth: 80 },
      panel_textures: {},
    },
    in_progress: false,
    generating_panel: null,
    generating_panels: [],
    bulk_generation_in_progress: false,
    last_error: null,
    created_at: now,
    updated_at: now,
    export_files: {},
    dieline_export_files: {},
    // Backward compatibility properties
    package_type: "box",
    package_dimensions: dimensions,
    panel_textures: {},
  };
}

/**
 * Get packaging state with demo textures loaded (after generation).
 */
export function getDemoPackagingStateWithTextures(): PackagingState {
  const now = new Date().toISOString();
  const dimensions = { width: 100, height: 150, depth: 100 };
  
  const panelTextures: Record<string, PanelTexture> = {};
  for (const [panelId, textureUrl] of Object.entries(DEMO_PACKAGING_TEXTURES)) {
    panelTextures[panelId] = {
      panel_id: panelId,
      texture_url: textureUrl,
      prompt: `Demo ${panelId} panel`,
      generated_at: now,
      dimensions: { width: 100, height: 150 },
    };
  }
  
  return {
    current_package_type: "box",
    box_state: {
      dimensions,
      panel_textures: panelTextures,
    },
    cylinder_state: {
      dimensions: { width: 80, height: 150, depth: 80 },
      panel_textures: {},
    },
    in_progress: false,
    generating_panel: null,
    generating_panels: [],
    bulk_generation_in_progress: false,
    last_error: null,
    created_at: now,
    updated_at: now,
    export_files: {},
    dieline_export_files: {},
    // Backward compatibility properties
    package_type: "box",
    package_dimensions: dimensions,
    panel_textures: panelTextures,
  };
}

/**
 * Check if demo packaging has been "generated"
 */
export function isDemoPackagingGenerated(): boolean {
  return demoPackagingGenerated;
}

/**
 * Mark demo packaging as generated (after mock loading completes)
 */
export function setDemoPackagingGenerated(generated: boolean): void {
  demoPackagingGenerated = generated;
}

/**
 * Reset demo packaging state (for Reset button)
 */
export function resetDemoPackaging(): void {
  demoPackagingGenerated = false;
}



