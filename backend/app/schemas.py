from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator

from .models import AccessLevel, CardStatus, DoorStatus, EventType


# ── Employee ──────────────────────────────────────────────────────────────

class EmployeeCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    access_level: AccessLevel = AccessLevel.employee
    hired_at: Optional[datetime] = None


class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    access_level: Optional[AccessLevel] = None
    is_active: Optional[bool] = None


class EmployeeOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    first_name: str
    last_name: str
    email: str
    phone: Optional[str]
    department: Optional[str]
    position: Optional[str]
    access_level: AccessLevel
    is_active: bool
    hired_at: Optional[datetime]
    created_at: datetime


# ── Door ─────────────────────────────────────────────────────────────────

class DoorCreate(BaseModel):
    name: str
    zone: Optional[str] = None
    door_type: str = "door"
    reader_type: str = "rfid"
    status: DoorStatus = DoorStatus.locked
    controller_id: Optional[str] = None


class DoorUpdate(BaseModel):
    name: Optional[str] = None
    zone: Optional[str] = None
    status: Optional[DoorStatus] = None
    is_active: Optional[bool] = None


class DoorCommand(BaseModel):
    command: DoorStatus


class DoorOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    name: str
    zone: Optional[str]
    door_type: str
    reader_type: str
    status: DoorStatus
    controller_id: Optional[str]
    is_active: bool
    created_at: datetime


# ── Access card ───────────────────────────────────────────────────────────

class CardCreate(BaseModel):
    card_number: str
    employee_id: Optional[int] = None
    card_type: str = "permanent"
    access_level: AccessLevel = AccessLevel.employee
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None


class CardUpdate(BaseModel):
    status: Optional[CardStatus] = None
    employee_id: Optional[int] = None
    access_level: Optional[AccessLevel] = None
    valid_until: Optional[datetime] = None


class CardOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    card_number: str
    employee_id: Optional[int]
    card_type: str
    status: CardStatus
    access_level: AccessLevel
    valid_from: Optional[datetime]
    valid_until: Optional[datetime]
    created_at: datetime


# ── Event ─────────────────────────────────────────────────────────────────

class EventCreate(BaseModel):
    event_type: EventType
    employee_id: Optional[int] = None
    door_id: Optional[int] = None
    card_id: Optional[int] = None
    note: Optional[str] = None


class EventOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    event_type: EventType
    employee_id: Optional[int]
    door_id: Optional[int]
    card_id: Optional[int]
    note: Optional[str]
    occurred_at: datetime


# ── Visitor ───────────────────────────────────────────────────────────────

class VisitorCreate(BaseModel):
    first_name: str
    last_name: str
    company: Optional[str] = None
    host_employee_id: Optional[int] = None
    expected_at: Optional[datetime] = None
    purpose: Optional[str] = None


class VisitorUpdate(BaseModel):
    checked_in_at: Optional[datetime] = None
    checked_out_at: Optional[datetime] = None


class VisitorOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    first_name: str
    last_name: str
    company: Optional[str]
    host_employee_id: Optional[int]
    expected_at: Optional[datetime]
    checked_in_at: Optional[datetime]
    checked_out_at: Optional[datetime]
    purpose: Optional[str]
    created_at: datetime


# ── Stats ─────────────────────────────────────────────────────────────────

class OverviewStats(BaseModel):
    people_inside: int
    total_employees: int
    events_today: int
    denied_today: int
    open_doors: int
    locked_doors: int
    alarm_doors: int
    visitors_today: int
