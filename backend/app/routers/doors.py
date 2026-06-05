from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Door, DoorStatus
from ..mqtt import publish
from ..schemas import DoorCommand, DoorCreate, DoorOut, DoorUpdate
from ..ws import manager

router = APIRouter(prefix="/doors", tags=["doors"])


@router.get("", response_model=list[DoorOut])
async def list_doors(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Door).order_by(Door.name))
    return result.scalars().all()


@router.post("", response_model=DoorOut, status_code=201)
async def create_door(data: DoorCreate, db: AsyncSession = Depends(get_db)):
    door = Door(**data.model_dump())
    db.add(door)
    await db.commit()
    await db.refresh(door)
    return door


@router.get("/{door_id}", response_model=DoorOut)
async def get_door(door_id: int, db: AsyncSession = Depends(get_db)):
    door = await db.get(Door, door_id)
    if door is None:
        raise HTTPException(404, "Door not found")
    return door


@router.patch("/{door_id}", response_model=DoorOut)
async def update_door(door_id: int, data: DoorUpdate, db: AsyncSession = Depends(get_db)):
    door = await db.get(Door, door_id)
    if door is None:
        raise HTTPException(404, "Door not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(door, field, value)
    await db.commit()
    await db.refresh(door)
    return door


@router.post("/{door_id}/command", response_model=DoorOut)
async def send_command(door_id: int, cmd: DoorCommand, db: AsyncSession = Depends(get_db)):
    door = await db.get(Door, door_id)
    if door is None:
        raise HTTPException(404, "Door not found")
    door.status = cmd.command
    await db.commit()
    await db.refresh(door)
    # push to MQTT and WS
    payload = {"door_id": door_id, "status": cmd.command.value}
    await publish(f"nexon/doors/{door_id}/status", payload)
    await manager.broadcast({"type": "door_status", **payload})
    return door


@router.delete("/{door_id}", status_code=204)
async def delete_door(door_id: int, db: AsyncSession = Depends(get_db)):
    door = await db.get(Door, door_id)
    if door is None:
        raise HTTPException(404, "Door not found")
    await db.delete(door)
    await db.commit()
