from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Employee
from ..schemas import EmployeeCreate, EmployeeOut, EmployeeUpdate

router = APIRouter(prefix="/employees", tags=["employees"])


@router.get("", response_model=list[EmployeeOut])
async def list_employees(
    active: bool | None = Query(None),
    department: str | None = Query(None),
    q: str | None = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Employee)
    if active is not None:
        stmt = stmt.where(Employee.is_active == active)
    if department:
        stmt = stmt.where(Employee.department == department)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            Employee.first_name.ilike(like)
            | Employee.last_name.ilike(like)
            | Employee.email.ilike(like)
        )
    stmt = stmt.offset(skip).limit(limit).order_by(Employee.last_name)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=EmployeeOut, status_code=201)
async def create_employee(data: EmployeeCreate, db: AsyncSession = Depends(get_db)):
    emp = Employee(**data.model_dump())
    db.add(emp)
    await db.commit()
    await db.refresh(emp)
    return emp


@router.get("/{employee_id}", response_model=EmployeeOut)
async def get_employee(employee_id: int, db: AsyncSession = Depends(get_db)):
    emp = await db.get(Employee, employee_id)
    if emp is None:
        raise HTTPException(404, "Employee not found")
    return emp


@router.patch("/{employee_id}", response_model=EmployeeOut)
async def update_employee(employee_id: int, data: EmployeeUpdate, db: AsyncSession = Depends(get_db)):
    emp = await db.get(Employee, employee_id)
    if emp is None:
        raise HTTPException(404, "Employee not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(emp, field, value)
    await db.commit()
    await db.refresh(emp)
    return emp


@router.delete("/{employee_id}", status_code=204)
async def delete_employee(employee_id: int, db: AsyncSession = Depends(get_db)):
    emp = await db.get(Employee, employee_id)
    if emp is None:
        raise HTTPException(404, "Employee not found")
    await db.delete(emp)
    await db.commit()
