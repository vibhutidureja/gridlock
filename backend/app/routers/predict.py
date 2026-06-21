from fastapi import APIRouter
from pydantic import BaseModel
from app.ml_engine import ml_engine

router = APIRouter(prefix="/predict-impact", tags=["predictions"])

class PredictRequest(BaseModel):
    event_type: str
    priority: str
    zone: str
    road_closure: bool

class PredictResponse(BaseModel):
    predicted_severity: float
    predicted_resolution_time_mins: int

@router.post("/", response_model=PredictResponse)
def predict_impact(request: PredictRequest):
    predictions = ml_engine.predict(request.event_type, request.priority, request.zone, request.road_closure)
    return PredictResponse(
        predicted_severity=predictions["predicted_severity"],
        predicted_resolution_time_mins=predictions["predicted_resolution_time_mins"]
    )
