from fastapi import FastAPI
from pydantic import BaseModel
from app.ml_engine import ml_engine
from app.knowledge_graph import kg
from app.simulation import simulator
from app.optimization import optimizer
from app.ai_orchestrator import ai_orchestrator
import uuid

from app.routers import events, predict

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="UrbanFlow Nexus", description="Traffic Intervention Intelligence Platform", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(events.router, prefix="/api/v1")
app.include_router(predict.router, prefix="/api/v1")
class EventIngestRequest(BaseModel):
    event_type: str
    priority: str
    zone: str
    road_closure: bool

class EventIngestResponse(BaseModel):
    event_id: str
    predicted_severity: float
    predicted_resolution_time_mins: int

class SimulateRequest(BaseModel):
    event_id: str
    event_type: str = "Accident"
    zone: str = "Central"
    predicted_severity: float = 5.0
    available_officers: int
    available_barricades: int

class SimulateResponse(BaseModel):
    recommended_strategy: str
    resources_allocated: dict
    ties_score: float
    expected_impact_reduction_pct: float
    operational_brief: str

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/v1/event/ingest", response_model=EventIngestResponse)
def ingest_event(request: EventIngestRequest):
    sev, time = ml_engine.predict(request.event_type, request.priority, request.zone, request.road_closure)
    
    return EventIngestResponse(
        event_id=str(uuid.uuid4()),
        predicted_severity=sev,
        predicted_resolution_time_mins=time
    )

@app.post("/api/v1/simulate", response_model=SimulateResponse)
def simulate_intervention(request: SimulateRequest):
    # 1. Knowledge Graph Retrieval
    historical_strategies = kg.find_successful_interventions(request.event_type, request.zone)
    # Get best historical strategy name if exists
    candidate_strategy = historical_strategies[0]["strategy_name"] if historical_strategies else "Deploy Officers + Upstream Diversion"

    # 2. Counterfactual Simulation
    impact_pct = simulator.simulate(request.zone, request.predicted_severity, candidate_strategy)
    
    # 3. Optimization
    alloc, ties, strat = optimizer.optimize_ties(request.available_officers, request.available_barricades, impact_pct)
    
    if ties == 0.0:
        # Fallback if no resources or impact
        strat = candidate_strategy
        
    # 4. Generative AI
    brief = ai_orchestrator.generate_operational_brief(
        event_type=request.event_type,
        zone=request.zone,
        severity=request.predicted_severity,
        recommended_strategy=strat,
        officers=alloc["officers"],
        barricades=alloc["barricades"],
        ties_score=ties
    )

    return SimulateResponse(
        recommended_strategy=strat,
        resources_allocated=alloc,
        ties_score=ties,
        expected_impact_reduction_pct=impact_pct,
        operational_brief=brief
    )
