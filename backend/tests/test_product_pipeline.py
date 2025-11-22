import sys
from pathlib import Path
import asyncio

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.models.product_state import (
    ProductState,
    ProductStatus,
    TrellisArtifacts,
    clear_product_state,
    get_product_state,
    get_product_status,
    save_product_state,
    save_product_status,
)
from app.services.product_pipeline import product_pipeline_service
from app.integrations import gemini


@pytest.mark.asyncio
async def test_create_flow_persists_assets(monkeypatch):
    """The create pipeline should persist images, trellis output, and status."""
    clear_product_state()
    save_product_status(ProductStatus())

    sample_images = ["image-a", "image-b", "image-c"]
    sample_trellis = {
        "model_file": "https://cdn.local/model.glb",
        "color_video": "https://cdn.local/color.mp4",
        "no_background_images": ["https://cdn.local/nobg.png"],
    }

    async def fake_generate_views(prompt, reference_images=None, image_count=3, thinking_level=None):
        await asyncio.sleep(0)
        assert reference_images is None
        assert prompt == "New speaker concept"
        assert image_count == 3
        return sample_images

    async def fake_generate_trellis(images):
        await asyncio.sleep(0)
        assert images == sample_images
        return sample_trellis

    monkeypatch.setattr(gemini.gemini_image_service, "generate_product_images", fake_generate_views)
    monkeypatch.setattr(product_pipeline_service, "_generate_trellis_model", fake_generate_trellis)

    await product_pipeline_service.run_create("New speaker concept", image_count=3)

    state = get_product_state()
    status = get_product_status()

    assert state.prompt == "New speaker concept"
    assert state.trellis_output is not None
    assert state.trellis_output.model_file == sample_trellis["model_file"]
    assert len(state.iterations) == 1
    assert state.iterations[0].type == "create"
    assert status.status == "complete"
    assert status.model_file == sample_trellis["model_file"]
    assert not state.in_progress


@pytest.mark.asyncio
async def test_edit_flow_uses_previous_images(monkeypatch):
    clear_product_state()
    base_state = ProductState(
        prompt="Base bottle",
        images=["existing-image"],
        status="complete",
        mode="create",
    )
    save_product_state(base_state)
    save_product_status(ProductStatus(status="complete", progress=100))

    updated_images = ["edit-1", "edit-2", "edit-3"]
    trellis_data = TrellisArtifacts(model_file="https://cdn.local/new.glb").model_dump(mode="json")

    async def fake_generate_views(prompt, reference_images=None, image_count=3, thinking_level=None):
        await asyncio.sleep(0)
        assert prompt == "Add metallic label"
        assert reference_images == ["existing-image"]
        return updated_images

    async def fake_generate_trellis(images):
        await asyncio.sleep(0)
        assert images == updated_images
        return trellis_data

    monkeypatch.setattr(gemini.gemini_image_service, "generate_product_images", fake_generate_views)
    monkeypatch.setattr(product_pipeline_service, "_generate_trellis_model", fake_generate_trellis)

    await product_pipeline_service.run_edit("Add metallic label")

    state = get_product_state()
    status = get_product_status()

    assert len(state.iterations) == 1
    assert state.iterations[0].type == "edit"
    assert state.trellis_output.model_file == trellis_data["model_file"]
    assert status.status == "complete"
    assert status.model_file == trellis_data["model_file"]

