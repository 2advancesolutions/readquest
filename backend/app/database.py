"""
Database setup — PostgreSQL for Supabase, async SQLAlchemy
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

# Parse the Supabase postgres connection string
db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# asyncpg needs uuid type treated as text to avoid
# "operator does not exist: uuid = character varying" with Supabase tables.
# We pass a custom init coroutine via connect_args supported by asyncpg driver.
# SQLAlchemy passes connect_args directly to asyncpg.connect() — 'init' is NOT
# a valid asyncpg kwarg, but we can use 'server_settings' to set search_path.
# The correct fix is to use a pool pre-ping + typed columns. We use Text for UUIDs.

engine = create_async_engine(
    db_url,
    echo=False,
    # Keeps connections alive through Supabase's connection pooler timeouts
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


async def create_tables():
    """Create all SQLAlchemy-managed tables and seed reference data."""
    # Import all models so Base.metadata is populated
    from app.models import student, gamification  # noqa: F401
    try:
        from app.models import story as story_model  # noqa: F401
    except Exception:
        pass

    async with engine.begin() as conn:
        # checkfirst=True means it won't drop existing data
        await conn.run_sync(Base.metadata.create_all, checkfirst=True)

    # Seed badges (idempotent — only inserts if slug doesn't exist)
    await _seed_badges()


async def _seed_badges():
    """Insert the 8 core badges if they aren't already in the DB."""
    from sqlalchemy import text
    BADGES = [
        {"slug": "first_book",   "name": "First Book!",    "icon": "📖", "description": "Read your first book",              "criteria": {"stories_read": 1}},
        {"slug": "streak_3",     "name": "3-Day Streak",   "icon": "🔥", "description": "Read 3 days in a row",              "criteria": {"streak_days": 3}},
        {"slug": "quiz_master",  "name": "Quiz Master",    "icon": "🧠", "description": "Get 5 quiz questions right",        "criteria": {"quiz_correct": 5}},
        {"slug": "speed_reader", "name": "Speed Reader",   "icon": "⚡", "description": "Read a book in under 10 minutes",   "criteria": {"speed_minutes": 10}},
        {"slug": "streak_7",     "name": "7-Day Streak",   "icon": "🏆", "description": "Read 7 days in a row",              "criteria": {"streak_days": 7}},
        {"slug": "explorer",     "name": "Genre Explorer", "icon": "🗺️", "description": "Read books in 3 different themes",  "criteria": {"unique_themes": 3}},
        {"slug": "bookworm",     "name": "Bookworm",       "icon": "🐛", "description": "Complete 5 books",                 "criteria": {"stories_read": 5}},
        {"slug": "word_wizard",  "name": "Word Wizard",    "icon": "🔮", "description": "Reach level 3",                   "criteria": {"level": 3}},
    ]
    import uuid, json
    async with AsyncSessionLocal() as session:
        for b in BADGES:
            exists = await session.execute(
                text("SELECT 1 FROM badges WHERE slug = :slug").bindparams(slug=b["slug"])
            )
            if not exists.scalar_one_or_none():
                await session.execute(
                    text("""
                        INSERT INTO badges (id, slug, name, icon, description, criteria)
                        VALUES (CAST(:id AS uuid), :slug, :name, :icon, :description, CAST(:criteria AS jsonb))
                    """).bindparams(
                        id=str(uuid.uuid4()),
                        slug=b["slug"],
                        name=b["name"],
                        icon=b["icon"],
                        description=b["description"],
                        criteria=json.dumps(b["criteria"]),
                    )
                )
        await session.commit()


async def get_session():
    async with AsyncSessionLocal() as session:
        yield session


supabase_client = None
