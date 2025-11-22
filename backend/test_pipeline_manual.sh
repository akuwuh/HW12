#!/bin/bash
# Manual end-to-end test script for product pipeline
# Usage: 
#   ./test_pipeline_manual.sh                    # Use default (gemini-3-pro-image-preview)
#   USE_FLASH=1 ./test_pipeline_manual.sh        # Use gemini-2.0-flash-exp with 1K images

set -e

# Model configuration
if [ "$USE_FLASH" = "1" ]; then
  export GEMINI_IMAGE_MODEL="gemini-2.5-flash-exp"
  export GEMINI_IMAGE_SIZE="1K"
  export GEMINI_THINKING_LEVEL=""
  echo "🔧 Using Flash 2.0 model (1K images, no thinking)"
else
  export GEMINI_IMAGE_MODEL="${GEMINI_IMAGE_MODEL:-gemini-3-pro-image-preview}"
  export GEMINI_IMAGE_SIZE="${GEMINI_IMAGE_SIZE:-4K}"
  export GEMINI_THINKING_LEVEL="${GEMINI_THINKING_LEVEL:-low}"
  echo "🔧 Using Gemini 3 Pro model (${GEMINI_IMAGE_SIZE} images, thinking: ${GEMINI_THINKING_LEVEL})"
fi

# Restart backend with new env vars
echo "♻️  Restarting backend with updated config..."
docker compose -f backend/docker-compose.yml down
GEMINI_IMAGE_MODEL=$GEMINI_IMAGE_MODEL \
GEMINI_IMAGE_SIZE=$GEMINI_IMAGE_SIZE \
GEMINI_THINKING_LEVEL=$GEMINI_THINKING_LEVEL \
  docker compose -f backend/docker-compose.yml up -d fastapi_app

sleep 3

echo "🧹 Clearing Redis state..."
docker compose -f backend/docker-compose.yml exec redis redis-cli FLUSHDB

echo "🚀 Starting /create flow..."
curl -X POST http://localhost:8000/product/create \
  -H "Content-Type: application/json" \
  -d '{"prompt": "sleek reusable water bottle with engraved logo, hero product shot", "image_count": 3}' \
  | jq

echo ""
echo "⏳ Polling status every 5 seconds (Gemini takes ~30s, Trellis takes 3-5 min)..."
echo "Press Ctrl+C to stop polling"
echo ""

while true; do
  STATUS=$(curl -s http://localhost:8000/product/status | jq -r '.status')
  PROGRESS=$(curl -s http://localhost:8000/product/status | jq -r '.progress')
  MESSAGE=$(curl -s http://localhost:8000/product/status | jq -r '.message')
  
  echo "[$(date +%H:%M:%S)] Status: $STATUS | Progress: $PROGRESS% | $MESSAGE"
  
  if [ "$STATUS" = "complete" ] || [ "$STATUS" = "error" ]; then
    echo ""
    echo "✅ Pipeline finished!"
    curl -s http://localhost:8000/product | jq
    
    echo ""
    echo "📁 Check artifacts at: backend/tests/artifacts/"
    ls -ltrh backend/tests/artifacts/
    break
  fi
  
  sleep 5
done

