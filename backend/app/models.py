from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey
from app.database import Base
import uuid
import datetime

class TrafficEvent(Base):
    __tablename__ = "traffic_events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    event_type = Column(String, index=True)
    priority = Column(String)
    zone = Column(String)
    road_closure = Column(Boolean, default=False)
    predicted_severity = Column(Float, nullable=True)
    predicted_resolution_time_mins = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    location = Column(String, nullable=True)

class SimulatedIntervention(Base):
    __tablename__ = "simulated_interventions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    event_id = Column(String, ForeignKey("traffic_events.id"))
    strategy_name = Column(String)
    officers_deployed = Column(Integer, default=0)
    barricades_deployed = Column(Integer, default=0)
    impact_reduction_pct = Column(Float, nullable=True)
    ties_score = Column(Float, nullable=True)
    is_final_selection = Column(Boolean, default=False)
