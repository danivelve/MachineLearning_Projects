"""Creates the tidy CSV tables that the Power BI dashboard reads (data/processed/powerbi/)."""
import json
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data/raw/bluebook-for-bulldozers"
PROCESSED = ROOT / "data/processed"
OUT = PROCESSED / "powerbi"
OUT.mkdir(parents=True, exist_ok=True)

AGE_LABELS = ["0-2", "3-5", "6-8", "9-11", "12-14", "15-19", "20-29", "30+"]
AGE_BINS = [0, 3, 6, 9, 12, 15, 20, 30, 100]
SIZE_ORDER = ["Mini", "Compact", "Small", "Medium", "Large / Medium", "Large", "Unspecified"]


def add_shared_columns(df):
    """Adds the date, machine age and size columns used by both sales tables."""
    df = df.copy()
    df["sale_year"] = df.saledate.dt.year
    df["sale_month"] = df.saledate.dt.month
    df["month_name"] = df.saledate.dt.strftime("%b")
    df["weekday_order"] = df.saledate.dt.dayofweek + 1
    df["weekday"] = df.saledate.dt.strftime("%a")
    df["year_made"] = df.YearMade.where(df.YearMade > 1900).astype("Int64")
    age = (df.sale_year - df.year_made).astype("Float64")
    df["machine_age"] = age.where(age >= 0).astype("Int64")
    band = pd.cut(df.machine_age.astype("float"), bins=AGE_BINS, right=False, labels=AGE_LABELS)
    df["age_band"] = band.astype("object").where(band.notna(), "Unknown")
    df["age_band_order"] = df.age_band.map({b: i + 1 for i, b in enumerate(AGE_LABELS + ["Unknown"])})
    df["product_size"] = df.ProductSize.fillna("Unspecified")
    df["product_size_order"] = df.product_size.map({s: i + 1 for i, s in enumerate(SIZE_ORDER)})
    df["product_group"] = df.ProductGroupDesc
    df["sale_date"] = df.saledate.dt.strftime("%Y-%m-%d")
    return df


SHARED = ["sale_date", "sale_year", "sale_month", "month_name", "weekday_order", "weekday", "state", "product_group",
          "product_size", "product_size_order", "year_made", "machine_age", "age_band", "age_band_order"]

# ---- sales: one row per auction sale ----
raw = pd.read_csv(RAW / "TrainAndValid.csv", low_memory=False, parse_dates=["saledate"]).sort_values("saledate")
sales = add_shared_columns(raw)
sales["sale_price"] = sales.SalePrice.astype(int)
sales["model_id"] = sales.ModelID
bins = list(range(0, 150001, 10000))
price_labels = [f"${b // 1000}-{(b + 10000) // 1000}k" for b in bins[:-1]]
sales["price_band"] = pd.cut(sales.sale_price, bins=bins, right=False, labels=price_labels).astype("object")
sales["price_band_order"] = sales.price_band.map({b: i + 1 for i, b in enumerate(price_labels)})
sales[SHARED + ["model_id", "sale_price", "price_band", "price_band_order"]].to_csv(OUT / "sales.csv", index=False)

# ---- test_predictions: CatBoost prices for the Kaggle test set ----
test = pd.read_csv(RAW / "Test.csv", low_memory=False, parse_dates=["saledate"])
preds = pd.read_csv(PROCESSED / "test_predictions_best_model.csv")
test = add_shared_columns(test.merge(preds, on="SalesID", validate="one_to_one"))
test["sales_id"] = test.SalesID
test["predicted_price"] = test.SalePrice.round(0).astype(int)
test[["sales_id"] + SHARED + ["predicted_price"]].to_csv(OUT / "test_predictions.csv", index=False)

# ---- data_quality: missing values per raw column ----
missing = (raw.isna().mean() * 100).round(2).sort_values(ascending=False)
pd.DataFrame({"column_name": missing.index, "pct_missing": missing.values / 100}).to_csv(OUT / "data_quality.csv", index=False)

# ---- model results ----
R = json.load(open(PROCESSED / "model_comparison_results.json", encoding="utf-8"))
rows = [{"model": "Original RF", "model_type": "Original", **{k: R["original_rf"].get(k) for k in ("RMSLE", "MAE", "R2")}}]
names = {"Random Forest": "RF new features", "HistGradientBoosting": "HistGradBoost"}
rows += [{"model": names.get(m, m), "model_type": "Single model", "RMSLE": v["RMSLE"], "MAE": v["MAE"], "R2": v["R2"]} for m, v in R["models"].items()]
rows += [{"model": "Top-3 blend", "model_type": "Blend", "RMSLE": R["blend"]["RMSLE"], "MAE": R["blend"]["MAE"], "R2": R["blend"]["R2"]}]
pd.DataFrame(rows).rename(columns=str.lower).to_csv(OUT / "model_scores.csv", index=False)

pd.DataFrame({"metric": ["Within 10%", "Within 25%"], "share": [R["within_10"], R["within_25"]]}).to_csv(OUT / "accuracy_summary.csv", index=False)
pd.DataFrame({"validation_year": list(R["time_cv"]), "rmsle": list(R["time_cv"].values())}).to_csv(OUT / "time_validation.csv", index=False)
lc = R["learning_curve"]
pd.DataFrame({"training_rows": lc["n"], "rows_label": [f"{n // 1000}k" for n in lc["n"]], "train_rmsle": lc["train"], "valid_rmsle": lc["valid"]}).to_csv(OUT / "learning_curve.csv", index=False)
pd.DataFrame({"feature": list(R["shap_top"]), "shap_importance": list(R["shap_top"].values())}).to_csv(OUT / "feature_importance.csv", index=False)
bands = [{"price_band": b, "band_order": i + 1, "rmsle": v["RMSLE"], "sales": int(v["n"]), "bias": v["bias %"] / 100} for i, (b, v) in enumerate(R["by_band"].items())]
pd.DataFrame(bands).to_csv(OUT / "error_by_price_band.csv", index=False, encoding="utf-8")

# ---- reconciliation against the figures published in the README ----
print("sales rows", len(sales), "| median", sales.sale_price.median(), "| mean", round(sales.sale_price.mean()), "| models", sales.model_id.nunique())
print("under 40k", round((sales.sale_price < 40000).mean(), 3), "| year_made blank", round(sales.year_made.isna().mean(), 4), "| YearMade=1000", round((raw.YearMade == 1000).mean(), 4))
print("unbanded prices", sales.price_band.isna().sum(), "| sizes", sales.product_size.value_counts().to_dict())
print("age medians", sales[sales.age_band != "Unknown"].groupby("age_band_order").sale_price.median().to_dict(), "| unknown age", (sales.age_band == "Unknown").sum())
print("group medians", sales.groupby("product_group").sale_price.median().to_dict())
st = sales.state.value_counts(normalize=True)
print("top state", st.index[0], round(st.iloc[0], 3), "| top5", round(st.iloc[:5].sum(), 3), "| year counts", sales.sale_year.value_counts().sort_index().iloc[[0, -4]].to_dict())
print("columns with gaps", int((missing > 0).sum()), "| over 50%", int((missing > 50).sum()), "of", len(missing))
print("test rows", len(test), "| median predicted", test.predicted_price.median(), "| unmatched", test.predicted_price.isna().sum())
for f in sorted(OUT.glob("*.csv")):
    print(f"{f.name:28}{f.stat().st_size / 1e6:8.2f} MB")
