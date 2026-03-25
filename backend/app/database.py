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

engine = create_async_engine(db_url, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

class Base(DeclarativeBase):
    pass

async def create_tables():
    # Since we use Supabase migrations, we don't strictly need to run Base.metadata.create_all
    # But leaving it here as a no-op or just ensuring schemas are reflected is fine.
    # Usually in production we wouldn't call create_all directly if using a migration tool.
    pass

async def get_session():
    async with AsyncSessionLocal() as session:
        yield session
