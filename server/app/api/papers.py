import mimetypes
import shutil
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import DATA_DIR, get_session
from app.models.paper import PaperModel, PaperCreate, PaperResponse, NoteUpdate

router = APIRouter(prefix="/api/papers", tags=["papers"])
UPLOADS_DIR = DATA_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def _is_url(source: str) -> bool:
    return source.startswith("http://") or source.startswith("https://")


def _safe_filename(filename: str) -> str:
    candidate = Path(filename).name or "paper.pdf"
    return candidate.replace("/", "_").replace("\\", "_")


def _import_local_file(source: str) -> str:
    file_path = Path(source).expanduser()

    try:
        if not file_path.is_file():
            raise HTTPException(
                status_code=400,
                detail=f"Local file not found: {source}",
            )
    except PermissionError as exc:
        raise HTTPException(
            status_code=400,
            detail=(
                "This file is in a macOS-protected folder and the server cannot read it. "
                "Use 'Choose PDF' so the browser uploads a safe copy instead."
            ),
        ) from exc

    destination = UPLOADS_DIR / f"{uuid4().hex}-{_safe_filename(file_path.name)}"
    try:
        shutil.copy2(file_path, destination)
    except PermissionError as exc:
        raise HTTPException(
            status_code=400,
            detail=(
                "The server was blocked from reading that local file. "
                "Use 'Choose PDF' so the browser uploads a safe copy instead."
            ),
        ) from exc

    return str(destination)


@router.get("", response_model=list[PaperResponse])
async def list_papers(session: AsyncSession = Depends(get_session)) -> list[PaperResponse]:
    result = await session.execute(select(PaperModel).order_by(PaperModel.added_at.desc()))
    papers = result.scalars().all()
    return [PaperResponse.from_orm_model(p) for p in papers]


@router.post("", response_model=PaperResponse, status_code=201)
async def add_paper(
    data: PaperCreate,
    session: AsyncSession = Depends(get_session),
) -> PaperResponse:
    normalized_source = data.source.strip()
    stored_source = normalized_source if _is_url(normalized_source) else _import_local_file(normalized_source)

    existing_query = await session.execute(
        select(PaperModel).where(
            (PaperModel.title == data.title) | (PaperModel.source == stored_source)
        )
    )
    if existing_query.scalars().first():
        raise HTTPException(
            status_code=400,
            detail="This paper is already in your list.",
        )

    paper = PaperModel(title=data.title, source=stored_source)
    session.add(paper)
    await session.commit()
    await session.refresh(paper)
    return PaperResponse.from_orm_model(paper)


@router.post("/upload", response_model=PaperResponse, status_code=201)
async def upload_paper(
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    session: AsyncSession = Depends(get_session),
) -> PaperResponse:
    filename = _safe_filename(file.filename or "paper.pdf")
    destination = UPLOADS_DIR / f"{uuid4().hex}-{filename}"

    try:
        with destination.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    finally:
        await file.close()

    paper_title = (title or "").strip() or Path(filename).stem
    stored_source = str(destination)

    existing_query = await session.execute(
        select(PaperModel).where(
            (PaperModel.title == paper_title) | (PaperModel.source == stored_source)
        )
    )
    if existing_query.scalars().first():
        destination.unlink(missing_ok=True)
        raise HTTPException(
            status_code=400,
            detail="This paper is already in your list.",
        )

    paper = PaperModel(title=paper_title, source=stored_source)
    session.add(paper)
    await session.commit()
    await session.refresh(paper)
    return PaperResponse.from_orm_model(paper)


@router.post("/{paper_id}/open", status_code=200)
async def open_paper(
    paper_id: int,
    session: AsyncSession = Depends(get_session),
) -> dict:
    paper = await session.get(PaperModel, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    if _is_url(paper.source):
        # Return the URL for the client to open in a browser tab
        return {"opened": True, "url": paper.source}

    # Local file — serve via HTTP so the browser opens it directly
    # This avoids macOS TCC permission issues with background processes
    return {"opened": True, "serve": f"/api/papers/{paper_id}/serve"}


@router.get("/{paper_id}/serve")
async def serve_paper(
    paper_id: int,
    session: AsyncSession = Depends(get_session),
) -> FileResponse:
    paper = await session.get(PaperModel, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    if _is_url(paper.source):
        raise HTTPException(status_code=400, detail="Cannot serve a web URL")

    file_path = Path(paper.source)
    try:
        file_exists = file_path.is_file()
    except PermissionError as exc:
        raise HTTPException(
            status_code=403,
            detail=(
                "The server is not allowed to read this PDF from its current location. "
                "Re-add it with 'Choose PDF' to store a readable copy in the app."
            ),
        ) from exc

    if not file_exists:
        raise HTTPException(
            status_code=404,
            detail=f"File not found at: {paper.source}",
        )

    media_type = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=file_path.name,
        content_disposition_type="inline",
    )


@router.patch("/{paper_id}/note", response_model=PaperResponse)
async def update_note(
    paper_id: int,
    data: NoteUpdate,
    session: AsyncSession = Depends(get_session),
) -> PaperResponse:
    paper = await session.get(PaperModel, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    paper.note = data.note.strip() or None
    await session.commit()
    await session.refresh(paper)
    return PaperResponse.from_orm_model(paper)


@router.patch("/{paper_id}/complete", response_model=PaperResponse)
async def complete_paper(
    paper_id: int,
    session: AsyncSession = Depends(get_session),
) -> PaperResponse:
    paper = await session.get(PaperModel, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    paper.completed_at = datetime.now(timezone.utc)
    await session.commit()
    await session.refresh(paper)
    return PaperResponse.from_orm_model(paper)


@router.patch("/{paper_id}/restore", response_model=PaperResponse)
async def restore_paper(
    paper_id: int,
    session: AsyncSession = Depends(get_session),
) -> PaperResponse:
    paper = await session.get(PaperModel, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    paper.completed_at = None
    await session.commit()
    await session.refresh(paper)
    return PaperResponse.from_orm_model(paper)


@router.delete("/{paper_id}", status_code=204)
async def delete_paper(
    paper_id: int,
    session: AsyncSession = Depends(get_session),
) -> None:
    paper = await session.get(PaperModel, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    await session.delete(paper)
    await session.commit()
