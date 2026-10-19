"""
AI-Based Surplus Prediction Module.

For each food category, fits a scikit-learn LinearRegression model over the
last N days of (dummy) historical inventory data - day index as the
feature, quantity donated (kg) as the target - then extrapolates forward to
forecast total expected surplus over the requested horizon. This is a small,
fast, fully-interpretable model appropriate for the size of dataset produced
by a single supermarket chain's inventory history, and is easy to swap out
for a more sophisticated time-series model (e.g. Prophet, ARIMA, or an
LSTM) as more real historical data becomes available - the module's
public function signature (`predict_surplus`) is what the FastAPI route and
Spring Boot backend depend on, so any future upgrade is an internal-only
change here.
"""
from collections import defaultdict
from datetime import date, datetime
from typing import Dict, List

try:
    import numpy as np
    from sklearn.linear_model import LinearRegression
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

from app.schemas import HistoryEntry


def _parse_date(d: str) -> date:
    return datetime.strptime(d, "%Y-%m-%d").date()


def _fit_linear_pure_python(y_vals: List[float], days_ahead: int) -> float:
    n = len(y_vals)
    x_mean = (n - 1) / 2.0
    y_mean = sum(y_vals) / float(n)
    
    denom = sum((i - x_mean) ** 2 for i in range(n))
    if denom == 0:
        slope = 0.0
    else:
        numer = sum((i - x_mean) * (y_vals[i] - y_mean) for i in range(n))
        slope = numer / denom
    intercept = y_mean - slope * x_mean

    future_preds = [max(0.0, intercept + slope * (n + i)) for i in range(days_ahead)]
    return sum(future_preds) / float(days_ahead)


def predict_surplus(history: List[HistoryEntry], days_ahead: int = 7) -> Dict[str, float]:
    by_category: Dict[str, List[HistoryEntry]] = defaultdict(list)
    for entry in history:
        by_category[entry.category].append(entry)

    predictions: Dict[str, float] = {}

    for category, entries in by_category.items():
        if not entries:
            predictions[category] = 0.0
            continue

        sorted_entries = sorted(entries, key=lambda e: _parse_date(e.date))
        y_vals = [float(e.quantityKg) for e in sorted_entries]

        if len(sorted_entries) < 2:
            predicted_daily = float(y_vals[0])
        elif HAS_SKLEARN:
            X = np.array([[i] for i in range(len(sorted_entries))])
            y = np.array(y_vals)
            model = LinearRegression()
            model.fit(X, y)
            future_idx = np.array([[len(sorted_entries) + i] for i in range(days_ahead)])
            future_preds = model.predict(future_idx)
            future_preds = np.clip(future_preds, a_min=0, a_max=None)
            predicted_daily = float(np.mean(future_preds))
        else:
            predicted_daily = _fit_linear_pure_python(y_vals, days_ahead)

        total_predicted = round(max(predicted_daily, 0) * days_ahead, 1)
        predictions[category] = total_predicted

    return predictions

