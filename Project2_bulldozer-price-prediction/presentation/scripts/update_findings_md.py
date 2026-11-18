"""Replaces the notebook's closing 'Findings' markdown (and the section 7 intro) with the actual results, without re-running it."""
import json, nbformat
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
NOTEBOOK = ROOT / "notebooks/02_Bulldozer_Model_Comparison.ipynb"

R = json.load(open(ROOT / "data/processed/model_comparison_results.json"))
M, O, B = R["models"], R["original_rf"], R["models"][R["best"]]
f3 = lambda x: f"{x:.3f}"
cv = R["time_cv"]; lc = R["learning_curve"]

findings = f"""## 9. Findings

**1. {R['best']} is the best single model.** Validation RMSLE on 2012 sales is **{f3(B['RMSLE'])}**, compared with **{f3(O['RMSLE'])}** for the original notebook's Random Forest ({(1 - B['RMSLE'] / O['RMSLE']):.0%} lower). A simple average of {", ".join(R['blend']['models'])} does better still: **{f3(R['blend']['RMSLE'])}** ({(1 - R['blend']['RMSLE'] / O['RMSLE']):.0%} lower).

**2. Like for like, every boosting model beats the Random Forest.** With identical features and splits, the Random Forest scores {f3(M['Random Forest']['RMSLE'])}, HistGradientBoosting {f3(M['HistGradientBoosting']['RMSLE'])}, XGBoost {f3(M['XGBoost']['RMSLE'])}, LightGBM {f3(M['LightGBM']['RMSLE'])} and CatBoost {f3(M['CatBoost']['RMSLE'])}. Boosting also wins on MAE, R² and MAPE in this like-for-like comparison.

**3. The gain comes from the model, not from the data preparation.** The new features and log target did not help the Random Forest ({f3(O['RMSLE'])} → {f3(M['Random Forest']['RMSLE'])}), and the log target made no real difference for LightGBM ({R['lgb_raw_target_rmsle']:.4f} on raw prices vs {M['LightGBM']['RMSLE']:.4f}). Note that the original Random Forest's settings were chosen using its 2012 score, while these models never saw 2012 before the final test.

**4. Dollar metrics barely move.** Compared with the original Random Forest, {R['best']}'s MAE is ${B['MAE']:,.0f} vs ${O['MAE']:,.0f}, and its R² is {B['R2']:.3f} vs {O['R2']:.3f}. RMSLE rewards relative accuracy, so the boosting models price cheap machines better but slightly under-price expensive ones ($80k+ sales are under-predicted by about {abs(R['by_band']['80k+']['bias %']):.0f}% on average, while sales under $10k are over-predicted by about {R['by_band']['<10k']['bias %']:.0f}%).

**5. Accuracy in plain terms:** {R['within_10']:.0%} of 2012 sales are predicted within ±10% of the true price, and {R['within_25']:.0%} within ±25%.

**6. Stable over time.** Time-based cross-validation (LightGBM) gives RMSLE between {f3(min(cv.values()))} and {f3(max(cv.values()))} for 2008–2012. 2009, the recession year, is the hardest ({f3(cv['2009'])}).

**7. Mild overfitting, and recent data matters most.** At full size the training RMSLE is {f3(lc['train'][-1])} vs {f3(lc['valid'][-1])} on validation, a smaller gap than the original Random Forest's ({f3(O['Train RMSLE'])} vs {f3(O['RMSLE'])}). Validation error is lowest ({f3(min(lc['valid']))}) when training on only the most recent 100,000 sales, so older sales add little.

**8. What drives price:** `fiProductClassDesc` (machine type and size), the new `machineAge` feature and the exact model (`fiModelDesc`) have the largest SHAP values.

**9. Speed trade-off:** CatBoost took about {M['CatBoost']['Fit seconds'] / 60:.0f} minutes to train; LightGBM took {M['LightGBM']['Fit seconds']:.0f} seconds for almost the same accuracy.

**Recommendation:** use {R['best']}, or the top-3 blend, when RMSLE is what matters; use LightGBM when the model must be retrained often. Next, give recent sales more weight, tune with time-based cross-validation, and reduce the under-pricing of expensive machines.

Test predictions from {R['best']} are saved in `test_predictions_best_model.csv` (`SalesID`, `SalePrice`). The slide deck `bulldozer_model_comparison.pptx` presents these findings."""

sec7 = """## 7. Deeper evaluation

The diagnostics below (log-target check, time-based cross-validation, learning curve and SHAP importance) use **LightGBM**, because it refits in about 30 seconds while CatBoost takes over 15 minutes, and its accuracy is almost the same. The error breakdown in 7.5 uses the best model's own predictions.

### 7.1 Does the log target matter?

Same LightGBM settings, trained on raw prices instead of `log1p(SalePrice)`."""

nb = nbformat.read(NOTEBOOK, as_version=4)
done = 0
for c in nb.cells:
    if c.cell_type == "markdown" and c.source.startswith("## 9. Findings"):
        c.source = findings; done += 1
    elif c.cell_type == "markdown" and c.source.startswith("## 7. Deeper evaluation"):
        c.source = sec7; done += 1
assert done == 2, done
nbformat.write(nb, NOTEBOOK)
print("updated", done, "markdown cells")
