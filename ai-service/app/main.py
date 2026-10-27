"""
FoodShare AI/ML Microservice
------------------------------
Standalone Python service that provides the "intelligence" behind two
modules of the AI Powered Smart Surplus Food Redistribution and Waste
Reduction System:

  1. Priority-Based Smart Allocation / AI-Assisted Beneficiary
     Recommendation  ->  POST /recommend/priority
  2. AI-Based Surplus Prediction                ->  POST /predict/surplus

It is intentionally decoupled from persistence: MongoDB access, business
rules and orchestration all live in the Spring Boot backend
(backend-spring/src/main/java/com/foodshare/service/AIClientService.java),
which calls this service over plain HTTP/JSON. That keeps the AI/ML layer
free to be developed, tested, scaled, and deployed independently (its own
container, its own model versioning, GPU nodes if ever needed) without
touching the Java codebase.

Run locally:
    pip install -r requirements.txt
    uvicorn app.main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import (
    PriorityRequest, PriorityResponse,
    PredictionRequest, PredictionResponse,
)
from app.ml.priority import rank_requests
from app.ml.prediction_old import predict_surplus

app = FastAPI(
    title="Zero Waste AI/ML Service",
    description="Beneficiary priority ranking and surplus-food forecasting for the Zero Waste platform.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # internal service-to-service call from Spring Boot only
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "Zero Waste AI/ML Service"}


@app.post("/recommend/priority", response_model=PriorityResponse)
def recommend_priority(payload: PriorityRequest):
    """
    AI-Assisted Beneficiary Recommendation.
    Ranks all pending requests for a single surplus item by a weighted
    priority score (urgency, distance, org size, capacity, fair-share
    history). Called by Spring Boot's AIClientService.rankRequests().
    """
    ranking = rank_requests(payload)
    return PriorityResponse(ranking=ranking)


@app.post("/predict/surplus", response_model=PredictionResponse)
def predict(payload: PredictionRequest):
    """
    AI-Based Surplus Prediction Module.
    Fits a per-category linear trend model (scikit-learn) over the supplied
    historical inventory data and forecasts surplus quantities for the
    requested horizon. Called by Spring Boot's AIClientService.predictSurplus().
    """
    predictions = predict_surplus(payload.history, payload.daysAhead)
    total = round(sum(predictions.values()), 1)
    return PredictionResponse(
        daysAhead=payload.daysAhead,
        predictions=predictions,
        totalPredictedKg=total,
        note=(
            "Forecast generated using a per-category scikit-learn LinearRegression "
            f"model fit over {len(payload.history)} historical data points."
        ),
    )


# ================= NEW: Trained ML surplus model =================
from pydantic import BaseModel
from fastapi import HTTPException
from app.ml.prediction import predict_surplus as ml_predict_surplus
from app.ml.prediction import reload_model as ml_reload_model


class MLSurplusRequest(BaseModel):
    category: str
    history: list[float]
    daysAhead: int = 7


@app.post("/predict/surplus-ml")
def surplus_ml(req: MLSurplusRequest):
    try:
        return ml_predict_surplus(req.category, req.history, req.daysAhead)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))