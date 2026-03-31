from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import String, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from pydantic import BaseModel

from app.core.database import Base


# ---------- SQLAlchemy ORM model ----------

class PaperModel(Base):
    __tablename__ = "papers"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    source: Mapped[str] = mapped_column(String(2000), nullable=False)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default=None)
    added_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
    )


# ---------- Pydantic schemas ----------

class PaperCreate(BaseModel):
    title: str
    source: str


class NoteUpdate(BaseModel):
    note: str


class PaperResponse(BaseModel):
    id: int
    title: str
    source: str
    note: Optional[str] = None
    added_at: str
    completed_at: Optional[str] = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_model(cls, obj: PaperModel) -> "PaperResponse":
        return cls(
            id=obj.id,
            title=obj.title,
            source=obj.source,
            note=obj.note,
            added_at=obj.added_at.isoformat() if obj.added_at else "",
            completed_at=obj.completed_at.isoformat() if obj.completed_at else None,
        )
