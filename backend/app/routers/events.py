from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import TrafficEvent
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
import uuid

router = APIRouter(prefix="/events", tags=["events"])

class EventCreate(BaseModel):
    event_type: str
    priority: str
    zone: str
    road_closure: bool = False

class EventUpdate(BaseModel):
    road_closure: Optional[bool] = None

class EventResponse(EventCreate):
    id: uuid.UUID
    predicted_severity: Optional[float] = None
    predicted_resolution_time_mins: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

@router.post("/", response_model=EventResponse)
def create_event(event: EventCreate, db: Session = Depends(get_db)):
    db_event = TrafficEvent(**event.model_dump())
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

@router.get("/", response_model=List[EventResponse])
def get_events(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    events = db.query(TrafficEvent).offset(skip).limit(limit).all()
    return events

@router.put("/{event_id}", response_model=EventResponse)
def update_event(event_id: str, event: EventUpdate, db: Session = Depends(get_db)):
    try:
        uuid_obj = uuid.UUID(event_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")

    db_event = db.query(TrafficEvent).filter(TrafficEvent.id == uuid_obj).first()
    if db_event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    
    update_data = event.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_event, key, value)
        
    db.commit()
    db.refresh(db_event)
    return db_event
