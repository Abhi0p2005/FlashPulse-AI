#!/usr/bin/env pwsh
# FlashPulse AI - Deployment Script for Windows (PowerShell)
param(
    [string]$AwsRegion = "us-east-1",
    [string]$EcrRepo = "flashpulse-ai",
    [string]$ImageTag = "latest"
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " FlashPulse AI - Docker Build & Push" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

$DockerImage = "flashpulse-ai:${ImageTag}"

Write-Host "`nStep 1: Build Docker image..." -ForegroundColor Yellow
docker build -t $DockerImage .

Write-Host "`nStep 2: (Optional) Tag & Push to AWS ECR" -ForegroundColor Yellow
try {
    $AccountId = aws sts get-caller-identity --query Account --output text
    $EcrUrl = "${AccountId}.dkr.ecr.${AwsRegion}.amazonaws.com/${EcrRepo}"

    Write-Host "Logging into ECR..." -ForegroundColor Yellow
    aws ecr get-login-password --region $AwsRegion | docker login --username AWS --password-stdin $EcrUrl

    Write-Host "Tagging image..." -ForegroundColor Yellow
    docker tag $DockerImage "${EcrUrl}:${ImageTag}"

    Write-Host "Pushing to ECR..." -ForegroundColor Yellow
    docker push "${EcrUrl}:${ImageTag}"

    Write-Host "`n=== Deploy to App Runner ===" -ForegroundColor Green
    Write-Host "Create an App Runner service from the ECR image at:" -ForegroundColor White
    Write-Host "  https://${AwsRegion}.console.aws.amazon.com/apprunner" -ForegroundColor White
    Write-Host "`nReference: apprunner.yaml in the repo root." -ForegroundColor White
}
catch {
    Write-Host "`nAWS CLI not configured. To deploy manually:" -ForegroundColor Yellow
    Write-Host "  1. Upload the Docker image to a registry (ECR, Docker Hub)" -ForegroundColor White
    Write-Host "  2. Create an App Runner service pointing to your image" -ForegroundColor White
    Write-Host "  3. Set environment variables in App Runner console" -ForegroundColor White
    Write-Host "`nTest locally with: docker run -p 8000:8000 ${DockerImage}" -ForegroundColor White
}
