from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from trellis import trellis_service

app = FastAPI()

class TrellisRequest(BaseModel):
    images: List[str]
    seed: int = 1337
    randomize_seed: bool = False
    texture_size: int = 2048
    mesh_simplify: float = 0.96
    generate_color: bool = True
    generate_normal: bool = False
    generate_model: bool = True
    save_gaussian_ply: bool = False
    return_no_background: bool = True
    ss_sampling_steps: int = 26
    ss_guidance_strength: float = 8.0
    slat_sampling_steps: int = 26
    slat_guidance_strength: float = 3.2

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.get("/items/{item_id}")
def read_item(item_id: int, q: str = None):
    return {"item_id": item_id, "q": q}

@app.post("/generate-3d")
def generate_3d(request: TrellisRequest):
    try:
        result = trellis_service.generate_3d_asset(
            images=request.images,
            seed=request.seed,
            randomize_seed=request.randomize_seed,
            texture_size=request.texture_size,
            mesh_simplify=request.mesh_simplify,
            generate_color=request.generate_color,
            generate_normal=request.generate_normal,
            generate_model=request.generate_model,
            save_gaussian_ply=request.save_gaussian_ply,
            return_no_background=request.return_no_background,
            ss_sampling_steps=request.ss_sampling_steps,
            ss_guidance_strength=request.ss_guidance_strength,
            slat_sampling_steps=request.slat_sampling_steps,
            slat_guidance_strength=request.slat_guidance_strength
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
