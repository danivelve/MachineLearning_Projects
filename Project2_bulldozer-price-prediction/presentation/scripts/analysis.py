"""Compute the 10 answers for the bulldozer deck. Mirrors the notebook's preprocessing."""
import json, numpy as np, pandas as pd
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW, PROCESSED = ROOT / "data/raw/bluebook-for-bulldozers", ROOT / "data/processed"
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import root_mean_squared_log_error, mean_absolute_error, r2_score

df = pd.read_csv(RAW / "TrainAndValid.csv", low_memory=False, parse_dates=["saledate"])
df.sort_values("saledate", inplace=True)
out = {}
p = df.SalePrice
out["q1"] = dict(rows=len(df), cols=df.shape[1], start=str(df.saledate.min().date()), end=str(df.saledate.max().date()),
                 models=int(df.ModelID.nunique()), states=int(df.state.nunique()))
bins = list(range(0, 150001, 10000))
h = pd.cut(p.clip(upper=149999), bins=bins, right=False).value_counts().sort_index()
out["q2"] = dict(mean=float(p.mean()), median=float(p.median()), min=float(p.min()), max=float(p.max()),
                 skew=float(p.skew()), labels=[f"{b//1000}k" for b in bins[:-1]], counts=h.tolist(),
                 share_under_40k=float((p < 40000).mean()))
df["saleYear"] = df.saledate.dt.year
vy = df.groupby("saleYear").SalePrice.agg(["count", "median"])
out["q3"] = dict(years=[str(y) for y in vy.index], counts=vy["count"].tolist())
out["q4"] = dict(years=[str(y) for y in vy.index], median=vy["median"].round(0).tolist())
st = df.state.value_counts()
out["q5"] = dict(states=st.index[:10].tolist(), counts=st.values[:10].tolist(), top_share=float(st.iloc[0]/len(df)),
                 top5_share=float(st.iloc[:5].sum()/len(df)))
miss = (df.isna().mean()*100).sort_values(ascending=False)
out["q6"] = dict(cols=miss.index[:10].tolist(), pct=miss.values[:10].round(1).tolist(),
                 n_over50=int((miss > 50).sum()), n_any=int((miss > 0).sum()))
pg = df.groupby("ProductGroupDesc").SalePrice.agg(["median", "count"]).sort_values("median", ascending=False)
out["q7"] = dict(groups=pg.index.tolist(), median=pg["median"].tolist(), count=pg["count"].tolist())
age = df.saleYear - df.YearMade
valid = (df.YearMade > 1900) & (age >= 0)
out["q8_yearmade1000"] = float((df.YearMade == 1000).mean())
ab = pd.cut(age[valid], bins=[0, 3, 6, 9, 12, 15, 20, 30, 100], right=False)
ag = df[valid].groupby(ab, observed=True).SalePrice.median()
out["q8"] = dict(labels=["0-2", "3-5", "6-8", "9-11", "12-14", "15-19", "20-29", "30+"], median=ag.round(0).tolist(),
                 corr=float(np.corrcoef(age[valid], np.log(df.SalePrice[valid]))[0, 1]))
m = df.groupby(df.saledate.dt.month).SalePrice.agg(["count", "median"])
d = df.groupby(df.saledate.dt.dayofweek).SalePrice.agg(["count", "median"])
out["q9"] = dict(months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
                 m_count=m["count"].tolist(), m_median=m["median"].tolist(),
                 dow=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"], d_count=d["count"].reindex(range(7), fill_value=0).tolist())

# ---- Q10: model, same preprocessing as notebook ----
t = df.copy()
t["saleMonth"] = t.saledate.dt.month; t["saleDay"] = t.saledate.dt.day
t["saleDayOfWeek"] = t.saledate.dt.dayofweek; t["saleDayOfYear"] = t.saledate.dt.dayofyear
t.drop("saledate", axis=1, inplace=True)
for c, s in list(t.items()):
    if pd.api.types.is_numeric_dtype(s):
        if s.isna().sum():
            t[c+"_is_missing"] = s.isna(); t[c] = s.fillna(s.median())
    else:
        t[c+"_is_missing"] = s.isna(); t[c] = pd.Categorical(s).codes + 1
val = t[t.saleYear == 2012]; tr = t[t.saleYear != 2012]
Xt, yt = tr.drop("SalePrice", axis=1), tr.SalePrice; Xv, yv = val.drop("SalePrice", axis=1), val.SalePrice
rf = RandomForestRegressor(n_estimators=40, min_samples_leaf=1, min_samples_split=14, max_features=0.5,
                           n_jobs=-1, random_state=42).fit(Xt, yt)
pv = rf.predict(Xv)
fi = pd.Series(rf.feature_importances_, index=Xt.columns).sort_values(ascending=False)
out["q10"] = dict(valid_rmsle=float(root_mean_squared_log_error(yv, pv)), valid_mae=float(mean_absolute_error(yv, pv)),
                  valid_r2=float(r2_score(yv, pv)), n_train=len(tr), n_valid=len(val),
                  features=fi.index[:10].tolist(), importance=fi.values[:10].round(4).tolist(),
                  baseline_rmsle=float(root_mean_squared_log_error(yv, np.full(len(yv), yt.median()))))
json.dump(out, open(PROCESSED / "analysis_results.json", "w"), indent=1, default=float)
print(json.dumps(out, indent=1, default=float))
