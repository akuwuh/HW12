# Vril — AI-Powered Product Design Studio

**One-Liner:** Vril lets anyone become a physical product designer with the help of AI.

## The Problem

Designing physical products is slow, expensive, and requires specialized skills.

Even designing simple items like a mug, water bottle, or shoe box needs:
- 3D modeling software knowledge
- Iteration cycles
- Hours of manual work

Most people with ideas—event organizers, small businesses, artists, non-profits—don't have the expertise or time to create satisfying product designs. Traditional tools prevent everyday people from tapping into their creative potential.

## The Solution

Vril is a product design studio that creates and iterates 3D products + packaging just from plain English.

**Step 1:** Users describe or upload references, and Vril generates a fully editable 3D product model.

**Step 2:** A built-in editor with a Cursor-style chatbot lets users iterate the shape, form, and material of the product through simple prompts.

**Step 3:** Users design packaging with the help of AI. With editable textures, dielines, artwork, and dimensions, all controlled through AI.

**Step 4:** Vril allows users to export the finished designs in various file formats.

**Vril turns anyone into a product designer.**

## Example Use Case

Imagine the Hack Western organizers want to create custom swag, like a Hack Western Cup. But:
- They don't know 3D design
- They don't have time
- Hiring a designer is slow and expensive

With Vril, they simply type:

> "Create a ceramic mug with a matte black finish and a Hack Western 12 logo → Make the handle thicker."

Vril instantly generates the 3D mug, lets them iterate the shape and prints, and designs the packaging for it.

**They get a real product design in minutes—not days.**

Making product design accessible and easy for all.

---

## Technical Architecture

### Frontend (Next.js + React)
- **Framework:** Next.js 14 with TypeScript
- **3D Rendering:** Three.js + React Three Fiber for interactive product visualization
- **UI:** Tailwind CSS with shadcn/ui components
- **Key Features:**
  - Real-time 3D product viewer with material controls
  - Interactive packaging editor with live dieline visualization
  - AI chat interface for iterative design modifications
  - Texture cache system for optimized image loading

### Backend (FastAPI + Python)
- **Framework:** FastAPI with async support
- **AI Integration:** Google Gemini for image generation and design iteration
- **State Management:** Persistent packaging state with atomic updates
- **Key Services:**
  - `panel_generation.py`: Parallelized texture generation for packaging panels
  - `panel_prompt_templates.py`: Structured prompt engineering with guardrails
  - `product_generation.py`: 3D product model creation and iteration
  - `dieline_generation.py`: SVG dieline generation for packaging templates

### Codebase Structure

```
vril/
├── frontend/
│   ├── app/                    # Next.js pages and routes
│   │   ├── packaging/          # Packaging design interface
│   │   └── products/           # Product creation interface
│   ├── components/             # React components
│   │   ├── package-viewer-3d.tsx    # 3D packaging preview
│   │   ├── dieline-editor.tsx       # Interactive dieline editor
│   │   └── AIChatPanel.tsx          # Cursor-style AI chat
│   ├── hooks/                  # Custom React hooks
│   │   └── usePanelTexture.ts       # Texture loading and caching
│   └── lib/                    # API clients and utilities
│
├── backend/
│   ├── app/
│   │   ├── endpoints/          # API routes
│   │   │   ├── packaging/      # Packaging generation endpoints
│   │   │   └── products/       # Product generation endpoints
│   │   ├── services/           # Business logic
│   │   │   ├── panel_generation.py          # Texture generation
│   │   │   ├── panel_prompt_templates.py    # Prompt engineering
│   │   │   └── product_generation.py        # 3D model generation
│   │   ├── models/             # Data models and state management
│   │   └── integrations/       # External API integrations (Gemini)
│   └── main.py                 # FastAPI app entry point
│
└── docs/                       # Technical documentation
```

### Key Technical Innovations

1. **Two-Phase Parallelized Generation:**
   - Phase 1: Generate single 3D mockup of entire package
   - Phase 2: Extract all panel textures simultaneously using `asyncio.gather()`
   - Result: 6x faster generation with consistent design across panels

2. **Structured Prompt Engineering:**
   - Template-based prompts with validation and guardrails
   - Context-aware generation for create vs. edit workflows
   - Full-bleed edge-to-edge design requirements

3. **Persistent State with Atomic Updates:**
   - Multi-shape state management (box/cylinder)
   - Atomic texture updates to prevent race conditions
   - Texture persistence during regeneration

4. **Interactive 3D Workflow:**
   - Real-time material and texture preview
   - Live dieline editing with dimension arcs
   - Texture cache for instant switching between designs

---

## Getting Started

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will run at `http://localhost:3000`

### Backend Setup

**Local Development:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

**Docker:**
```bash
cd backend
docker-compose up --build
```

The backend API will run at `http://localhost:8000`

### Environment Variables

Create a `.env` file in the backend directory:
```
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## Tech Stack

- **Frontend:** Next.js, React, TypeScript, Three.js, Tailwind CSS
- **Backend:** FastAPI, Python, asyncio
- **AI:** Google Gemini (image generation)
- **3D:** React Three Fiber, Three.js
- **State:** React hooks, FastAPI state management

