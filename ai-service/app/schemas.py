"""
Pydantic request/response models for the FoodShare AI/ML microservice.
These mirror the JSON payloads sent by the Spring Boot backend's
AIClientService (see backend-spring/src/main/java/com/foodshare/service/AIClientService.java).
"""
from typing import Dict, List, Optional
from pydantic import BaseModel


# ---------- Priority / beneficiary recommendation ----------

class RequestItem(BaseModel):
    id: str
    itemId: str
    beneficiaryId: str
    quantityKg: float
    urgency: str = "medium"
    distanceKm: float = 10.0
    status: str = "pending"


class BeneficiaryProfile(BaseModel):
    id: str
    organizationName: Optional[str] = "Unknown"
    organizationSize: Optional[int] = 0
    handlingCapacityKg: Optional[float] = 0.0
    allocationsLast30Days: Optional[int] = 0


class ItemInfo(BaseModel):
    id: str
    name: Optional[str] = None
    category: Optional[str] = None


class PriorityRequest(BaseModel):
    item: ItemInfo
    requests: List[RequestItem]
    beneficiaries: List[BeneficiaryProfile]


class RankedRequest(BaseModel):
    requestId: str
    beneficiaryId: str
    beneficiaryName: str
    score: float
    # Per-factor 0-1 scores and the weight each carries, so the UI can explain the ranking.
    factors: Dict[str, float] = {}
    weights: Dict[str, float] = {}


class PriorityResponse(BaseModel):
    ranking: List[RankedRequest]


# ---------- Surplus prediction ----------

class HistoryEntry(BaseModel):
    category: str
    date: str  # ISO date string, e.g. "2026-08-15"
    quantityKg: float


class PredictionRequest(BaseModel):
    daysAhead: int = 7
    history: List[HistoryEntry]


class PredictionResponse(BaseModel):
    daysAhead: int
    predictions: dict[str, float]
    totalPredictedKg: float
    note: str
