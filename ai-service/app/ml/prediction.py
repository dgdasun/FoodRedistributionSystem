"""
Use the saved (trained) surplus model inside FastAPI.  (version 2)

- Works for any donor size (model predicts a ratio of the 7-day average).
- Accepts category names in any style: "dairy", "Dairy", "fruit", "Fruits"...
- Unknown category -> uses the general pattern of all categories.
- Fewer than 7 days of history -> missing days are filled with the average.
"""
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
import joblib
import pandas as pd

# ai-service/models/surplus_model.joblib, wherever uvicorn is started from
MODEL_FILE = Path(__file__).resolve().parents[2] / "models" / "surplus_model.joblib"
_bundle = None   # loaded ONCE, on the first prediction


def _get_bundle():
    # A missing model must not crash the whole service: the backend falls
    # back to the simple trend model when /predict/surplus-ml fails.
    global _bundle
    if _bundle is None:
        if not MODEL_FILE.exists():
            raise RuntimeError(f"Trained model not found at {MODEL_FILE} - run app/ml/train.py")
        _bundle = joblib.load(MODEL_FILE)
    return _bundle

ALIASES = {
    "vegetable": "Vegetables", "vegetables": "Vegetables", "veg": "Vegetables",
    "fruit": "Fruits", "fruits": "Fruits",
    "dairy": "Dairy", "milk": "Dairy",
    "bakery": "Bakery", "bread": "Bakery",
    "cooked": "Cooked Meals", "cooked meals": "Cooked Meals", "cooked food": "Cooked Meals",
    "meals": "Cooked Meals", "prepared food": "Cooked Meals",
}


def reload_model():
    global _bundle
    _bundle = None
    _get_bundle()


def model_info() -> dict:
    """What the dashboard shows about the serving model. Older bundles carry no scores."""
    bundle = _get_bundle()
    trained_at = bundle.get("trained_at") or datetime.fromtimestamp(
        MODEL_FILE.stat().st_mtime, timezone.utc).isoformat(timespec="seconds")
    return {"available": True, "model": bundle["model_name"], "version": bundle.get("version"),
            "mae": bundle.get("mae"), "rmse": bundle.get("rmse"),
            "baselineMae": bundle.get("baseline_mae"), "compared": bundle.get("compared"),
            "trainRows": bundle.get("train_rows"), "testRows": bundle.get("test_rows"),
            "categories": bundle["categories"], "trainedAt": trained_at}


def _match_category(category: str):
    key = (category or "").strip().lower()
    for c in _get_bundle()["categories"]:
        if c.lower() == key:
            return c
    return ALIASES.get(key)          # None = unknown


def predict_surplus(category: str, history: list[float], days_ahead: int = 7) -> dict:
    """history = past daily surplus values (kg) for this category, oldest first."""
    if not history:
        raise ValueError("history must contain at least 1 value")
    bundle = _get_bundle()
    model, cats, feats = bundle["model"], bundle["categories"], bundle["features"]

    matched = _match_category(category)
    codes = [cats.index(matched)] if matched else list(range(len(cats)))

    hist = [max(float(x), 0.0) for x in history]
    if len(hist) < 7:                                    # pad short history
        avg = sum(hist) / len(hist)
        hist = [avg] * (7 - len(hist)) + hist

    daily = []
    for i in range(1, days_ahead + 1):
        d = date.today() + timedelta(days=i)
        roll7 = sum(hist[-7:]) / 7
        if roll7 <= 0:
            y = 0.0
        else:
            rows = pd.DataFrame([{
                "dow": d.weekday(), "month": d.month,
                "r_lag1": hist[-1] / roll7, "r_lag7": hist[-7] / roll7,
                "cat_code": code,
            } for code in codes])[feats]
            ratio = float(model.predict(rows).mean())
            y = max(ratio * roll7, 0.0)                  # no negative kg
        daily.append({"date": d.isoformat(), "quantityKg": round(y, 2)})
        hist.append(y)                                   # tomorrow uses today's guess

    return {"category": category, "matchedCategory": matched or "general",
            "model": bundle["model_name"], "daily": daily,
            "totalKg": round(sum(x["quantityKg"] for x in daily), 2)}