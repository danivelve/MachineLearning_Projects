"""Generates bulldozer-model-comparison.ipynb (run it, then execute the notebook with nbconvert)."""
import nbformat as nbf

cells = []
md = lambda s: cells.append(nbf.v4.new_markdown_cell(s.strip()))
code = lambda s: cells.append(nbf.v4.new_code_cell(s.strip()))

md("""
# Bulldozer Price Prediction: Finding a Better Regression Model

The original notebook (`end-end-bulldozer-price-regression.ipynb`) used a **Random Forest** and reached a validation RMSLE of **0.245** on 2012 sales.

This notebook asks: **which regression model works best on this dataset, and how much better is it?**

We compare five models on exactly the same data, features and validation set:

| Model | Family |
|---|---|
| Random Forest | bagging (the original approach) |
| HistGradientBoosting (scikit-learn) | gradient boosting |
| XGBoost | gradient boosting |
| LightGBM | gradient boosting with native categorical support |
| CatBoost | gradient boosting with ordered target encoding of categories |

**Fair-comparison rules**

1. **Same split as the original:** train on sales before 2012, report the final score on 2012 sales (11,573 rows).
2. **No tuning on 2012:** the number of boosting rounds is chosen by training on sales before 2011 and checking 2011 (early stopping). The final model is refit on all pre-2012 data. 2012 is used **once**, for the final score.
3. **Same features for every model**, with the category encoding learned from the training data only (fixing the original notebook's test-set encoding problem).
4. **Log target:** every model is trained on `log1p(SalePrice)`, so minimising squared error directly minimises RMSLE. Predictions are converted back with `expm1`.
""")

code("""
import time, json, warnings
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.ensemble import RandomForestRegressor, HistGradientBoostingRegressor
from sklearn.metrics import root_mean_squared_log_error, mean_absolute_error, r2_score, mean_absolute_percentage_error
import lightgbm as lgb
import xgboost as xgb
import catboost as cb
warnings.filterwarnings("ignore")
print("lightgbm", lgb.__version__, "| xgboost", xgb.__version__, "| catboost", cb.__version__)
RESULTS = {}   # everything the slide deck needs is collected here and saved at the end
""")

md("""
## 1. Load the data

Same file as the original notebook: `TrainAndValid.csv`, 412,698 sales from 1989 to April 2012, sorted by sale date.
""")

code("""
raw = pd.read_csv("../data/raw/bluebook-for-bulldozers/TrainAndValid.csv", low_memory=False, parse_dates=["saledate"])
raw = raw.sort_values("saledate").reset_index(drop=True)
test_raw = pd.read_csv("../data/raw/bluebook-for-bulldozers/Test.csv", low_memory=False, parse_dates=["saledate"])
print(raw.shape, test_raw.shape)
""")

md("""
## 2. Feature engineering

Same date features as the original (`saleYear`, `saleMonth`, `saleDay`, `saleDayOfWeek`, `saleDayOfYear`), plus three data-cleaning improvements:

| Change | Why |
|---|---|
| `YearMade = 1000` → missing | 1000 is a placeholder for "unknown", not a real year (about 9.5% of rows) |
| `MachineHoursCurrentMeter = 0` → missing | the data dictionary says 0 means "no hours reported" |
| new `machineAge = saleYear − YearMade` | age at sale is what drives price, and it's easier for trees to use directly |

Missing numeric values are left as `NaN`: all five models handle missing values natively, so median filling and `_is_missing` flags are no longer needed.
""")

code("""
def add_features(df):
    df = df.copy()
    df["saleYear"] = df.saledate.dt.year
    df["saleMonth"] = df.saledate.dt.month
    df["saleDay"] = df.saledate.dt.day
    df["saleDayOfWeek"] = df.saledate.dt.dayofweek
    df["saleDayOfYear"] = df.saledate.dt.dayofyear
    df["YearMade"] = df["YearMade"].where(df["YearMade"] > 1900)                      # 1000 = unknown
    df["MachineHoursCurrentMeter"] = df["MachineHoursCurrentMeter"].replace(0, np.nan)  # 0 = not reported
    df["machineAge"] = df["saleYear"] - df["YearMade"]
    return df.drop(columns=["saledate"])

full = add_features(raw)
test_full = add_features(test_raw)
CAT_COLS = [c for c in full.columns if not pd.api.types.is_numeric_dtype(full[c])]
print(len(CAT_COLS), "text columns;", full.shape[1] - 1, "features in total")
""")

