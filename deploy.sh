#!/usr/bin/env bash
# FlashPulse AI - Deployment Script for Linux/Mac
# Uses Docker to build and optionally push to AWS ECR + App Runner
set -euo pipefail

echo "============================================"
echo " FlashPulse AI - Docker Build & Push"
echo "============================================"

# --- Configuration ---
# Set these or pass as env vars
AWS_REGION="${AWS_REGION:-us-east-1}"
ECR_REPO="${ECR_REPO:-flashpulse-ai}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
DOCKER_IMAGE="flashpulse-ai:${IMAGE_TAG}"

echo ""
echo "Step 1: Build Docker image..."
docker build -t "${DOCKER_IMAGE}" .

echo ""
echo "Step 2: (Optional) Tag & Push to AWS ECR"
if command -v aws &> /dev/null && aws sts get-caller-identity &> /dev/null; then
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    ECR_URL="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}"

    echo "Logging into ECR..."
    aws ecr get-login-password --region "${AWS_REGION}" | \
        docker login --username AWS --password-stdin "${ECR_URL}"

    echo "Tagging image..."
    docker tag "${DOCKER_IMAGE}" "${ECR_URL}:${IMAGE_TAG}"

    echo "Pushing to ECR..."
    docker push "${ECR_URL}:${IMAGE_TAG}"

    echo ""
    echo "=== Deploy to App Runner ==="
    echo "Create an App Runner service from the ECR image at:"
    echo "  https://${AWS_REGION}.console.aws.amazon.com/apprunner"
    echo ""
    echo "Use the apprunner.yaml in this repo as a configuration reference."
    echo "Set environment variables & secrets (GEMINI_API_KEY, etc.) in the"
    echo "App Runner console under 'Environment variables'."
else
    echo ""
    echo "AWS CLI not configured. To deploy manually:"
    echo "  1. Upload the Docker image to a registry (ECR, Docker Hub)"
    echo "  2. Create an App Runner service pointing to your image"
    echo "  3. Set environment variables in App Runner console"
    echo ""
    echo "Test locally with: docker run -p 8000:8000 ${DOCKER_IMAGE}"
fi
