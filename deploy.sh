#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
# ReadQuest — Full AWS Deployment Script
# Deploys:  Backend  → ECR → App Runner
#           Frontend → S3  → CloudFront
# ══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ─── Config (edit these if needed) ───────────────────────────────────────────
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="873259176532"
APP_NAME="readquest"
ECR_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${APP_NAME}-backend"
S3_BUCKET="${APP_NAME}-frontend-$(echo $AWS_ACCOUNT_ID | tail -c 5)"
APPRUNNER_SERVICE="${APP_NAME}-backend"

# ─── Colours ─────────────────────────────────────────────────────────────────
GREEN="\033[0;32m"; YELLOW="\033[1;33m"; RED="\033[0;31m"; NC="\033[0m"
info()    { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
section() { echo -e "\n${GREEN}══════════════════════════════════════${NC}"; echo -e "${GREEN}  $*${NC}"; echo -e "${GREEN}══════════════════════════════════════${NC}"; }

# ─── 1. Check prerequisites ───────────────────────────────────────────────────
section "Step 1/6 — Checking prerequisites"
for cmd in aws docker node npm; do
    if ! command -v "$cmd" &>/dev/null; then
        echo -e "${RED}[ERROR]${NC} '$cmd' not found. Please install it first."
        exit 1
    fi
done
info "All prerequisites found ✓"

# ─── 2. ECR — create repo if needed ──────────────────────────────────────────
section "Step 2/6 — Setting up ECR repository"
aws ecr describe-repositories --repository-names "${APP_NAME}-backend" \
    --region "$AWS_REGION" &>/dev/null || \
    aws ecr create-repository \
        --repository-name "${APP_NAME}-backend" \
        --region "$AWS_REGION" \
        --image-scanning-configuration scanOnPush=true \
        --query 'repository.repositoryUri' --output text
info "ECR repo ready: ${ECR_REPO}"

# ─── 3. Build & push backend Docker image ────────────────────────────────────
section "Step 3/6 — Building & pushing backend Docker image"
cd "$(dirname "$0")/backend"

# ECR login
aws ecr get-login-password --region "$AWS_REGION" | \
    docker login --username AWS --password-stdin \
    "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

IMAGE_TAG="$(date +%Y%m%d%H%M%S)"
docker build --platform linux/amd64 -t "${APP_NAME}-backend:${IMAGE_TAG}" .
docker tag "${APP_NAME}-backend:${IMAGE_TAG}" "${ECR_REPO}:${IMAGE_TAG}"
docker tag "${APP_NAME}-backend:${IMAGE_TAG}" "${ECR_REPO}:latest"
docker push "${ECR_REPO}:${IMAGE_TAG}"
docker push "${ECR_REPO}:latest"
info "Image pushed: ${ECR_REPO}:${IMAGE_TAG}"

# ─── 4. Deploy / update App Runner ───────────────────────────────────────────
section "Step 4/6 — Deploying backend to App Runner"
cd "$(dirname "$0")"

# Check if service already exists
SVC_ARN=$(aws apprunner list-services --region "$AWS_REGION" \
    --query "ServiceSummaryList[?ServiceName=='${APPRUNNER_SERVICE}'].ServiceArn" \
    --output text 2>/dev/null || echo "")

# Load secrets from backend/.env
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/backend/.env"

if [ -z "$SVC_ARN" ]; then
    info "Creating new App Runner service..."

    # Create ECR access role if it doesn't exist
    ROLE_NAME="AppRunnerECRAccessRole"
    ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" \
        --query 'Role.Arn' --output text 2>/dev/null || echo "")

    if [ -z "$ROLE_ARN" ]; then
        info "Creating IAM role ${ROLE_NAME}..."
        ROLE_ARN=$(aws iam create-role --role-name "$ROLE_NAME" \
            --assume-role-policy-document '{
              "Version":"2012-10-17",
              "Statement":[{"Effect":"Allow","Principal":{"Service":"build.apprunner.amazonaws.com"},
              "Action":"sts:AssumeRole"}]}' \
            --query 'Role.Arn' --output text)
        aws iam attach-role-policy --role-name "$ROLE_NAME" \
            --policy-arn "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
        sleep 10  # IAM propagation
    fi

    aws apprunner create-service \
        --region "$AWS_REGION" \
        --service-name "$APPRUNNER_SERVICE" \
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
                        \"SECRET_KEY\": \"${SECRET_KEY}\"
                    }
                },
                \"ImageRepositoryType\": \"ECR\",
                \"AuthenticationConfiguration\": {
                    \"AccessRoleArn\": \"${ROLE_ARN}\"
                }
            },
            \"AutoDeploymentsEnabled\": true
        }" \
        --instance-configuration "Cpu=1 vCPU,Memory=2 GB" \
        --health-check-configuration "Protocol=HTTP,Path=/health,Interval=10,Timeout=5,HealthyThreshold=1,UnhealthyThreshold=3"

    # Wait for service to be running
    info "Waiting for App Runner service to reach RUNNING state..."
    aws apprunner wait service-running \
        --service-name "$APPRUNNER_SERVICE" \
        --region "$AWS_REGION" 2>/dev/null || true

    BACKEND_URL=$(aws apprunner list-services \
        --region "$AWS_REGION" \
        --query "ServiceSummaryList[?ServiceName=='${APPRUNNER_SERVICE}'].ServiceUrl" \
        --output text)
    BACKEND_URL="https://${BACKEND_URL}"
    info "App Runner service created: ${BACKEND_URL}"
