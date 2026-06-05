from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import AccessCard, CardStatus
from ..schemas import CardCreate, CardOut, CardUpdate

router = APIRouter(prefix="/cards", tags=["cards"])


@router.get("", response_model=list[CardOut])
async def list_cards(
    status: CardStatus | None = Query(None),
    employee_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(AccessCard)
    if status:
        stmt = stmt.where(AccessCard.status == status)
    if employee_id:
        stmt = stmt.where(AccessCard.employee_id == employee_id)
    stmt = stmt.order_by(AccessCard.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=CardOut, status_code=201)
async def create_card(data: CardCreate, db: AsyncSession = Depends(get_db)):
    card = AccessCard(**data.model_dump())
    db.add(card)
    await db.commit()
    await db.refresh(card)
    return card


@router.get("/{card_id}", response_model=CardOut)
async def get_card(card_id: int, db: AsyncSession = Depends(get_db)):
    card = await db.get(AccessCard, card_id)
    if card is None:
        raise HTTPException(404, "Card not found")
    return card


@router.patch("/{card_id}", response_model=CardOut)
async def update_card(card_id: int, data: CardUpdate, db: AsyncSession = Depends(get_db)):
    card = await db.get(AccessCard, card_id)
    if card is None:
        raise HTTPException(404, "Card not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(card, field, value)
    await db.commit()
    await db.refresh(card)
    return card


@router.delete("/{card_id}", status_code=204)
async def delete_card(card_id: int, db: AsyncSession = Depends(get_db)):
    card = await db.get(AccessCard, card_id)
    if card is None:
        raise HTTPException(404, "Card not found")
    await db.delete(card)
    await db.commit()
