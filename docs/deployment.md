# Deployment

## Architecture

```
┌──────────────────────────────┐     ┌──────────────────────────────┐
│  Frontend                    │     │  Backend                     │
│  S3 → CloudFront (static)   │     │  Docker → ECR → App Runner   │
│  readquest-frontend-2532     │     │  readquest-backend            │
└──────────────────────────────┘     └──────────────────────────────┘
        │                                       │
        └── Both connect to ────────────────────┘
                  │
         ┌───────▼────────┐
         │    Supabase     │
         │  PostgreSQL DB  │
         │  Auth           │
         │  Storage        │
         └─────────────────┘
```

## Frontend Deployment (S3 + CloudFront)

### Build
```bash
cd frontend
npm run build    # tsc && vite build
# Output: frontend/dist/
```

### Deploy
```bash
# Upload to S3
aws s3 sync dist/ s3://readquest-frontend-2532 --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id <DIST_ID> --paths "/*"
```

### Key Configuration
- S3 bucket: `readquest-frontend-2532` (us-east-1)
- Static website hosting enabled
- CloudFront distribution for HTTPS + caching
- All routes fall back to `index.html` (SPA routing)

---

## Backend Deployment (Docker → ECR → App Runner)

### Dockerfile
The backend uses a standard Python Docker image:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Deploy Script (`deploy.sh`)
```bash
# 1. Build Docker image
docker build -t readquest-backend ./backend

# 2. Tag for ECR
docker tag readquest-backend:latest <AWS_ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/readquest-backend:latest

# 3. Push to ECR
aws ecr get-login-password --region <REGION> | docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com
docker push <AWS_ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/readquest-backend:latest

# 4. App Runner auto-deploys on new image
```

### App Runner Configuration
- Auto-deploys when ECR image is updated
- Port: 8000
- Health check: `GET /health`
- Environment variables set in App Runner console

---

## CORS Configuration

The backend CORS must include all deployment domains:

```python
_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "http://readquest-frontend-2532.s3-website-us-east-1.amazonaws.com",
]
# Dynamic: FRONTEND_URL env var
# Regex: *.cloudfront.net, *.awsapprunner.com
```

---

## Required Secrets in Production

| Secret | Where to set | Purpose |
|--------|-------------|---------|
| `GEMINI_API_KEY` | App Runner env | AI models |
| `DATABASE_URL` | App Runner env | Supabase PostgreSQL connection string |
| `SUPABASE_URL` | App Runner env | Supabase API URL |
| `SUPABASE_ANON_KEY` | App Runner env | Supabase anonymous key |
| `SUPABASE_SERVICE_KEY` | App Runner env | Storage uploads |
| `gcloud-tts-key.json` | Baked into Docker image | Google Cloud TTS |

---

## Supabase Production Setup

1. Run `supabase_setup.sql` in Supabase SQL Editor to create:
   - `xp_ledger`, `streaks`, `badges`, `student_badges`
   - `reading_progress`, `reading_logs`
   - Indexes and badge seed data

2. Create the `story-images` Storage bucket:
   - Public access for reading
   - Service-role key for uploading

3. Enable email Auth provider

---

## Vite Proxy (Dev Only)

During local development, Vite proxies `/api` requests to `localhost:8000`:
```typescript
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    },
  },
}
```

In production, the frontend calls the App Runner URL directly via `VITE_API_URL`.
