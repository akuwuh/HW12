import base64
import json
import os
import sys
import time
import urllib.request
from pathlib import Path
from urllib.error import URLError, HTTPError
from typing import Optional

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from main import app
from app.core.config import settings

RUN_PRODUCT_E2E = (
    os.getenv("RUN_PRODUCT_E2E")
    or os.getenv("PYTEST_ADDOPTS") == "product-e2e"
    or os.getenv("RUN_PRODUCT_E2E_TESTS")
)
ENV_MISSING = [
    name
    for name, value in [
        ("GEMINI_API_KEY", settings.GEMINI_API_KEY),
        ("REPLICATE_API_KEY", settings.REPLICATE_API_KEY),
    ]
    if not value
]

ARTIFACT_ROOT = Path(__file__).parent / "artifacts"
ARTIFACT_ROOT.mkdir(exist_ok=True)


pytestmark = pytest.mark.skipif(
    not RUN_PRODUCT_E2E or ENV_MISSING,
    reason=(
        "Set RUN_PRODUCT_E2E=1 (in env or pytest.ini) and configure GEMINI_API_KEY/"
        "REPLICATE_API_KEY to run real create/edit integration tests"
    ),
)


@pytest.fixture(scope="module")
def api_client():
    return TestClient(app)


def _wait_for_completion(client: TestClient, timeout: int = 1200):
    deadline = time.time() + timeout
    while time.time() < deadline:
        status = client.get("/product/status").json()
        if status["status"] == "complete":
            return status
        if status["status"] == "error":
            raise AssertionError(f"Pipeline reported error: {status.get('message')}")
        time.sleep(5)
    raise TimeoutError("Timed out waiting for product pipeline to finish")


def _ensure_base_product(client: TestClient):
    state = client.get("/product").json()
    if state.get("trellis_output", {}).get("model_file"):
        return state
    client.post(
        "/product/create",
        json={
            "prompt": "matte black smart speaker with LED ring, clean studio lighting",
            "image_count": 3,
        },
    )
    _wait_for_completion(client)
    return client.get("/product").json()


def _persist_assets(state: dict, run_label: str):
    run_dir = ARTIFACT_ROOT / f"{run_label}_{int(time.time())}"
    run_dir.mkdir(parents=True, exist_ok=True)

    (run_dir / "state.json").write_text(json.dumps(state, indent=2))

    _save_image_assets(state.get("images") or [], run_dir / "gemini")

    trellis = state.get("trellis_output") or {}
    _download_if_url(trellis.get("model_file"), run_dir / "trellis_model.glb")
    _download_if_url(trellis.get("color_video"), run_dir / "trellis_color.mp4")
    _download_if_url(trellis.get("normal_video"), run_dir / "trellis_normal.mp4")
    _download_if_url(trellis.get("combined_video"), run_dir / "trellis_combined.mp4")
    no_bg = trellis.get("no_background_images") or []
    _save_image_assets(no_bg, run_dir / "trellis_no_bg")


def _save_image_assets(images, target_dir: Path):
    if not images:
        return
    target_dir.mkdir(parents=True, exist_ok=True)
    for idx, img in enumerate(images, start=1):
        dest = target_dir / f"image_{idx}.png"
        if isinstance(img, str) and img.startswith("data:image"):
            _write_data_url(img, dest)
        else:
            _download_if_url(img, dest)


def _write_data_url(data_url: str, dest: Path):
    try:
        header, b64_data = data_url.split(",", 1)
        mime = header.split(";")[0]
        extension = mime.split("/")[-1] if "/" in mime else "png"
        dest = dest.with_suffix(f".{extension}")
        dest.write_bytes(base64.b64decode(b64_data))
    except Exception as exc:  # noqa: BLE001
        print(f"[e2e] Failed to decode inline image: {exc}")


def _download_if_url(url: Optional[str], dest: Path):
    if not url:
        return
    try:
        with urllib.request.urlopen(url) as response:
            dest.write_bytes(response.read())
    except URLError as exc:
        print(f"[e2e] Failed to download {url}: {exc}")


def test_product_create_flow_real(api_client):
    import time
    start_time = time.time()
    
    print("\n" + "="*80)
    print("🧪 TEST: Product Create Flow")
    print("="*80)
    
    resp = api_client.post(
        "/product/create",
        json={
            "prompt": "sleek reusable water bottle with engraved logo, hero product shot",
            "image_count": 3,
        },
    )
    assert resp.status_code == 200, resp.text

    status = _wait_for_completion(api_client)
    assert status["status"] == "complete"
    assert status.get("model_file")

    state = api_client.get("/product").json()
    _persist_assets(state, "create")
    
    elapsed = time.time() - start_time
    model_url = state["trellis_output"]["model_file"]
    
    print(f"\n✅ CREATE FLOW COMPLETE")
    print(f"⏱️  Total time: {elapsed:.1f}s ({elapsed/60:.1f} minutes)")
    print(f"📦 Model file: {model_url[:80]}..." if len(model_url) > 80 else f"📦 Model file: {model_url}")
    print(f"🖼️  Images: {len(state['images'])} generated")
    print(f"📁 Artifacts saved to: backend/tests/artifacts/")
    print("="*80 + "\n")
    
    assert state["trellis_output"]["model_file"]
    assert len(state["images"]) == 3


def test_product_edit_flow_real(api_client):
    import time
    start_time = time.time()
    
    print("\n" + "="*80)
    print("🧪 TEST: Product Edit Flow")
    print("="*80)
    
    _ensure_base_product(api_client)

    resp = api_client.post(
        "/product/edit",
        json={"prompt": "add brushed aluminum accent ring and neon lighting details"},
    )
    assert resp.status_code == 200, resp.text

    status = _wait_for_completion(api_client)
    assert status["status"] == "complete"
    assert status.get("model_file")

    state = api_client.get("/product").json()
    _persist_assets(state, "edit")
    
    elapsed = time.time() - start_time
    model_url = state["trellis_output"]["model_file"]
    
    print(f"\n✅ EDIT FLOW COMPLETE")
    print(f"⏱️  Total time: {elapsed:.1f}s ({elapsed/60:.1f} minutes)")
    print(f"📦 Model file: {model_url[:80]}..." if len(model_url) > 80 else f"📦 Model file: {model_url}")
    print(f"🖼️  Total iterations: {len(state['iterations'])}")
    print(f"📁 Artifacts saved to: backend/tests/artifacts/")
    print("="*80 + "\n")
    
    assert state["iterations"][-1]["type"] == "edit"
    assert state["trellis_output"]["model_file"]

