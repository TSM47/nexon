import enum
from datetime import datetime

from sqlalchemy import (
    Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class AccessLevel(str, enum.Enum):
    guest = "guest"
    employee = "employee"
    manager = "manager"
    admin = "admin"


class DoorStatus(str, enum.Enum):
    open = "open"
    locked = "locked"
    alarm = "alarm"


class CardStatus(str, enum.Enum):
    active = "active"
    blocked = "blocked"
    expired = "expired"


class EventType(str, enum.Enum):
    entry = "entry"
    exit = "exit"
    denied = "denied"
    alarm = "alarm"


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(30))
    department: Mapped[str | None] = mapped_column(String(100))
    position: Mapped[str | None] = mapped_column(String(100))
    access_level: Mapped[AccessLevel] = mapped_column(Enum(AccessLevel), default=AccessLevel.employee)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    hired_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    cards: Mapped[list["AccessCard"]] = relationship("AccessCard", back_populates="employee")
    events: Mapped[list["AccessEvent"]] = relationship("AccessEvent", back_populates="employee")


class Door(Base):
    __tablename__ = "doors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    zone: Mapped[str | None] = mapped_column(String(100))
    door_type: Mapped[str] = mapped_column(String(50), default="door")
    reader_type: Mapped[str] = mapped_column(String(50), default="rfid")
    status: Mapped[DoorStatus] = mapped_column(Enum(DoorStatus), default=DoorStatus.locked)
    controller_id: Mapped[str | None] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    events: Mapped[list["AccessEvent"]] = relationship("AccessEvent", back_populates="door")


class AccessCard(Base):
    __tablename__ = "access_cards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    card_number: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    employee_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"), nullable=True)
    card_type: Mapped[str] = mapped_column(String(30), default="permanent")
    status: Mapped[CardStatus] = mapped_column(Enum(CardStatus), default=CardStatus.active)
    access_level: Mapped[AccessLevel] = mapped_column(Enum(AccessLevel), default=AccessLevel.employee)
    valid_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    valid_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    employee: Mapped["Employee | None"] = relationship("Employee", back_populates="cards")
    events: Mapped[list["AccessEvent"]] = relationship("AccessEvent", back_populates="card")


class AccessEvent(Base):
    __tablename__ = "access_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event_type: Mapped[EventType] = mapped_column(Enum(EventType))
    employee_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"), nullable=True)
    door_id: Mapped[int | None] = mapped_column(ForeignKey("doors.id"), nullable=True)
    card_id: Mapped[int | None] = mapped_column(ForeignKey("access_cards.id"), nullable=True)
    note: Mapped[str | None] = mapped_column(Text)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    employee: Mapped["Employee | None"] = relationship("Employee", back_populates="events")
    door: Mapped["Door | None"] = relationship("Door", back_populates="events")
    card: Mapped["AccessCard | None"] = relationship("AccessCard", back_populates="events")


class Visitor(Base):
    __tablename__ = "visitors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    company: Mapped[str | None] = mapped_column(String(200))
    host_employee_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"), nullable=True)
    expected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    checked_in_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    checked_out_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    purpose: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
