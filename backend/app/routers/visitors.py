from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Visitor
from ..schemas import VisitorCreate, VisitorOut, VisitorUpdate

router = APIRouter(prefix="/visitors", tags=["visitors"])


@router.get("", response_model=list[VisitorOut])
async def list_visitors(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Visitor).order_by(Visitor.expected_at.desc()))
    return result.scalars().all()


@router.post("", response_model=VisitorOut, status_code=201)
async def create_visitor(data: VisitorCreate, db: AsyncSession = Depends(get_db)):
    visitor = Visitor(**data.model_dump())
    db.add(visitor)
    await db.commit()
    await db.refresh(visitor)
    return visitor


@router.get("/{visitor_id}", response_model=VisitorOut)
async def get_visitor(visitor_id: int, db: AsyncSession = Depends(get_db)):
    v = await db.get(Visitor, visitor_id)
    if v is None:
        raise HTTPException(404, "Visitor not found")
    return v


@router.patch("/{visitor_id}", response_model=VisitorOut)
async def update_visitor(visitor_id: int, data: VisitorUpdate, db: AsyncSession = Depends(get_db)):
    v = await db.get(Visitor, visitor_id)
    if v is None:
        raise HTTPException(404, "Visitor not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(v, field, value)
    await db.commit()
    await db.refresh(v)
    return v


@router.post("/{visitor_id}/checkout", response_model=VisitorOut)
async def checkout_visitor(visitor_id: int, db: AsyncSession = Depends(get_db)):
    v = await db.get(Visitor, visitor_id)
    if v is None:
        raise HTTPException(404, "Visitor not found")
    v.checked_out_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(v)
    return v
