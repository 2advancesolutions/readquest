"""
ReadQuest FastAPI Backend — main.py
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.routers import students, stories, quizzes, rewards
import app.database as db

app = FastAPI(
    title="ReadQuest API",
    description="AI-powered K-8 reading app backend",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.create_tables()
    # Ensure static images dir exists
    Path("static/images").mkdir(parents=True, exist_ok=True)


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
