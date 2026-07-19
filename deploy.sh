#!/bin/bash
set -e

cd /home/ec2-user/FlashPulse-AI

git pull origin main

docker build -t flashpulse-ai .

CONTAINER_ID=$(docker ps -q --filter "ancestor=flashpulse-ai")
if [ -n "$CONTAINER_ID" ]; then
    docker kill "$CONTAINER_ID"
fi

docker run -d -p 8000:8000 --restart unless-stopped \
  -e LLM_PROVIDER=gemini \
  -e GEMINI_MODEL=gemini-2.5-flash \
  -e GEMINI_API_KEY="$GEMINI_API_KEY" \
  flashpulse-ai

echo "Deploy complete"
