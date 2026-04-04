"""
ReadQuest FastAPI Backend — main.py
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.routers import students, stories, quizzes, rewards, tts, parents
from app.routers import fluency, vocabulary, assignments, quest, spelling, exams
from app.routers import movie_studio, stt, admin, game_progress, roadmap
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
    # Expo web dev server
    "http://localhost:8081",
    "http://localhost:19006",
    # S3 static website fallback
    "http://readquest-frontend-2532.s3-website-us-east-1.amazonaws.com",
]
if _FRONTEND_URL:
    _ALLOWED_ORIGINS.append(_FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    # Match CloudFront/App Runner subdomains AND any local network IP (for Expo on device)
    allow_origin_regex=r"(https://.*\.(cloudfront\.net|awsapprunner\.com)$|http://192\.168\.\d+\.\d+(:\d+)?$|http://10\.\d+\.\d+\.\d+(:\d+)?$)",
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
app.include_router(spelling.router, prefix="/api", tags=["spelling"])
app.include_router(exams.router, prefix="/api/exams", tags=["exams"])
app.include_router(movie_studio.router, prefix="/api/movie-studio", tags=["movie-studio"])
app.include_router(stt.router, prefix="/api/stt", tags=["stt"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(game_progress.router, prefix="/api", tags=["game-progress"])
app.include_router(roadmap.router, prefix="/api", tags=["roadmap"])