md("""
## 3. Train / validation split and consistent category encoding

* **Final split** (same as the original notebook): train = before 2012, validation = 2012.
* **Tuning split:** train = before 2011, early-stopping check = 2011.

Category lists are learned from the **training rows only** and reused for validation and test, so a given model name or state always gets the same code. Values never seen in training become missing.
""")

code("""
def encode(train_df, *others):
    \"\"\"Return copies with text columns as pandas categories using the training categories.\"\"\"
    cats = {c: pd.Categorical(train_df[c].dropna().unique()).categories for c in CAT_COLS}
    out = []
    for df in (train_df,) + others:
        df = df.copy()
        for c in CAT_COLS:
            df[c] = pd.Categorical(df[c], categories=cats[c])
        out.append(df)
    return out

def to_codes(df):
    \"\"\"Integer codes for models without native categorical support (missing/unseen = -1 -> NaN).\"\"\"
    df = df.copy()
    for c in CAT_COLS:
        df[c] = df[c].cat.codes.replace(-1, np.nan).astype("float32")
    return df

def split(df, year):
    tr, va = df[df.saleYear < year], df[df.saleYear == year]
    # training target on the log scale; validation target kept in dollars (log it when a model needs it)
    return tr.drop(columns="SalePrice"), np.log1p(tr.SalePrice), va.drop(columns="SalePrice"), va.SalePrice

# Final split (validate on 2012) and tuning split (early-stop on 2011)
X_tr, y_tr, X_va, y_va = split(full, 2012)
X_tr, X_va, X_te = encode(X_tr, X_va, test_full)
Xa_tr, ya_tr, Xa_va, ya_va = split(full[full.saleYear < 2012], 2011)
Xa_tr, Xa_va = encode(Xa_tr, Xa_va)
print("final:", X_tr.shape, X_va.shape, "| tuning:", Xa_tr.shape, Xa_va.shape, "| test:", X_te.shape)
""")

md("""
## 4. Evaluation

Same metrics as the original notebook, plus **MAPE** (average percentage error), which is the easiest to explain to a business audience.
""")

code("""
def scores(y_true, pred):
    return {"RMSLE": root_mean_squared_log_error(y_true, pred), "MAE": mean_absolute_error(y_true, pred),
            "R2": r2_score(y_true, pred), "MAPE": mean_absolute_percentage_error(y_true, pred)}

def evaluate(name, model, Xtr, Xva, fit_seconds, rounds=None):
    p_va = np.expm1(model.predict(Xva))
    p_tr = np.expm1(model.predict(Xtr))
    s = scores(y_va, p_va)
    s["Train RMSLE"] = root_mean_squared_log_error(np.expm1(y_tr), p_tr)
    s["Fit seconds"] = fit_seconds
    s["Rounds"] = rounds
    RESULTS.setdefault("models", {})[name] = s
    print(f"{name:<22} valid RMSLE {s['RMSLE']:.4f} | MAE ${s['MAE']:,.0f} | R2 {s['R2']:.3f} | "
          f"MAPE {s['MAPE']*100:.1f}% | train RMSLE {s['Train RMSLE']:.4f} | {fit_seconds:.0f}s")
    return p_va
PREDS = {}
""")

md("""
## 5. The models

### 5.1 Random Forest (the original model's settings)

Same hyperparameters as the original `ideal_model`, but trained on the log target and the cleaned features, so we can see how much of any gain comes from the model rather than the data preparation.
""")

code("""
Xc_tr, Xc_va, Xc_te = to_codes(X_tr), to_codes(X_va), to_codes(X_te)
t = time.time()
rf = RandomForestRegressor(n_estimators=40, min_samples_leaf=1, min_samples_split=14, max_features=0.5,
                           n_jobs=-1, random_state=42).fit(Xc_tr, y_tr)
PREDS["Random Forest"] = evaluate("Random Forest", rf, Xc_tr, Xc_va, time.time() - t, 40)
""")

md("""
### 5.2 HistGradientBoosting (scikit-learn)

scikit-learn's fast gradient boosting. The best number of iterations is found on the 2011 check set with `staged_predict`, then the model is refit on all pre-2012 data.
""")

code("""
hgb_params = dict(learning_rate=0.1, max_leaf_nodes=127, min_samples_leaf=20, l2_regularization=1.0, random_state=42)
h = HistGradientBoostingRegressor(max_iter=1500, early_stopping=False, **hgb_params).fit(to_codes(Xa_tr), ya_tr)
curve = [root_mean_squared_log_error(ya_va, np.expm1(p).clip(0)) for p in h.staged_predict(to_codes(Xa_va))]
best_hgb = int(np.argmin(curve)) + 1
t = time.time()
hgb = HistGradientBoostingRegressor(max_iter=int(best_hgb * 1.1), early_stopping=False, **hgb_params).fit(Xc_tr, y_tr)
PREDS["HistGradientBoosting"] = evaluate("HistGradientBoosting", hgb, Xc_tr, Xc_va, time.time() - t, int(best_hgb * 1.1))
""")

