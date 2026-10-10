"""
AI-Assisted Beneficiary Recommendation / Priority-Based Smart Allocation.

Scores each pending request for a surplus item using a weighted combination
of:
  - urgency level declared by the beneficiary
  - distance from the collection point (closer = higher priority)
  - organization size (more people served = higher priority)
  - handling capacity (can they realistically take the food?)
  - recent allocation history (fewer recent allocations = fairer priority,
    so the same well-connected NGO doesn't always win)

This is a transparent, auditable rule-based scoring model - a common and
explainable approach for allocation systems handling essential resources
(food, medical supplies, disaster aid) where a black-box model would be
harder to justify to beneficiaries and regulators. The weights below are
tunable constants; swapping this for a trained model (e.g. a learned
ranking/LTR model fit on historical approval outcomes) only requires
changing the `score_request` function - the FastAPI route and Spring Boot
contract stay identical.
"""
from typing import List
from app.schemas import PriorityRequest, RankedRequest, BeneficiaryProfile, RequestItem

URGENCY_WEIGHTS = {"critical": 1.0, "high": 0.75, "medium": 0.5, "low": 0.25}

W_URGENCY = 0.40
W_DISTANCE = 0.20
W_ORG_SIZE = 0.15
W_CAPACITY = 0.15
W_HISTORY = 0.10


def _normalize(value: float, max_value: float) -> float:
    if not max_value:
        return 0.0
    return min(value / max_value, 1.0)


def score_request(request: RequestItem, beneficiary: BeneficiaryProfile) -> float:
    urgency_score = URGENCY_WEIGHTS.get(request.urgency, 0.5)
    distance_score = 1 - _normalize(request.distanceKm, 50)
    size_score = _normalize(beneficiary.organizationSize or 1, 500)
    capacity_score = _normalize(beneficiary.handlingCapacityKg or 50, 500)
    history_penalty = _normalize(beneficiary.allocationsLast30Days or 0, 10)

    score = (
        urgency_score * W_URGENCY
        + distance_score * W_DISTANCE
        + size_score * W_ORG_SIZE
        + capacity_score * W_CAPACITY
        + (1 - history_penalty) * W_HISTORY
    )
    return round(score, 3)


def rank_requests(payload: PriorityRequest) -> List[RankedRequest]:
    beneficiary_by_id = {b.id: b for b in payload.beneficiaries}
    pending = [r for r in payload.requests if r.status == "pending"]

    ranked = []
    for r in pending:
        beneficiary = beneficiary_by_id.get(r.beneficiaryId)
        score = score_request(r, beneficiary) if beneficiary else 0.0
        ranked.append(RankedRequest(
            requestId=r.id,
            beneficiaryId=r.beneficiaryId,
            beneficiaryName=beneficiary.organizationName if beneficiary else "Unknown",
            score=score,
        ))

    ranked.sort(key=lambda x: x.score, reverse=True)
    return ranked
