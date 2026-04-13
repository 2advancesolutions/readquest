#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
# ReadQuest — Full AWS Deployment Script  (fixed & hardened)
# Deploys:  Backend  → ECR → App Runner
#           Frontend → S3  → CloudFront
# ══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─── Config ──────────────────────────────────────────────────────────────────
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="873259176532"
APP_NAME="readquest"
ECR_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${APP_NAME}-backend"
S3_BUCKET="${APP_NAME}-frontend-2532"
APPRUNNER_SERVICE="${APP_NAME}-backend"
SVC_ARN="arn:aws:apprunner:${AWS_REGION}:${AWS_ACCOUNT_ID}:service/${APPRUNNER_SERVICE}/8b86fae1121c40dd9b2756fc02f2d722"
CF_DIST_ID="E320F23VR5I0J0"
CF_DOMAIN="d204gd0t8zljdt.cloudfront.net"

# ─── Colours ─────────────────────────────────────────────────────────────────
GREEN="\033[0;32m"; YELLOW="\033[1;33m"; RED="\033[0;31m"; NC="\033[0m"
info()    { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()     { echo -e "${RED}[ERR ]${NC} $*" >&2; }
section() { echo -e "\n${GREEN}══════════════════════════════════════${NC}"; echo -e "${GREEN}  $*${NC}"; echo -e "${GREEN}══════════════════════════════════════${NC}"; }

# ─── 1. Prerequisites ─────────────────────────────────────────────────────────
section "Step 1/5 — Checking prerequisites"
for cmd in aws docker node npm; do
    if ! command -v "$cmd" &>/dev/null; then
        err "'$cmd' not found. Please install it first."; exit 1
    fi
done
aws sts get-caller-identity --query 'Account' --output text >/dev/null
info "AWS authenticated ✓  |  docker: $(docker --version | cut -d' ' -f3 | tr -d ',')"

# ─── Load .env ────────────────────────────────────────────────────────────────
ENV_FILE="${SCRIPT_DIR}/backend/.env"
if [ ! -f "$ENV_FILE" ]; then err "Missing backend/.env"; exit 1; fi
# Export every non-comment variable
set -a; source "$ENV_FILE"; set +a
info "Loaded backend/.env ✓"

BACKEND_URL="https://uman5zjn7q.${AWS_REGION}.awsapprunner.com"

# ─── 2. Build & push backend Docker image ────────────────────────────────────
section "Step 2/5 — Building & pushing backend Docker image (linux/amd64)"
cd "${SCRIPT_DIR}/backend"

aws ecr get-login-password --region "$AWS_REGION" | \
    docker login --username AWS --password-stdin \
    "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

IMAGE_TAG="$(date +%Y%m%d%H%M%S)"
docker build --platform linux/amd64 -t "${APP_NAME}-backend:${IMAGE_TAG}" .
docker tag "${APP_NAME}-backend:${IMAGE_TAG}" "${ECR_REPO}:${IMAGE_TAG}"
docker tag "${APP_NAME}-backend:${IMAGE_TAG}" "${ECR_REPO}:latest"
docker push "${ECR_REPO}:${IMAGE_TAG}"
docker push "${ECR_REPO}:latest"
info "Image pushed → ${ECR_REPO}:${IMAGE_TAG}"

# ─── 3. Update App Runner env vars + trigger deployment ──────────────────────
section "Step 3/5 — Updating App Runner env vars & triggering deployment"
cd "${SCRIPT_DIR}"

aws apprunner update-service \
    --service-arn "$SVC_ARN" \
    --region "$AWS_REGION" \
    --source-configuration "{
        \"ImageRepository\": {
            \"ImageIdentifier\": \"${ECR_REPO}:latest\",
            \"ImageConfiguration\": {
                \"Port\": \"8000\",
                \"RuntimeEnvironmentVariables\": {
                    \"ENVIRONMENT\": \"production\",
                    \"DATABASE_URL\": \"${DATABASE_URL}\",
                    \"GEMINI_API_KEY\": \"${GEMINI_API_KEY}\",
                    \"OPENROUTER_API_KEY\": \"${OPENROUTER_API_KEY}\",
                    \"SECRET_KEY\": \"${SECRET_KEY:-readquest-prod-secret}\",
                    \"SUPABASE_SERVICE_KEY\": \"${SUPABASE_SERVICE_KEY}\",
                    \"FAL_AI\": \"${FAL_AI}\",
                    \"FRONTEND_URL\": \"https://${CF_DOMAIN}\"
                }
            },
            \"ImageRepositoryType\": \"ECR\"
        }
    }" --output json | python3 -c "import sys,json; d=json.load(sys.stdin); print('  Service status:', d['Service']['Status'])"