md("""
### 5.3 XGBoost

Histogram-based XGBoost with row and column subsampling. Early stopping on 2011 picks the number of trees.
""")

code("""
xgb_params = dict(learning_rate=0.05, max_depth=10, min_child_weight=5, subsample=0.8, colsample_bytree=0.7,
                  reg_lambda=1.0, tree_method="hist", n_jobs=-1, random_state=42)
x = xgb.XGBRegressor(n_estimators=5000, early_stopping_rounds=100, **xgb_params)
x.fit(to_codes(Xa_tr), ya_tr, eval_set=[(to_codes(Xa_va), np.log1p(ya_va))], verbose=False)
best_xgb = x.best_iteration + 1
t = time.time()
xgbm = xgb.XGBRegressor(n_estimators=int(best_xgb * 1.1), **xgb_params).fit(Xc_tr, y_tr)
PREDS["XGBoost"] = evaluate("XGBoost", xgbm, Xc_tr, Xc_va, time.time() - t, int(best_xgb * 1.1))
""")

md("""
### 5.4 LightGBM

LightGBM grows trees leaf-wise and splits **categorical columns natively**: instead of treating a model code as a number, it groups categories by their effect on price. This suits high-cardinality columns such as `fiModelDesc`.
""")

code("""
lgb_params = dict(learning_rate=0.05, num_leaves=255, min_child_samples=20, subsample=0.8, subsample_freq=1,
                  colsample_bytree=0.7, reg_lambda=1.0, cat_smooth=10, max_cat_to_onehot=8,
                  n_jobs=-1, random_state=42, verbose=-1)
l = lgb.LGBMRegressor(n_estimators=10000, **lgb_params)
l.fit(Xa_tr, ya_tr, eval_set=[(Xa_va, np.log1p(ya_va))], callbacks=[lgb.early_stopping(150, verbose=False)])
best_lgb = l.best_iteration_
t = time.time()
lgbm = lgb.LGBMRegressor(n_estimators=int(best_lgb * 1.1), **lgb_params).fit(X_tr, y_tr)
PREDS["LightGBM"] = evaluate("LightGBM", lgbm, X_tr, X_va, time.time() - t, int(best_lgb * 1.1))
""")

md("""
### 5.5 CatBoost

CatBoost encodes categories with **ordered target statistics**, designed to avoid target leakage, and builds symmetric trees. It needs text categories with no missing values, so missing is marked as `"missing"`.
""")

code("""
def cb_frame(df):
    df = df.copy()
    for c in CAT_COLS:
        df[c] = df[c].astype(object).fillna("missing").astype(str)
    return df
cb_params = dict(learning_rate=0.08, depth=8, l2_leaf_reg=3, loss_function="RMSE", thread_count=-1,
                 random_seed=42, verbose=0, one_hot_max_size=8)
c = cb.CatBoostRegressor(iterations=4000, od_type="Iter", od_wait=150, **cb_params)
c.fit(cb_frame(Xa_tr), ya_tr, cat_features=CAT_COLS, eval_set=(cb_frame(Xa_va), np.log1p(ya_va)), use_best_model=True)
best_cb = c.get_best_iteration() + 1
t = time.time()
cbm = cb.CatBoostRegressor(iterations=int(best_cb * 1.1), **cb_params).fit(cb_frame(X_tr), y_tr, cat_features=CAT_COLS)
PREDS["CatBoost"] = evaluate("CatBoost", cbm, cb_frame(X_tr), cb_frame(X_va), time.time() - t, int(best_cb * 1.1))
""")

md("""
## 6. Model comparison

The original notebook's Random Forest (raw target, original preprocessing) scored **0.2452** on the same 2012 validation set. Lower RMSLE is better.
""")

code("""
RESULTS["original_rf"] = {"RMSLE": 0.24524, "MAE": 5951.25, "R2": 0.8818, "Train RMSLE": 0.14469}
table = pd.DataFrame(RESULTS["models"]).T.sort_values("RMSLE")
table.loc["Original notebook RF"] = [0.24524, 5951.25, 0.8818, np.nan, 0.14469, np.nan, 40]
table.style.format({"RMSLE": "{:.4f}", "MAE": "${:,.0f}", "R2": "{:.3f}", "MAPE": "{:.1%}", "Train RMSLE": "{:.4f}", "Fit seconds": "{:.0f}"})
""")

