#!/bin/bash
# =============================================================================
# Deploy Simple SSR Server to Cloud Run
# =============================================================================
# This deploys the lightweight SSR server that serves custom domains
# by loading the React app from Firebase Hosting.
# =============================================================================

set -e

PROJECT_ID="quimeraai"
SERVICE_NAME="quimera-ssr"
REGION="us-central1"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "🚀 Deploying Simple SSR Server to Cloud Run..."
echo "   Project: ${PROJECT_ID}"
echo "   Service: ${SERVICE_NAME}"
echo "   Region: ${REGION}"

# Build and push using Cloud Build
echo ""
echo "📦 Building Docker image with Cloud Build..."
cd server-simple
gcloud builds submit \
  --project ${PROJECT_ID} \
  --tag ${IMAGE_NAME} \
  .
cd ..

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
  --memory 256Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars "NODE_ENV=production,APP_URL=https://quimeraai.web.app"

# Get the service URL
echo ""
echo "✅ Deployment complete!"
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
  --project ${PROJECT_ID} \
  --region ${REGION} \
  --format "value(status.url)")

echo ""
echo "🔗 Service URL: ${SERVICE_URL}"

# Wait for service to be ready
echo ""
echo "⏳ Waiting for service to be ready..."
sleep 5

# Clear SSR server cache to ensure it fetches fresh assets
echo "🧹 Clearing SSR server asset cache..."
curl -X POST "${SERVICE_URL}/__clear-asset-cache" -s && echo " ✅ Cache cleared" || echo " ⚠️  Could not clear cache"

echo ""
echo "📝 Custom domains will now:"
echo "   1. Stay in the browser URL (no redirect!)"
echo "   2. Load the full website (landing + ecommerce)"
echo "   3. Get data from publicStores collection"
echo ""
echo "💡 After deploying to Firebase Hosting, clear the cache:"
echo "   curl -X POST ${SERVICE_URL}/__clear-asset-cache"

