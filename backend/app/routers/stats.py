from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import AccessEvent, Door, DoorStatus, Employee, EventType, Visitor
from ..schemas import OverviewStats

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/overview", response_model=OverviewStats)
async def overview_stats(db: AsyncSession = Depends(get_db)):
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    total_emp = (await db.execute(select(func.count()).select_from(Employee).where(Employee.is_active == True))).scalar_one()

    events_today = (await db.execute(
        select(func.count()).select_from(AccessEvent).where(AccessEvent.occurred_at >= today_start)
    )).scalar_one()

    denied_today = (await db.execute(
        select(func.count()).select_from(AccessEvent).where(
            AccessEvent.occurred_at >= today_start,
            AccessEvent.event_type == EventType.denied,
        )
    )).scalar_one()

    door_counts = {}
    for status in DoorStatus:
        n = (await db.execute(
            select(func.count()).select_from(Door).where(Door.status == status, Door.is_active == True)
        )).scalar_one()
        door_counts[status] = n

    visitors_today = (await db.execute(
        select(func.count()).select_from(Visitor).where(Visitor.checked_in_at >= today_start)
    )).scalar_one()

    # "people inside" = entries - exits today
    entries = (await db.execute(
        select(func.count()).select_from(AccessEvent).where(
            AccessEvent.occurred_at >= today_start,
            AccessEvent.event_type == EventType.entry,
        )
    )).scalar_one()
    exits = (await db.execute(
        select(func.count()).select_from(AccessEvent).where(
            AccessEvent.occurred_at >= today_start,
            AccessEvent.event_type == EventType.exit,
        )
    )).scalar_one()

    return OverviewStats(
        people_inside=max(0, entries - exits),
        total_employees=total_emp,
        events_today=events_today,
        denied_today=denied_today,
        open_doors=door_counts[DoorStatus.open],
        locked_doors=door_counts[DoorStatus.locked],
        alarm_doors=door_counts[DoorStatus.alarm],
        visitors_today=visitors_today,
    )
