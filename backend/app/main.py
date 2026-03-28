"""
ReadQuest FastAPI Backend — main.py
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.routers import students, stories, quizzes, rewards, tts, parents
from app.routers import fluency, vocabulary, assignments, quest
import app.database as db

app = FastAPI(
    title="ReadQuest API",
    description="AI-powered K-8 reading app backend",
    version="0.1.0",
)

import os

_FRONTEND_URL = os.getenv("FRONTEND_URL", "")

# Exact origins always allowed (dev)
_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    # S3 static website fallback
    "http://readquest-frontend-2532.s3-website-us-east-1.amazonaws.com",
]
if _FRONTEND_URL:
    _ALLOWED_ORIGINS.append(_FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    # Also match any CloudFront or App Runner subdomain dynamically
    allow_origin_regex=r"https://.*\.(cloudfront\.net|awsapprunner\.com)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.on_event("startup")
async def startup():
    await db.create_tables()
    # Ensure static dirs exist
    Path("static/images").mkdir(parents=True, exist_ok=True)
    Path("static/videos").mkdir(parents=True, exist_ok=True)


# Serve generated images
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ReadQuest API"}


# Routers
app.include_router(students.router, prefix="/api/students", tags=["students"])
app.include_router(stories.router, prefix="/api/stories", tags=["stories"])
app.include_router(quizzes.router, prefix="/api/quizzes", tags=["quizzes"])
app.include_router(rewards.router, prefix="/api/rewards", tags=["rewards"])
app.include_router(tts.router, prefix="/api/tts", tags=["tts"])

# Added auth routers

app.include_router(parents.router, prefix="/api/parents", tags=["parents"])

# Phase 1 — AI Tutor routers
app.include_router(fluency.router, prefix="/api/fluency", tags=["fluency"])
app.include_router(vocabulary.router, prefix="/api/vocabulary", tags=["vocabulary"])
app.include_router(assignments.router, prefix="/api/assignments", tags=["assignments"])
app.include_router(quest.router, prefix="/api/quest", tags=["quest"])