else
    info "Triggering redeployment of existing App Runner service..."
    aws apprunner start-deployment \
        --service-arn "$SVC_ARN" \
        --region "$AWS_REGION"

    BACKEND_URL=$(aws apprunner describe-service \
        --service-arn "$SVC_ARN" \
        --region "$AWS_REGION" \
        --query 'Service.ServiceUrl' --output text)
    BACKEND_URL="https://${BACKEND_URL}"
    info "Redeployment started: ${BACKEND_URL}"
fi

# ─── 5. Build frontend ────────────────────────────────────────────────────────
section "Step 5/6 — Building React frontend"
cd "$(dirname "$0")/frontend"

# Write production .env
cat > .env.production << EOF
VITE_API_URL=${BACKEND_URL}
VITE_SUPABASE_URL=${VITE_SUPABASE_URL:-https://nspehtlzknfbiwvjswge.supabase.co}
VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zcGVodGx6a25mYml3dmpzd2dlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MTQyNzcsImV4cCI6MjA4OTk5MDI3N30.--MQIejpZat94lV61BEkwj3mXHdOFG34HDqiOdydp2I}
EOF

npm ci
npm run build
info "Frontend built ✓"

# ─── 6. Create S3 bucket + CloudFront, deploy frontend ───────────────────────
section "Step 6/6 — Deploying frontend to S3 + CloudFront"
cd "$(dirname "$0")"

# Create S3 bucket if it doesn't exist
if ! aws s3api head-bucket --bucket "$S3_BUCKET" 2>/dev/null; then
    info "Creating S3 bucket: ${S3_BUCKET}"
    if [ "$AWS_REGION" == "us-east-1" ]; then
        aws s3api create-bucket --bucket "$S3_BUCKET" --region "$AWS_REGION"
    else
        aws s3api create-bucket --bucket "$S3_BUCKET" --region "$AWS_REGION" \
            --create-bucket-configuration LocationConstraint="$AWS_REGION"
    fi
fi

# Configure bucket for static website hosting
aws s3api put-public-access-block --bucket "$S3_BUCKET" \
    --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

aws s3api put-bucket-website --bucket "$S3_BUCKET" \
    --website-configuration '{"IndexDocument":{"Suffix":"index.html"},"ErrorDocument":{"Key":"index.html"}}'

aws s3api put-bucket-policy --bucket "$S3_BUCKET" --policy "{
    \"Version\":\"2012-10-17\",
    \"Statement\":[{
        \"Effect\":\"Allow\",
        \"Principal\":\"*\",
        \"Action\":\"s3:GetObject\",
        \"Resource\":\"arn:aws:s3:::${S3_BUCKET}/*\"
    }]
}"

