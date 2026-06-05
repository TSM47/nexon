from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import AccessEvent, EventType
from ..schemas import EventCreate, EventOut
from ..ws import manager

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=list[EventOut])
async def list_events(
    event_type: EventType | None = Query(None),
    door_id: int | None = Query(None),
    employee_id: int | None = Query(None),
    since: datetime | None = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(AccessEvent)
    if event_type:
        stmt = stmt.where(AccessEvent.event_type == event_type)
    if door_id:
        stmt = stmt.where(AccessEvent.door_id == door_id)
    if employee_id:
        stmt = stmt.where(AccessEvent.employee_id == employee_id)
    if since:
        stmt = stmt.where(AccessEvent.occurred_at >= since)
    stmt = stmt.order_by(AccessEvent.occurred_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=EventOut, status_code=201)
async def create_event(data: EventCreate, db: AsyncSession = Depends(get_db)):
    event = AccessEvent(**data.model_dump())
    db.add(event)
    await db.commit()
    await db.refresh(event)
    await manager.broadcast({"type": "access_event", "event_id": event.id, "event_type": event.event_type.value})
    return event
