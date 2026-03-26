# ── Build stage ──────────────────────────────────────────────
FROM python:3.11-slim AS base

WORKDIR /app

# System deps for asyncpg / aiosqlite
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev curl && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Ensure static dirs exist
RUN mkdir -p static/images static/videos

# ── Runtime ──────────────────────────────────────────────────
EXPOSE 8000

# Health-check used by App Runner
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
