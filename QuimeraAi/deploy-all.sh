#!/bin/bash
# =============================================================================
# Deploy All - Firebase Hosting + Cloud Run SSR
# =============================================================================
# This script deploys the application to both:
# 1. Firebase Hosting (quimeraai.web.app) - Dashboard & SPA
# 2. Cloud Run SSR (custom domains like quimeraapp.com) - Public sites with SEO
#
# Usage:
#   ./deploy-all.sh           # Deploy both
#   ./deploy-all.sh hosting   # Deploy only Firebase Hosting
#   ./deploy-all.sh ssr       # Deploy only Cloud Run SSR
#   ./deploy-all.sh --skip-build  # Skip npm build (use existing dist/)
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="quimeraai"
SERVICE_NAME="quimera-ssr"
REGION="us-central1"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Parse arguments
DEPLOY_HOSTING=true
DEPLOY_SSR=true
SKIP_BUILD=false

for arg in "$@"; do
    case $arg in
        hosting)
            DEPLOY_SSR=false
            ;;
        ssr)
            DEPLOY_HOSTING=false
            ;;
        --skip-build)
            SKIP_BUILD=true
            ;;
    esac
done

# Header
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}           ${YELLOW}🚀 QUIMERA AI - FULL DEPLOYMENT${NC}                  ${CYAN}║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Show deployment plan
echo -e "${BLUE}📋 Deployment Plan:${NC}"
if [ "$SKIP_BUILD" = true ]; then
    echo -e "   • Build: ${YELLOW}Skipped${NC} (using existing dist/)"
else
    echo -e "   • Build: ${GREEN}Yes${NC}"
fi
if [ "$DEPLOY_HOSTING" = true ]; then
    echo -e "   • Firebase Hosting: ${GREEN}Yes${NC} (quimeraai.web.app)"
else
    echo -e "   • Firebase Hosting: ${YELLOW}Skipped${NC}"
fi
if [ "$DEPLOY_SSR" = true ]; then
    echo -e "   • Cloud Run SSR: ${GREEN}Yes${NC} (custom domains)"
else
    echo -e "   • Cloud Run SSR: ${YELLOW}Skipped${NC}"
fi
echo ""

# Start timer
START_TIME=$(date +%s)

# =============================================================================
# Step 1: Build
# =============================================================================
if [ "$SKIP_BUILD" = false ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}📦 Step 1/3: Building application...${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    npm run build
    echo -e "${GREEN}✅ Build complete!${NC}"
    echo ""
fi

# =============================================================================
# Step 2: Firebase Hosting
# =============================================================================
if [ "$DEPLOY_HOSTING" = true ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}🔥 Step 2/3: Deploying to Firebase Hosting...${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    firebase deploy --only hosting
    echo -e "${GREEN}✅ Firebase Hosting deployed!${NC}"
    echo ""
fi

# =============================================================================
# Step 3: Cloud Run SSR
# =============================================================================
if [ "$DEPLOY_SSR" = true ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}☁️  Step 3/3: Deploying to Cloud Run SSR...${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "   Project: ${PROJECT_ID}"
    echo "   Service: ${SERVICE_NAME}"
    echo "   Region: ${REGION}"
    echo ""
    
    # Build and Deploy using Cloud Build with cloudbuild-ssr.yaml
    echo -e "${CYAN}Building and deploying with Cloud Build...${NC}"
    echo -e "${YELLOW}   Note: This may take 5-10 minutes for a full build${NC}"
    
    # Read .env file if it exists and build substitutions
    SUBSTITUTIONS=""
    if [ -f ".env" ]; then
        echo -e "${CYAN}   Reading API keys from .env file...${NC}"
        while IFS='=' read -r key value; do
            # Skip empty lines and comments
            [[ -z "$key" || "$key" =~ ^# ]] && continue
            # Convert to Cloud Build substitution format
            SUBSTITUTIONS="${SUBSTITUTIONS}_${key}=${value},"
        done < .env
        # Remove trailing comma
        SUBSTITUTIONS=${SUBSTITUTIONS%,}
    fi
    
    if [ -n "$SUBSTITUTIONS" ]; then
        gcloud builds submit \
            --project ${PROJECT_ID} \
            --config cloudbuild-ssr.yaml \
            --substitutions="${SUBSTITUTIONS}" \
            .
    else
        gcloud builds submit \
            --project ${PROJECT_ID} \
            --config cloudbuild-ssr.yaml \
            .
    fi
    
    # Get service URL
    SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
        --project ${PROJECT_ID} \
        --region ${REGION} \
        --format "value(status.url)")
    
    echo -e "${GREEN}✅ Cloud Run SSR deployed!${NC}"
    echo -e "   URL: ${SERVICE_URL}"
    echo ""
fi

# =============================================================================
# Summary
# =============================================================================
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}              ${GREEN}✅ DEPLOYMENT COMPLETE!${NC}                      ${CYAN}║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo -e "   ⏱️  Duration: ${MINUTES}m ${SECONDS}s"
echo ""
if [ "$DEPLOY_HOSTING" = true ]; then
    echo -e "   ${GREEN}🔥 Firebase Hosting:${NC}"
    echo -e "      • https://quimeraai.web.app"
fi
if [ "$DEPLOY_SSR" = true ]; then
    echo -e "   ${GREEN}☁️  Cloud Run SSR:${NC}"
    echo -e "      • Custom domains (quimeraapp.com, etc.)"
fi
echo ""
echo -e "${YELLOW}💡 Tip:${NC} Use './deploy-all.sh hosting' or './deploy-all.sh ssr' for partial deploys"
echo ""