info "App Runner update triggered — polling until RUNNING (up to 8 min)..."
for i in $(seq 1 48); do
    STATUS=$(aws apprunner describe-service \
        --service-arn "$SVC_ARN" \
        --region "$AWS_REGION" \
        --query 'Service.Status' --output text)
    echo -ne "\r  Status: ${STATUS} (${i}/48) ..."
    if [[ "$STATUS" == "RUNNING" ]]; then
        echo ""
        info "App Runner is RUNNING ✓"
        break
    elif [[ "$STATUS" == "OPERATION_IN_PROGRESS" ]]; then
        sleep 10
    else
        echo ""
        warn "Unexpected status: ${STATUS} — continuing anyway"
        break
    fi
done
echo ""

# ─── 4. Build frontend ────────────────────────────────────────────────────────
section "Step 4/5 — Building React frontend"
cd "${SCRIPT_DIR}/frontend"

cat > .env.production << EOF
VITE_API_URL=https://uman5zjn7q.us-east-1.awsapprunner.com
VITE_SUPABASE_URL=https://nspehtlzknfbiwvjswge.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zcGVodGx6a25mYml3dmpzd2dlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MTQyNzcsImV4cCI6MjA4OTk5MDI3N30.--MQIejpZat94lV61BEkwj3mXHdOFG34HDqiOdydp2I
EOF

npm ci --prefer-offline 2>&1 | tail -3
npm run build 2>&1 | tail -5
info "Frontend built ✓  ($(du -sh dist | cut -f1) total)"

# ─── 5. Deploy frontend to S3 + invalidate CloudFront ────────────────────────
section "Step 5/5 — Syncing frontend to S3 + invalidating CloudFront cache"
cd "${SCRIPT_DIR}"

# Sync the full dist directory
aws s3 sync frontend/dist/ "s3://${S3_BUCKET}/" \
    --delete \
    --cache-control "public,max-age=31536000,immutable" \
    --quiet

# Override cache for html + root files (no-cache)
aws s3 cp frontend/dist/index.html "s3://${S3_BUCKET}/index.html" \
    --cache-control "no-cache,no-store,must-revalidate" \
    --content-type "text/html" \
    --quiet

info "S3 sync complete ✓"

# Invalidate CloudFront so users get the new build immediately
INV_ID=$(aws cloudfront create-invalidation \
    --distribution-id "$CF_DIST_ID" \
    --paths "/*" \
    --query 'Invalidation.Id' --output text)
info "CloudFront invalidation created: ${INV_ID}"

# ─── Done ─────────────────────────────────────────────────────────────────────
section "🎉  Deployment Complete!"
echo ""
echo -e "  ${GREEN}Backend API${NC}   →  ${BACKEND_URL}"
echo -e "  ${GREEN}Health check${NC}  →  ${BACKEND_URL}/health"
echo -e "  ${GREEN}Frontend App${NC}  →  ${YELLOW}https://${CF_DOMAIN}${NC}"
echo ""
echo -e "  ℹ️  CloudFront propagation takes ~1-5 min."
echo -e "  ℹ️  App Runner fully running at: ${BACKEND_URL}"
echo ""
