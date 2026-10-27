"""
STEP 3 - Kaggle data -> our system format (category, date, quantityKg)

Kaggle file: data/train.csv  (columns: date, store, item, sales)
Output:      data/surplus_data.csv (columns: category, date, quantityKg)

Idea (simple):
  Shop brings a bit MORE than usual every day (last 7-day average + 20%).
  Whatever is NOT sold that day = SURPLUS (leftover food).
"""
import pandas as pd

RAW_FILE = "data/train.csv"
OUT_FILE = "data/surplus_data.csv"
EXTRA_STOCK = 1.20   # shop orders 20% more than recent average
KG_PER_UNIT = 0.5    # 1 sold unit ~ 0.5 kg (assumption, write it in the report)

# 50 items -> 5 food categories (10 items each)
CATEGORIES = ["Vegetables", "Fruits", "Dairy", "Bakery", "Cooked Meals"]

def item_to_category(item_no: int) -> str:
    return CATEGORIES[(item_no - 1) // 10]

df = pd.read_csv(RAW_FILE, parse_dates=["date"])
df["category"] = df["item"].apply(item_to_category)

# all stores + items in a category -> one number per day
daily = df.groupby(["category", "date"])["sales"].sum().reset_index()
daily = daily.sort_values(["category", "date"])

# stock = yesterday's 7-day average x 1.2
daily["stock"] = (daily.groupby("category")["sales"]
                  .transform(lambda s: s.shift(1).rolling(7).mean()) * EXTRA_STOCK)
daily = daily.dropna()

# surplus = stock - sold  (never below 0)
daily["quantityKg"] = ((daily["stock"] - daily["sales"]).clip(lower=0) * KG_PER_UNIT).round(2)

daily[["category", "date", "quantityKg"]].to_csv(OUT_FILE, index=False)
print("Saved", len(daily), "rows ->", OUT_FILE)
print(daily[["category", "date", "quantityKg"]].head(10))
