"""
Train the surplus prediction model (version 2 - works for any donor size).

Idea: the model learns the SHAPE of the pattern, not the SIZE.
  ratio = today's surplus / last 7-day average
So a small shop (40 kg/day) and a big supermarket (700 kg/day) can both use it.

Input:  data/surplus_data.csv  (category, date, quantityKg)
Output: models/surplus_model.joblib  + printed MAE / RMSE table (in kg)
"""
import json
import os
from datetime import datetime, timezone
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error

DATA_FILE = "data/surplus_data.csv"
MODEL_FILE = "models/surplus_model.joblib"
INFO_FILE = "models/model_info.json"   # same facts as the bundle, readable without loading the model
DATASET = "Kaggle Store Item Demand Forecasting dataset"
FEATURES = ["dow", "month", "r_lag1", "r_lag7", "cat_code"]

# ---------- 1. read data ----------
data = pd.read_csv(DATA_FILE, parse_dates=["date"])
data = data.sort_values(["category", "date"]).reset_index(drop=True)
categories = sorted(data["category"].unique())

# ---------- 2. make "clues" (features) ----------
g = data.groupby("category")["quantityKg"]
data["roll7"] = g.transform(lambda s: s.shift(1).rolling(7).mean())  # last 7-day avg
data["lag1"] = g.shift(1)                                             # yesterday
data["lag7"] = g.shift(7)                                             # same day last week
data = data.dropna()
data = data[data["roll7"] > 0].copy()

data["dow"] = data["date"].dt.dayofweek          # 0=Mon ... 6=Sun
data["month"] = data["date"].dt.month
data["r_lag1"] = data["lag1"] / data["roll7"]
data["r_lag7"] = data["lag7"] / data["roll7"]
data["cat_code"] = data["category"].apply(categories.index)
data["target"] = data["quantityKg"] / data["roll7"]   # what we want to learn

# ---------- 3. split: old days = study, last 20% days = exam ----------
cut = data["date"].quantile(0.8)
train, test = data[data["date"] <= cut], data[data["date"] > cut]
print(f"Train rows: {len(train)}   Test rows: {len(test)}")

# ---------- 4. train & compare (errors shown in kg) ----------
models = {
    "LinearRegression": LinearRegression(),
    "RandomForest": RandomForestRegressor(n_estimators=200, min_samples_leaf=5,
                                          random_state=42, n_jobs=-1),
}
results = {}
print("\nModel                 MAE(kg)   RMSE(kg)")
base = test["roll7"]
baseline_mae = mean_absolute_error(test.quantityKg, base)
baseline_rmse = mean_squared_error(test.quantityKg, base) ** 0.5
print(f"{'Baseline (7-day avg)':<20} {baseline_mae:9.2f} {baseline_rmse:9.2f}")
for name, model in models.items():
    model.fit(train[FEATURES], train["target"])
    pred_kg = (model.predict(test[FEATURES]) * test["roll7"]).clip(lower=0)
    mae = mean_absolute_error(test["quantityKg"], pred_kg)
    rmse = mean_squared_error(test["quantityKg"], pred_kg) ** 0.5
    results[name] = (model, mae, rmse)
    print(f"{name:<20} {mae:9.2f} {rmse:9.2f}")

# ---------- 5. save the best one ----------
best = min(results, key=lambda k: results[k][1])
os.makedirs("models", exist_ok=True)
# the scores travel with the model so the admin pages can show them
evaluation = [{"model": "Baseline (7-day average)", "mae": round(baseline_mae, 2), "rmse": round(baseline_rmse, 2)}]
evaluation += [{"model": k, "mae": round(v[1], 2), "rmse": round(v[2], 2)} for k, v in results.items()]
info = {"model": best, "version": 2, "dataset": DATASET, "features": FEATURES, "categories": categories,
        "mae": round(results[best][1], 2), "rmse": round(results[best][2], 2),
        "baselineMae": round(baseline_mae, 2), "evaluation": evaluation,
        "trainRows": len(train), "testRows": len(test),
        "trainedAt": datetime.now(timezone.utc).isoformat(timespec="seconds")}
joblib.dump({"model": results[best][0], "features": FEATURES,
             "categories": categories, "model_name": best, "version": 2,
             "mae": info["mae"], "rmse": info["rmse"], "baseline_mae": info["baselineMae"],
             "compared": {k: round(v[1], 2) for k, v in results.items()},
             "evaluation": evaluation, "dataset": DATASET,
             "train_rows": len(train), "test_rows": len(test),
             "trained_at": info["trainedAt"]}, MODEL_FILE)
with open(INFO_FILE, "w", encoding="utf-8") as f:
    json.dump(info, f, indent=2)
print(f"\nBest model = {best}  -> saved to {MODEL_FILE}")