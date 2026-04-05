"""CharacterPortrait model — server-side cache for AI-generated character portraits."""
import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class CharacterPortrait(Base):
    __tablename__ = "character_portraits"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    # Normalized lowercase name used as the cache key (e.g. "iron man", "girl with wings")
    name: Mapped[str] = mapped_column(String(256), unique=True, nullable=False, index=True)
    # Fully qualified public URL (Supabase storage or fal CDN)
    portrait_url: Mapped[str] = mapped_column(Text, nullable=False)
    # Art style the portrait was generated with
    art_style: Mapped[str] = mapped_column(String(50), nullable=False, default="cartoon")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
