#!/bin/bash
# =============================================================================
# Deploy SSR Server to Cloud Run
# =============================================================================

set -e

PROJECT_ID="quimeraai"
SERVICE_NAME="quimera-ssr"
REGION="us-central1"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "🚀 Deploying SSR Server to Cloud Run..."
echo "   Project: ${PROJECT_ID}"
echo "   Service: ${SERVICE_NAME}"
echo "   Region: ${REGION}"

# Build and push using Cloud Build
echo ""
echo "📦 Building Docker image with Cloud Build..."
gcloud builds submit \
  --project ${PROJECT_ID} \
  --tag ${IMAGE_NAME} \
  --dockerfile Dockerfile.ssr \
  .

# Deploy to Cloud Run
echo ""
echo "🌐 Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --project ${PROJECT_ID} \
  --image ${IMAGE_NAME} \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars "NODE_ENV=production"

# Get the service URL
echo ""
echo "✅ Deployment complete!"
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
  --project ${PROJECT_ID} \
  --region ${REGION} \
  --format "value(status.url)")

echo ""
echo "🔗 Service URL: ${SERVICE_URL}"
echo ""
echo "📝 Next steps:"
echo "   1. Update Cloudflare DNS to point domains to this Cloud Run service"
echo "   2. Configure domain mapping in Cloud Run (optional)"


