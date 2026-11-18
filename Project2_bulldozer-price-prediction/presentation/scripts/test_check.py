"""Replicates notebook cells 93-113 (test predictions) and checks category-code consistency."""
import json, numpy as np, pandas as pd
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW, PROCESSED = ROOT / "data/raw/bluebook-for-bulldozers", ROOT / "data/processed"
tv = pd.read_csv(RAW / "TrainAndValid.csv", low_memory=False, parse_dates=["saledate"])
te = pd.read_csv(RAW / "Test.csv", low_memory=False, parse_dates=["saledate"])
preds = pd.read_csv(PROCESSED / "test_predictions.csv")
out = {}
# category code mismatch: same text value -> different code in train vs test?
cols = [c for c in te.columns if not pd.api.types.is_numeric_dtype(te[c]) and c != "saledate"]
mism_rows = np.zeros(len(te), bool); per_col = {}
for c in cols:
    tr_map = {v: i + 1 for i, v in enumerate(pd.Categorical(tv[c]).categories)}
    te_codes = pd.Categorical(te[c]).codes + 1
    tr_codes = te[c].map(tr_map).fillna(-999).where(te[c].notna(), 0).astype(int).values
    bad = te_codes != tr_codes
    per_col[c] = float(bad.mean()); mism_rows |= bad
out["n_text_cols"] = len(cols)
out["cols_with_mismatch"] = int(sum(v > 0 for v in per_col.values()))
out["share_rows_affected"] = float(mism_rows.mean())
out["worst"] = sorted(per_col.items(), key=lambda x: -x[1])[:6]
p = preds.iloc[:, 1]
out["preds"] = dict(n=len(preds), cols=list(preds.columns), median=float(p.median()), mean=float(p.mean()), min=float(p.min()), max=float(p.max()),
                    start=str(te.saledate.min().date()), end=str(te.saledate.max().date()))
v2012 = tv[tv.saledate.dt.year == 2012].SalePrice
out["valid2012_median"] = float(v2012.median())
bins = list(range(0, 150001, 10000))
out["hist_labels"] = [f"{b//1000}k" for b in bins[:-1]]
out["hist_pred_pct"] = (pd.cut(p.clip(upper=149999), bins, right=False).value_counts(normalize=True).sort_index() * 100).round(1).tolist()
out["hist_val_pct"] = (pd.cut(v2012.clip(upper=149999), bins, right=False).value_counts(normalize=True).sort_index() * 100).round(1).tolist()
json.dump(out, open(PROCESSED / "test_results.json", "w"), indent=1, default=float)
print(json.dumps(out, indent=1, default=float))