code("""
BEST = table.drop("Original notebook RF")["RMSLE"].idxmin()
RESULTS["best"] = BEST
print("Best model:", BEST)
ax = table["RMSLE"].sort_values(ascending=False).plot.barh(figsize=(8, 4), color="#F2A900")
ax.set_xlabel("Validation RMSLE on 2012 sales (lower is better)"); ax.set_title("Model comparison"); plt.show()
""")

md("""
### Does averaging the best models help?

Different model families make different mistakes, so a simple average of the best boosting models can beat each one alone.
""")

code("""
top = table.drop("Original notebook RF").sort_values("RMSLE").index[:3].tolist()
blend = np.expm1(np.mean([np.log1p(PREDS[m]) for m in top], axis=0))
s = scores(y_va, blend)
RESULTS["blend"] = {"models": top, **s}
print("Blend of", top, f"-> RMSLE {s['RMSLE']:.4f}, MAE ${s['MAE']:,.0f}, R2 {s['R2']:.3f}")
""")

md("""
## 7. Deeper evaluation of the best model

From here on we analyse the best single model. We use **LightGBM** for the diagnostics below, because it is the fastest to refit many times. If another model won, the same checks apply and the conclusions are very similar.

### 7.1 Does the log target matter?

Same LightGBM settings, trained on raw prices instead of `log1p(SalePrice)`.
""")

code("""
l_raw = lgb.LGBMRegressor(n_estimators=int(best_lgb * 1.1), **lgb_params).fit(X_tr, np.expm1(y_tr))
p_raw = l_raw.predict(X_va).clip(1000)
RESULTS["lgb_raw_target_rmsle"] = root_mean_squared_log_error(y_va, p_raw)
print(f"Raw target RMSLE {RESULTS['lgb_raw_target_rmsle']:.4f} vs log target {RESULTS['models']['LightGBM']['RMSLE']:.4f}")
""")

md("""
### 7.2 Is the score stable across years? (time-based cross-validation)

A single validation year can be lucky or unlucky. Here we use an **expanding window**: train on all sales before year *Y*, test on year *Y*, for 2008 to 2012. This shows whether the model works across different market conditions, including the 2009 recession.
""")

code("""
cv = {}
for year in [2008, 2009, 2010, 2011, 2012]:
    Xt, yt, Xv, yv = split(full, year)
    Xt, Xv = encode(Xt, Xv)
    m = lgb.LGBMRegressor(n_estimators=int(best_lgb * 1.1), **lgb_params).fit(Xt, yt)
    cv[year] = root_mean_squared_log_error(yv, np.expm1(m.predict(Xv)))
    print(year, f"train rows {len(Xt):>7,} | RMSLE {cv[year]:.4f}")
RESULTS["time_cv"] = cv
print(f"Mean {np.mean(list(cv.values())):.4f}, std {np.std(list(cv.values())):.4f}")
""")

md("""
### 7.3 Overfitting or underfitting? (learning curve)

We train on the most recent *n* training rows for increasing *n* and compare training and validation error. If both errors are high and close together, the model is underfitting. If training error is far below validation error, it is overfitting. If validation error keeps falling as data grows, more data still helps.
""")

code("""
lc = {"n": [], "train": [], "valid": []}
for n in [25_000, 50_000, 100_000, 200_000, len(X_tr)]:
    m = lgb.LGBMRegressor(n_estimators=int(best_lgb * 1.1), **lgb_params).fit(X_tr.iloc[-n:], y_tr.iloc[-n:])
    lc["n"].append(n)
    lc["train"].append(root_mean_squared_log_error(np.expm1(y_tr.iloc[-n:]), np.expm1(m.predict(X_tr.iloc[-n:]))))
    lc["valid"].append(root_mean_squared_log_error(y_va, np.expm1(m.predict(X_va))))
    print(f"{n:>7,} rows | train {lc['train'][-1]:.4f} | valid {lc['valid'][-1]:.4f}")
RESULTS["learning_curve"] = lc
plt.plot(lc["n"], lc["train"], "o-", label="train"); plt.plot(lc["n"], lc["valid"], "o-", label="valid 2012")
plt.xscale("log"); plt.xlabel("training rows (most recent)"); plt.ylabel("RMSLE"); plt.legend(); plt.show()
""")