# Sync built assets
aws s3 sync frontend/dist/ "s3://${S3_BUCKET}/" \
    --delete \
    --cache-control "public,max-age=31536000" \
    --exclude "index.html"

aws s3 cp frontend/dist/index.html "s3://${S3_BUCKET}/index.html" \
    --cache-control "no-cache,no-store,must-revalidate" \
    --content-type "text/html"

# Check for existing CloudFront distribution
CF_DIST_ID=$(aws cloudfront list-distributions \
    --query "DistributionList.Items[?Origins.Items[0].DomainName=='${S3_BUCKET}.s3.amazonaws.com'].Id" \
    --output text 2>/dev/null || echo "")

if [ -z "$CF_DIST_ID" ]; then
    info "Creating CloudFront distribution..."
    CF_DIST_ID=$(aws cloudfront create-distribution \
        --distribution-config "{
            \"CallerReference\": \"${APP_NAME}-$(date +%s)\",
            \"Comment\": \"ReadQuest Frontend\",
            \"DefaultRootObject\": \"index.html\",
            \"Origins\": {
                \"Quantity\": 1,
                \"Items\": [{
                    \"Id\": \"S3Origin\",
                    \"DomainName\": \"${S3_BUCKET}.s3.amazonaws.com\",
                    \"S3OriginConfig\": {\"OriginAccessIdentity\": \"\"}
                }]
            },
            \"DefaultCacheBehavior\": {
                \"TargetOriginId\": \"S3Origin\",
                \"ViewerProtocolPolicy\": \"redirect-to-https\",
                \"CachePolicyId\": \"658327ea-f89d-4fab-a63d-7e88639e58f6\",
                \"AllowedMethods\": {\"Quantity\": 2, \"Items\": [\"GET\",\"HEAD\"],
                    \"CachedMethods\": {\"Quantity\": 2, \"Items\": [\"GET\",\"HEAD\"]}},
                \"Compress\": true
            },
            \"CustomErrorResponses\": {
                \"Quantity\": 1,
                \"Items\": [{
                    \"ErrorCode\": 403,
                    \"ResponsePagePath\": \"/index.html\",
                    \"ResponseCode\": \"200\",
                    \"ErrorCachingMinTTL\": 0
                }]
            },
            \"Enabled\": true,
            \"PriceClass\": \"PriceClass_100\"
        }" \
        --query 'Distribution.Id' --output text)
    info "CloudFront distribution created: ${CF_DIST_ID}"
else
    info "Invalidating CloudFront cache..."
    aws cloudfront create-invalidation \
        --distribution-id "$CF_DIST_ID" \
        --paths "/*"
fi

# Get the final frontend URL
CF_DOMAIN=$(aws cloudfront get-distribution \
    --id "$CF_DIST_ID" \
    --query 'Distribution.DomainName' --output text)

# Update App Runner FRONTEND_URL env var for CORS
info "Updating App Runner CORS with frontend URL..."
if [ -n "$SVC_ARN" ]; then
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
                        \"SECRET_KEY\": \"${SECRET_KEY}\",
                        \"FRONTEND_URL\": \"https://${CF_DOMAIN}\"
                    }
                },
                \"ImageRepositoryType\": \"ECR\"
            }
        }" > /dev/null
fi

# ─── Done ─────────────────────────────────────────────────────────────────────
section "🎉  Deployment Complete!"
echo ""
echo -e "  ${GREEN}Backend API${NC}    →  ${BACKEND_URL}"
echo -e "  ${GREEN}Frontend App${NC}   →  ${YELLOW}https://${CF_DOMAIN}${NC}  (CloudFront propagation can take ~15 min)"
echo -e "  ${GREEN}S3 Bucket${NC}      →  https://${S3_BUCKET}.s3-website-${AWS_REGION}.amazonaws.com"
echo ""
echo -e "  ℹ️  Health check:  ${BACKEND_URL}/health"
echo ""
