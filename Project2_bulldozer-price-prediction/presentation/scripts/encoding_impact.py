"""Measures the effect of the notebook's test-time category encoding on accuracy.
Trains the notebook's ideal_model, then predicts 2012 validation rows two ways:
 (a) codes shared with training (as in the notebook's validation)  (b) codes rebuilt from the 2012 rows alone (as preprocess_data does for Test.csv)."""
import json, numpy as np, pandas as pd
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW, PROCESSED = ROOT / "data/raw/bluebook-for-bulldozers", ROOT / "data/processed"
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import root_mean_squared_log_error as rmsle, mean_absolute_error as mae

raw = pd.read_csv(RAW / "TrainAndValid.csv", low_memory=False, parse_dates=["saledate"]).sort_values("saledate")
test_raw = pd.read_csv(RAW / "Test.csv", low_memory=False, parse_dates=["saledate"])

def dates(df):
    df = df.copy()
    df["saleYear"] = df.saledate.dt.year; df["saleMonth"] = df.saledate.dt.month; df["saleDay"] = df.saledate.dt.day
    df["saleDayOfWeek"] = df.saledate.dt.dayofweek; df["saleDayOfYear"] = df.saledate.dt.dayofyear
    return df.drop("saledate", axis=1)

def notebook_style(df):  # = preprocess_data: codes built from this frame only
    df = dates(df)
    for c, s in list(df.items()):
        if pd.api.types.is_numeric_dtype(s):
            if s.isna().sum(): df[c + "_is_missing"] = s.isna(); df[c] = s.fillna(s.median())
        else:
            df[c + "_is_missing"] = s.isna(); df[c] = pd.Categorical(s).codes + 1
    return df

full = notebook_style(raw)                       # training encoding (as df_tmp)
cats = {c: pd.Categorical(raw[c]).categories for c in raw.columns if not pd.api.types.is_numeric_dtype(raw[c]) and c != "saledate"}
med = {c: raw[c].median() for c in ["auctioneerID", "MachineHoursCurrentMeter"]}

def consistent(df):  # reuse training categories + training medians
    df = dates(df)
    for c, s in list(df.items()):
        if c in cats:
            df[c + "_is_missing"] = s.isna(); df[c] = pd.Categorical(s, categories=cats[c]).codes + 1
        elif c in med:
            df[c + "_is_missing"] = s.isna(); df[c] = s.fillna(med[c])
    return df

tr = full[full.saleYear != 2012]; va = full[full.saleYear == 2012]
X, y = tr.drop("SalePrice", axis=1), tr.SalePrice
rf = RandomForestRegressor(n_estimators=40, min_samples_leaf=1, min_samples_split=14, max_features=0.5, n_jobs=-1, random_state=42).fit(X, y)
cols = X.columns
def align(df):
    for c in cols:
        if c not in df: df[c] = False
    return df[cols]

yv = va.SalePrice
pa = rf.predict(va[cols])
vb_raw = raw[raw.saledate.dt.year == 2012].drop("SalePrice", axis=1)
pb = rf.predict(align(notebook_style(vb_raw)))
pc = rf.predict(align(consistent(vb_raw)))
t_nb = rf.predict(align(notebook_style(test_raw)))
t_ok = rf.predict(align(consistent(test_raw)))
out = dict(
    valid_shared=dict(rmsle=rmsle(yv, pa), mae=mae(yv, pa)),
    valid_separate=dict(rmsle=rmsle(yv, pb), mae=mae(yv, pb)),
    valid_fixed=dict(rmsle=rmsle(yv, pc), mae=mae(yv, pc)),
    test_notebook_first5=t_nb[:5].round(0).tolist(), test_fixed_first5=t_ok[:5].round(0).tolist(),
    test_notebook_median=float(np.median(t_nb)), test_fixed_median=float(np.median(t_ok)),
    test_notebook_max=float(t_nb.max()), test_fixed_max=float(t_ok.max()),
    test_median_abs_change_pct=float(np.median(np.abs(t_ok - t_nb) / t_nb) * 100),
)
pd.DataFrame({"SalesID": test_raw.SalesID, "SalePrice": t_ok}).to_csv(PROCESSED / "test_predictions_fixed.csv", index=False)
json.dump(out, open(PROCESSED / "encoding_results.json", "w"), indent=1, default=float)
print(json.dumps(out, indent=1, default=float))