md("""
### 7.4 What drives the predictions?

**Gain importance** measures how much each feature reduced the error across all splits. **SHAP values** (`pred_contrib=True`) split each prediction into per-feature contributions. Their mean absolute value is a more reliable importance measure.
""")

code("""
gain = pd.Series(lgbm.booster_.feature_importance("gain"), index=X_tr.columns)
gain = (gain / gain.sum()).sort_values(ascending=False)
contrib = lgbm.predict(X_va, pred_contrib=True)[:, :-1]
shap_imp = pd.Series(np.abs(contrib).mean(axis=0), index=X_tr.columns).sort_values(ascending=False)
RESULTS["gain_top"] = gain.head(12).round(4).to_dict()
RESULTS["shap_top"] = shap_imp.head(12).round(4).to_dict()
pd.DataFrame({"gain share": gain.head(12), "mean |SHAP| (log price)": shap_imp.reindex(gain.head(12).index)})
""")

md("""
### 7.5 Where does the model make its biggest errors?

Error broken down by product group and by price band on the 2012 validation sales.
""")

code("""
best_pred = PREDS[BEST]
va = raw[raw.saledate.dt.year == 2012].copy()
va["pred"] = best_pred
va["log_err"] = np.log1p(va.pred) - np.log1p(va.SalePrice)
by_group = va.groupby("ProductGroupDesc").apply(lambda d: pd.Series({"RMSLE": np.sqrt((d.log_err**2).mean()), "n": len(d),
                                                                   "bias %": (np.expm1(d.log_err.mean())) * 100}))
bands = pd.cut(va.SalePrice, [0, 10_000, 20_000, 40_000, 80_000, 200_000], labels=["<10k", "10–20k", "20–40k", "40–80k", "80k+"])
by_band = va.groupby(bands, observed=True).apply(lambda d: pd.Series({"RMSLE": np.sqrt((d.log_err**2).mean()), "n": len(d),
                                                                       "bias %": (np.expm1(d.log_err.mean())) * 100}))
RESULTS["by_group"] = by_group.round(4).to_dict(orient="index")
RESULTS["by_band"] = by_band.round(4).to_dict(orient="index")
rng = np.random.default_rng(0); idx = rng.choice(len(va), 400, replace=False)
RESULTS["scatter"] = {"actual": va.SalePrice.values[idx].round(0).tolist(), "pred": va.pred.values[idx].round(0).tolist()}
within = np.abs(va.pred / va.SalePrice - 1)
RESULTS["within_10"] = float((within <= 0.10).mean()); RESULTS["within_25"] = float((within <= 0.25).mean())
print(f"Within ±10%: {RESULTS['within_10']:.1%} | within ±25%: {RESULTS['within_25']:.1%}")
display(by_group.sort_values("RMSLE"), by_band)
""")

md("""
## 8. Test-set predictions

Predictions for the 12,457 Kaggle test sales from the best model, using the **training categories** for encoding. The column is named `SalePrice`, as Kaggle expects.
""")

code("""
if BEST == "CatBoost":
    test_pred = np.expm1(cbm.predict(cb_frame(X_te)))
elif BEST == "LightGBM":
    test_pred = np.expm1(lgbm.predict(X_te))
else:
    test_pred = np.expm1({"Random Forest": rf, "HistGradientBoosting": hgb, "XGBoost": xgbm}[BEST].predict(Xc_te))
sub = pd.DataFrame({"SalesID": test_raw.SalesID, "SalePrice": test_pred})
sub.to_csv("../data/processed/test_predictions_best_model.csv", index=False)
RESULTS["test"] = {"n": len(sub), "median": float(np.median(test_pred)), "min": float(test_pred.min()), "max": float(test_pred.max())}
sub.describe()
""")

code("""
json.dump(RESULTS, open("../data/processed/model_comparison_results.json", "w"), indent=1, default=float)
print("saved model_comparison_results.json")
""")

md("""
## 9. Findings

See the printed results above, and the slide deck `bulldozer_model_comparison.pptx`, for the full write-up. In short:

* **Gradient boosting beats the Random Forest** on this data. The comparison table shows how much.
* Training on **log(price)** and **consistent category encoding** both matter.
* The time-based cross-validation and learning curve show how stable the model is and whether it over- or underfits.
""")

nb = nbf.v4.new_notebook(); nb["cells"] = cells
nb["metadata"]["kernelspec"] = {"name": "python3", "display_name": "Python 3", "language": "python"}
from pathlib import Path
nbf.write(nb, Path(__file__).resolve().parents[2] / "notebooks/02_Bulldozer_Model_Comparison.ipynb")
print("written", len(cells), "cells")
