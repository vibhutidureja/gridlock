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
    location: Optional[str] = None

class EventUpdate(BaseModel):
    road_closure: Optional[bool] = None

class EventResponse(EventCreate):
    id: uuid.UUID
    location: Optional[str] = None
    predicted_severity: Optional[float] = None
    predicted_resolution_time_mins: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

@router.post("/", response_model=EventResponse)
def create_event(event: EventCreate, db: Session = Depends(get_db)):
    # Auto-run ML predictions so fields are never null
    try:
        from app.ml_engine import ml_engine
        predictions = ml_engine.predict(event.event_type, event.priority, event.zone, event.road_closure)
        predicted_severity = predictions.get("predicted_severity", 5.0)
        predicted_resolution_time_mins = predictions.get("predicted_resolution_time_mins", 60)
    except Exception:
        predicted_severity = 5.0
        predicted_resolution_time_mins = 60

    # Use provided location or default to zone centroid
    location = event.location
    if not location:
        zone_coords = {
            "Central": "POINT(77.5946 12.9716)",
            "Koramangala": "POINT(77.6245 12.9352)",
            "Indiranagar": "POINT(77.6408 12.9784)",
            "Whitefield": "POINT(77.7499 12.9698)",
            "Electronic City": "POINT(77.6770 12.8399)",
            "Hebbal": "POINT(77.5970 13.0358)",
            "JP Nagar": "POINT(77.5837 12.9102)",
            "Jayanagar": "POINT(77.5830 12.9308)",
            "MG Road": "POINT(77.6099 12.9756)",
            "Marathahalli": "POINT(77.7003 12.9591)",
        }
        location = zone_coords.get(event.zone, "POINT(77.5946 12.9716)")

    db_event = TrafficEvent(
        **{k: v for k, v in event.model_dump().items() if k != "location"},
        location=location,
        predicted_severity=predicted_severity,
        predicted_resolution_time_mins=predicted_resolution_time_mins,
    )
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
