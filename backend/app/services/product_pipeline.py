from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List, Optional

from app.integrations.trellis import trellis_service
from app.integrations.gemini import gemini_image_service
from app.models.product_state import (
    ProductIteration,
    ProductState,
    ProductStatus,
    TrellisArtifacts,
    get_product_state,
    get_product_status,
    save_product_state,
    save_product_status,
)
from app.core.config import settings

logger = logging.getLogger(__name__)


class ProductPipelineService:
    """Runs the create/edit pipeline for the single in-memory product session."""

    def __init__(self) -> None:
        self._default_image_count = 3
        self._thinking_level = settings.GEMINI_THINKING_LEVEL

    async def run_create(self, prompt: str, image_count: Optional[int] = None) -> None:
        """Execute the create pipeline end-to-end."""
        logger.info("[product-pipeline] Starting create flow")
        state = get_product_state()
        state.prompt = prompt
        state.mode = "create"
        state.image_count = image_count or state.image_count or self._default_image_count
        await self._execute_flow(state, prompt, mode="create")

    async def run_edit(self, instruction: str) -> None:
        """Execute the edit pipeline (assumes base assets exist)."""
        logger.info("[product-pipeline] Starting edit flow")
        state = get_product_state()
        if not state.prompt:
            raise RuntimeError("Cannot edit before creating an initial product")
        state.mode = "edit"
        state.latest_instruction = instruction
        await self._execute_flow(state, instruction, mode="edit")

    async def _execute_flow(self, state: ProductState, instruction: str, mode: str) -> None:
        try:
            state.in_progress = True
            state.mark_progress("generating_images", "Generating concept images")
            save_product_state(state)
            self._update_status(
                ProductStatus(
                    status="generating_images",
                    progress=10,
                    message="Generating concept images",
                )
            )

            reference_images = state.images if mode == "edit" else None
            images = await gemini_image_service.generate_product_images(
                prompt=instruction,
                image_count=state.image_count or self._default_image_count,
                reference_images=reference_images,
                thinking_level=self._thinking_level,
            )
            if not images:
                raise RuntimeError("Gemini image pipeline returned no images")
            state.images = images
            save_product_state(state)

            state.mark_progress("generating_model", "Generating 3D model with Trellis")
            save_product_state(state)
            self._update_status(
                ProductStatus(
                    status="generating_model",
                    progress=45,
                    message="Generating 3D model with Trellis",
                )
            )

            trellis_output = await self._generate_trellis_model(images)
            artifacts = TrellisArtifacts.model_validate(trellis_output)
            iteration = ProductIteration(
                type=mode, prompt=instruction, images=images, trellis_output=artifacts
            )
            state.trellis_output = artifacts
            state.iterations.append(iteration)
            state.mark_complete("3D asset generated")
            save_product_state(state)

            preview = self._determine_preview_image(state)
            self._update_status(
                ProductStatus(
                    status="complete",
                    progress=100,
                    message="3D asset generated",
                    model_file=artifacts.model_file,
                    preview_image=preview,
                )
            )
            logger.info("[product-pipeline] %s flow complete", mode)
        except Exception as exc:
            logger.exception("Product pipeline failed: %s", exc)
            state.mark_error(str(exc))
            save_product_state(state)
            self._update_status(
                ProductStatus(
                    status="error",
                    progress=0,
                    message="Pipeline failed",
                    error=str(exc),
                )
            )

    async def _generate_trellis_model(self, images: List[str]) -> Dict[str, Any]:
        """Call Trellis via the existing integration in a background thread."""
        return await asyncio.to_thread(
            trellis_service.generate_3d_asset,
            images=images,
        )

    def _determine_preview_image(self, state: ProductState) -> Optional[str]:
        if state.trellis_output and state.trellis_output.no_background_images:
            return state.trellis_output.no_background_images[0]
        if state.images:
            return state.images[0]
        return None

    def _update_status(self, status: ProductStatus) -> None:
        """Persist the lightweight status payload."""
        payload = get_product_status()
        payload.status = status.status
        payload.progress = status.progress
        payload.message = status.message
        payload.error = status.error
        payload.model_file = status.model_file or payload.model_file
        payload.preview_image = status.preview_image or payload.preview_image
        payload.updated_at = status.updated_at
        save_product_status(payload)


product_pipeline_service = ProductPipelineService()


