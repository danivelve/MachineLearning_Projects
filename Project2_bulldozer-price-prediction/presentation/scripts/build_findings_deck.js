// Builds bulldozer_model_comparison.pptx from model_comparison_results.json
const pptxgen = require("pptxgenjs");
const { applyTheme } = require("./apply_theme.js");
const R = require("../../data/processed/model_comparison_results.json");

const THEME = {
  name: "Bulldozer Amber", headFontFace: "Arial", bodyFontFace: "Calibri",
  colors: { dk1: "1E2226", lt1: "FFFFFF", dk2: "3A4750", lt2: "F1F2F4", accent1: "F2A900", accent2: "3A4750",
    accent3: "C2570C", accent4: "8C9AA5", accent5: "6B7B88", accent6: "2E7D5B", hlink: "C2570C", folHlink: "6B7B88" },
};
const HEX = THEME.colors;
const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = "Bulldozer Model Comparison";
const C = pres.SchemeColor;

// ---------- data ----------
const M = R.models;
const ORIG = R.original_rf;
const BEST = R.best;
const B = M[BEST];
const order = Object.keys(M).sort((a, b) => M[a].RMSLE - M[b].RMSLE);
const money = (n) => "$" + Math.round(n).toLocaleString("en-US");
const f3 = (n) => n.toFixed(3);
const pct = (n) => Math.round(n * 100) + "%";
const gainVsOrig = 1 - B.RMSLE / ORIG.RMSLE;
const cvVals = Object.values(R.time_cv);
const RFs = M["Random Forest"];
const LG = M.LightGBM;
const gainSame = 1 - B.RMSLE / RFs.RMSLE;
const gainBlend = 1 - R.blend.RMSLE / ORIG.RMSLE;
const cvMean = cvVals.reduce((a, b) => a + b, 0) / cvVals.length;

// ---------- layouts ----------
pres.defineSlideMaster({
  title: "TITLE_DARK", background: { color: C.text1 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.7, y: 2.1, w: 11.9, h: 1.8, fontSize: 40, bold: true, color: C.background1, align: "left", valign: "bottom", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.7, y: 4.1, w: 11.9, h: 1.2, fontSize: 20, color: C.accent1, align: "left", valign: "top", margin: 0 }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "CONTENT", background: { color: C.background1 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.45, w: 12.1, h: 0.95, fontSize: 28, bold: true, color: C.text1, align: "left", valign: "middle", margin: 0 }, text: "" } },
    { text: { text: "Bulldozer price prediction  |  Model comparison", options: { x: 0.6, y: 7.0, w: 8, h: 0.3, fontSize: 10, color: C.accent5, margin: 0 } } },
  ],
  slideNumber: { x: 12.2, y: 7.0, w: 0.55, h: 0.3, fontSize: 10, color: C.accent5, align: "right" },
});

// ---------- helpers ----------
const chartBase = () => ({
  catAxisLabelColor: HEX.dk2, valAxisLabelColor: HEX.dk2,
  catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt", dataLabelFontFace: "+mn-lt", titleFontFace: "+mn-lt",
  catAxisLabelFontSize: 11, valAxisLabelFontSize: 11, dataLabelFontSize: 11, dataLabelColor: HEX.dk1,
  valGridLine: { color: "E3E6E9", size: 0.75 }, catGridLine: { style: "none" }, showLegend: false,
  showTitle: true, titleFontSize: 14, titleColor: HEX.dk1,
});
const CH = { x: 0.6, y: 1.75, w: 7.7, h: 4.95 };
function content(title, section) { const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: section }); s.addText(title, { placeholder: "title" }); return s; }
function badge(s, x, y, d, text, size = 18) {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: C.accent1 }, line: { type: "none" }, objectName: "Badge " + text });
  s.addText(text, { x, y, w: d, h: d, fontSize: size, bold: true, color: C.text1, align: "center", valign: "middle", margin: 0, isTextBox: true });
}
function card(s, heading, bullets, opts = {}) {
  const x = opts.x ?? 8.6, y = opts.y ?? 1.75, w = opts.w ?? 4.13, h = opts.h ?? 4.95;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: C.background2 }, line: { type: "none" }, objectName: "Insight card" });
  s.addText(heading.toUpperCase(), { x: x + 0.3, y: y + 0.25, w: w - 0.6, h: 0.3, fontSize: 11, bold: true, color: C.accent3, charSpacing: 2, margin: 0, isTextBox: true });
  s.addText(bullets.map((b, i) => ({ text: b, options: { bullet: true, breakLine: i < bullets.length - 1, paraSpaceAfter: 9 } })),
    { x: x + 0.3, y: y + 0.7, w: w - 0.6, h: h - 0.9, fontSize: 14, color: C.text1, valign: "top", margin: 0, isTextBox: true });
}
function stat(s, x, y, w, big, label, dark = false, h = 1.55) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: dark ? C.text2 : C.background2 }, line: { type: "none" }, objectName: "Stat " + label });
  s.addText(big, { x: x + 0.25, y: y + 0.18, w: w - 0.5, h: 0.75, fontSize: 32, bold: true, color: dark ? C.accent1 : C.text1, margin: 0, isTextBox: true, fontFace: THEME.headFontFace });
  s.addText(label, { x: x + 0.25, y: y + 0.95, w: w - 0.5, h: h - 1.05, fontSize: 13, color: dark ? C.background1 : C.text2, margin: 0, valign: "top", isTextBox: true });
}

// ================= 1. Title =================
pres.addSection({ title: "Summary" });
let s = pres.addSlide({ masterName: "TITLE_DARK", sectionTitle: "Summary" });
s.addText(`${BEST} lowers the competition error by ${pct(gainVsOrig)} compared with the original Random Forest`, { placeholder: "title" });
s.addText(`Five regression models compared on 2012 sales: validation RMSLE ${f3(B.RMSLE)} vs ${f3(ORIG.RMSLE)}`, { placeholder: "body" });
s.addText("Notebook: notebooks/02_Bulldozer_Model_Comparison.ipynb  |  Data: Kaggle Blue Book for Bulldozers", { x: 0.7, y: 6.6, w: 11.9, h: 0.35, fontSize: 12, color: C.accent4, margin: 0, isTextBox: true });

// ================= 2. Exec summary =================
s = content("Summary: boosting beats the Random Forest on RMSLE", "Summary");
stat(s, 0.6, 1.75, 2.85, f3(B.RMSLE), `${BEST} validation RMSLE (was ${f3(ORIG.RMSLE)})`, true);
stat(s, 3.68, 1.75, 2.85, "−" + pct(gainVsOrig), "lower error than the original Random Forest");
stat(s, 6.76, 1.75, 2.85, f3(R.blend.RMSLE), `blend of the top 3 models (−${pct(gainBlend)})`);
stat(s, 9.84, 1.75, 2.89, pct(R.within_25), "of 2012 sales predicted within ±25%");
const findings = [
  `Like for like (same features and split), all four boosting models beat the Random Forest: ${f3(RFs.RMSLE)} → ${f3(B.RMSLE)} for ${BEST}`,
  `Dollar metrics barely move: MAE ${money(B.MAE)} vs ${money(ORIG.MAE)}, R² ${B.R2.toFixed(3)} vs ${ORIG.R2.toFixed(3)}, because the model targets relative error`,
  `LightGBM is almost as accurate (${f3(LG.RMSLE)}) and trains ${Math.round(B["Fit seconds"] / LG["Fit seconds"])}× faster (${Math.round(LG["Fit seconds"])} s vs ${Math.round(B["Fit seconds"] / 60)} min)`,
  "Category codes are learned from training data only, fixing the original notebook's test-set encoding problem",
];
findings.forEach((t, i) => {
  const y = 3.6 + i * 0.75;
  badge(s, 0.6, y, 0.5, String(i + 1), 13);
  s.addText(t, { x: 1.3, y: y - 0.05, w: 11.4, h: 0.6, fontSize: 16, color: C.text1, valign: "middle", margin: 0, isTextBox: true });
});

// ================= 3. Approach =================
pres.addSection({ title: "Approach" });
s = content("A fair comparison: same data, same features, no tuning on 2012", "Approach");
const rules = [
  ["Same split", "Train on sales before 2012 (401,125); report the score on 2012 sales (11,573), as in the original notebook"],
  ["Honest tuning", "Number of boosting rounds chosen by training on pre-2011 data and early-stopping on 2011; 2012 used once"],
  ["Same features", "Original date features, plus YearMade = 1000 and 0 machine hours treated as missing, and a new machineAge"],
  ["Log target", "Every model learns log(1 + price), so minimising squared error minimises RMSLE directly"],
];
rules.forEach(([h, d], i) => {
  const x = 0.6 + (i % 2) * 6.15, y = 1.75 + Math.floor(i / 2) * 2.55;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 5.95, h: 2.35, rectRadius: 0.12, fill: { color: C.background2 }, line: { type: "none" }, objectName: "Rule " + h });
  badge(s, x + 0.3, y + 0.3, 0.7, String(i + 1));
  s.addText(h, { x: x + 1.25, y: y + 0.35, w: 4.4, h: 0.55, fontSize: 20, bold: true, color: C.text1, margin: 0, isTextBox: true });
  s.addText(d, { x: x + 1.25, y: y + 1.0, w: 4.4, h: 1.2, fontSize: 15, color: C.text2, valign: "top", margin: 0, isTextBox: true });
});

// ================= 4. Candidates =================
s = content("Five candidate models, from bagging to three styles of boosting", "Approach");
const cands = [
  ["Random Forest", "Original model", "Many independent deep trees, averaged. Same settings as the notebook's ideal_model"],
  ["HistGradientBoosting", "scikit-learn", "Fast histogram-based boosting; trees added one at a time to fix earlier errors"],
  ["XGBoost", "Boosting", "Regularised boosting with row and column sampling; widely used on tabular data"],
  ["LightGBM", "Boosting", "Leaf-wise trees and native categorical splits that group model names by their effect on price"],
  ["CatBoost", "Boosting", "Ordered target encoding of categories and symmetric trees; strong on high-cardinality text"],
];
cands.forEach(([n, tag, d], i) => {
  const x = 0.6 + i * 2.45, y = 1.85, w = 2.25;
  const win = n === BEST;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 4.6, rectRadius: 0.12, fill: { color: win ? C.text2 : C.background2 }, line: { type: "none" }, objectName: "Candidate " + n });
  s.addText(tag.toUpperCase(), { x: x + 0.2, y: y + 0.3, w: w - 0.4, h: 0.3, fontSize: 11, bold: true, color: win ? C.accent1 : C.accent3, charSpacing: 1, margin: 0, isTextBox: true });
  s.addText(n, { x: x + 0.2, y: y + 0.7, w: w - 0.4, h: 0.85, fontSize: 18, bold: true, color: win ? C.background1 : C.text1, valign: "top", margin: 0, isTextBox: true });
  s.addText(d, { x: x + 0.2, y: y + 1.6, w: w - 0.4, h: 1.8, fontSize: 14, color: win ? C.background1 : C.text2, valign: "top", margin: 0, isTextBox: true });
  s.addText(f3(M[n].RMSLE), { x: x + 0.2, y: y + 3.55, w: w - 0.4, h: 0.55, fontSize: 26, bold: true, color: win ? C.accent1 : C.text1, margin: 0, isTextBox: true, fontFace: THEME.headFontFace });
  s.addText("valid RMSLE", { x: x + 0.2, y: y + 4.05, w: w - 0.4, h: 0.3, fontSize: 12, color: win ? C.accent4 : C.accent5, margin: 0, isTextBox: true });
});

// ================= 5. Results chart =================
pres.addSection({ title: "Results" });
s = content(`Results: ${BEST} has the lowest error on 2012 sales`, "Results");
const labs = ["Original notebook RF", ...[...order].reverse()];
const vals = [ORIG.RMSLE, ...[...order].reverse().map((m) => M[m].RMSLE)];
s.addChart(pres.charts.BAR, [{ name: "RMSLE", labels: labs, values: vals }], {
  ...CH, ...chartBase(), barDir: "bar", barGapWidthPct: 35,
  chartColors: labs.map((l) => (l === BEST ? HEX.accent1 : l.startsWith("Original") ? HEX.accent3 : HEX.accent4)),
  showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.000", valAxisHidden: true, valGridLine: { style: "none" }, valAxisMinVal: 0, valAxisMaxVal: 0.3,
  title: "Validation RMSLE on 2012 sales (lower is better)",
});
card(s, "What the comparison shows", [
  `${BEST}: RMSLE ${f3(B.RMSLE)}, ${pct(gainVsOrig)} lower than the original notebook (${f3(ORIG.RMSLE)})`,
  `The Random Forest in the same setup scores ${f3(RFs.RMSLE)}, so the gain comes from the model, not the data preparation`,
  "The original RF was tuned on its 2012 score; these models never saw 2012 before the final test, so the real gap may be larger",
  `Blending the top 3 (${R.blend.models.join(", ")}) gives ${f3(R.blend.RMSLE)}`,
]);

// ================= 6. Metrics table =================
s = content("All metrics: boosting wins like for like; dollar metrics stay close", "Results");
const hdr = ["Model", "Valid RMSLE", "Valid MAE", "Valid R²", "MAPE", "Train RMSLE", "Fit time"].map((t) => ({ text: t, options: { bold: true, color: C.background1, fill: { color: C.text2 } } }));
const rowsT = [...order.map((m) => [m, f3(M[m].RMSLE), money(M[m].MAE), M[m].R2.toFixed(3), (M[m].MAPE * 100).toFixed(1) + "%", f3(M[m]["Train RMSLE"]), Math.round(M[m]["Fit seconds"]) + " s"]),
  ["Original notebook RF", f3(ORIG.RMSLE), money(ORIG.MAE), ORIG.R2.toFixed(3), "–", f3(ORIG["Train RMSLE"]), "–"],
  [`Blend of top 3`, f3(R.blend.RMSLE), money(R.blend.MAE), R.blend.R2.toFixed(3), (R.blend.MAPE * 100).toFixed(1) + "%", "–", "–"]];
const body = rowsT.map((r, i) => r.map((t, j) => ({ text: t, options: { bold: r[0] === BEST || j === 0, color: r[0] === BEST ? C.text1 : C.text2, fill: { color: r[0] === BEST ? C.accent1 : i % 2 ? C.background1 : C.background2 } } })));
s.addTable([hdr, ...body], { x: 0.6, y: 1.75, w: 12.1, colW: [3.1, 1.5, 1.5, 1.4, 1.4, 1.7, 1.5], fontSize: 15, rowH: 0.52, border: { type: "none" }, margin: [0, 0.15, 0, 0.15], valign: "middle" });
s.addText("RMSLE: competition metric. MAE: average error in dollars. MAPE: average percentage error. Fit time: final model on all pre-2012 rows.", { x: 0.6, y: 6.35, w: 12.1, h: 0.4, fontSize: 13, italic: true, color: C.text2, margin: 0, isTextBox: true });

// ================= 7. What drove the gain =================
s = content("The gain came from the model, not the data preparation", "Results");
const steps = [
  ["Original notebook RF", ORIG.RMSLE],
  ["RF, new features + log target", RFs.RMSLE],
  ["LightGBM", LG.RMSLE],
  [`${BEST} (best single)`, B.RMSLE],
  ["Blend of top 3", R.blend.RMSLE],
];
s.addChart(pres.charts.BAR, [{ name: "RMSLE", labels: steps.map((x) => x[0]), values: steps.map((x) => x[1]) }], {
  ...CH, ...chartBase(), barDir: "col", barGapWidthPct: 45, chartColors: [HEX.accent3, HEX.accent4, HEX.accent2, HEX.accent1, HEX.accent6],
  showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.000", valAxisMinVal: 0, valAxisMaxVal: 0.3, valAxisLabelFormatCode: "0.00",
  title: "Validation RMSLE, step by step (lower is better)", catAxisLabelFontSize: 11,
});
card(s, "Reading the steps", [
  `New features + log target did not help the Random Forest: ${f3(ORIG.RMSLE)} → ${f3(RFs.RMSLE)}`,
  `Switching to boosting did: ${f3(RFs.RMSLE)} → ${f3(B.RMSLE)} with ${BEST} (−${pct(gainSame)})`,
  `The log target made no real difference for LightGBM: ${R.lgb_raw_target_rmsle.toFixed(4)} on raw prices vs ${LG.RMSLE.toFixed(4)}`,
  `Averaging the top 3 models gives the lowest error: ${f3(R.blend.RMSLE)}`,
]);

// ================= 8. Stability =================
pres.addSection({ title: "Diagnostics" });
s = content("The score holds across years; 2009 was the hardest", "Diagnostics");
const yrs = Object.keys(R.time_cv);
s.addChart(pres.charts.BAR, [{ name: "RMSLE", labels: yrs, values: yrs.map((y) => R.time_cv[y]) }], {
  ...CH, ...chartBase(), barDir: "col", barGapWidthPct: 45, chartColors: yrs.map((y) => (y === "2009" ? HEX.accent3 : HEX.accent2)),
  showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.000", valAxisMinVal: 0, valAxisMaxVal: 0.35, valAxisLabelFormatCode: "0.00",
  title: "LightGBM RMSLE when trained on all earlier years and tested on each year",
});
card(s, "Time-based cross-validation", [
  "Expanding window: train on every sale before year Y, test on year Y",
  `Mean RMSLE ${f3(cvMean)} across 2008–2012; range ${f3(Math.min(...cvVals))} to ${f3(Math.max(...cvVals))}`,
  `2009 (orange) is worst at ${f3(R.time_cv["2009"])}: the recession moved prices faster than past data could predict`,
  "The other years sit close together, so the 2012 score is not a lucky split",
]);

// ================= 9. Learning curve =================
const lc = R.learning_curve;
const lastGap = lc.valid[lc.valid.length - 1] - lc.train[lc.train.length - 1];
s = content("Fit check: mild overfitting, and recent sales matter most", "Diagnostics");
s.addChart(pres.charts.LINE, [
  { name: "Training RMSLE", labels: lc.n.map((n) => (n >= 1e5 ? Math.round(n / 1000) + "k" : Math.round(n / 1000) + "k")), values: lc.train },
  { name: "Validation RMSLE (2012)", labels: lc.n.map((n) => Math.round(n / 1000) + "k"), values: lc.valid },
], {
  ...CH, ...chartBase(), chartColors: [HEX.accent4, HEX.accent1], lineSize: 3, lineDataSymbol: "circle", lineDataSymbolSize: 8,
  showLegend: true, legendPos: "b", legendFontSize: 12, legendColor: HEX.dk2, legendFontFace: "+mn-lt",
  valAxisMinVal: 0, valAxisLabelFormatCode: "0.00", title: "LightGBM learning curve: most recent n training rows", catAxisTitle: "Training rows", showCatAxisTitle: true, catAxisTitleFontSize: 11, catAxisTitleColor: HEX.dk2,
});
card(s, "Over- or underfitting?", [
  `Not underfitting: validation error falls from ${f3(lc.valid[0])} (25k rows) to ${f3(Math.min(...lc.valid))} (100k most recent rows)`,
  `Adding older sales back slightly hurts (${f3(lc.valid[lc.valid.length - 1])} with all rows): old prices are less relevant to 2012`,
  `Mild overfitting: train ${f3(lc.train[lc.train.length - 1])} vs valid ${f3(lc.valid[lc.valid.length - 1])}, a gap of ${f3(lastGap)} (original RF gap: ${f3(ORIG.RMSLE - ORIG["Train RMSLE"])})`,
]);

// ================= 10. Feature importance =================
const shapK = Object.keys(R.shap_top).slice(0, 10);
const shapTot = Object.values(R.shap_top).reduce((a, b) => a + b, 0);
s = content("What drives price: product class, age and exact model", "Diagnostics");
s.addChart(pres.charts.BAR, [{ name: "mean |SHAP|", labels: [...shapK].reverse(), values: [...shapK].reverse().map((k) => R.shap_top[k]) }], {
  ...CH, ...chartBase(), barDir: "bar", barGapWidthPct: 35, chartColors: [HEX.accent1],
  showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.000", valAxisHidden: true, valGridLine: { style: "none" },
  title: "Top 10 features by mean |SHAP value| (LightGBM, effect on log price, 2012 sales)",
});
card(s, "Reading SHAP importance", [
  "SHAP splits every prediction into the contribution of each feature; the bars show the average size of that contribution",
  `Top 3: ${shapK.slice(0, 3).join(", ")}. fiProductClassDesc combines machine type and size`,
  "The new machineAge feature ranks #2, above the raw YearMade",
  "Unlike the Random Forest's built-in importance, SHAP is not biased towards columns with many distinct values",
]);

// ================= 11. Predicted vs actual =================
s = content(`${pct(R.within_25)} of 2012 sales are predicted within ±25% of the actual price`, "Diagnostics");
const sc = R.scatter;
const maxv = 150000;
s.addChart(pres.charts.SCATTER, [
  { name: "Actual", values: sc.actual },
  { name: "Predicted", values: sc.pred },
], {
  ...CH, ...chartBase(), chartColors: [HEX.accent2, HEX.accent4], lineSize: 0, lineDataSymbol: "circle", lineDataSymbolSize: 5,
  valAxisMinVal: 0, valAxisMaxVal: maxv, catAxisMinVal: 0, catAxisMaxVal: maxv, valAxisLabelFormatCode: "$#,##0", catAxisLabelFormatCode: "$#,##0",
  title: `Predicted vs actual price, 400 random 2012 sales (${BEST})`, showValAxisTitle: true, valAxisTitle: "Predicted", showCatAxisTitle: true, catAxisTitle: "Actual price (USD)",
  valAxisTitleFontSize: 11, catAxisTitleFontSize: 11, valAxisTitleColor: HEX.dk2, catAxisTitleColor: HEX.dk2,
});
card(s, "Accuracy in plain terms", [
  `${pct(R.within_10)} of sales within ±10% of the true price; ${pct(R.within_25)} within ±25%`,
  `Average error ${money(B.MAE)} per sale; average percentage error ${(B.MAPE * 100).toFixed(1)}%`,
  "A perfect model would put every point on the diagonal (predicted = actual); the spread grows with price",
]);

// ================= 12. Errors by group =================
const G = R.by_group;
const gk = Object.keys(G).sort((a, b) => G[b].RMSLE - G[a].RMSLE);
const BB = R.by_band;
s = content("Errors are largest at the price extremes", "Diagnostics");
s.addChart(pres.charts.BAR, [{ name: "RMSLE", labels: [...gk].reverse(), values: [...gk].reverse().map((k) => G[k].RMSLE) }], {
  x: 0.6, y: 1.75, w: 3.95, h: 4.95, ...chartBase(), barDir: "bar", barGapWidthPct: 35, chartColors: [HEX.accent2],
  showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.000", valAxisHidden: true, valGridLine: { style: "none" }, valAxisMinVal: 0,
  title: "RMSLE by product group", catAxisLabelFontSize: 10,
});
const bk = Object.keys(BB);
s.addChart(pres.charts.BAR, [{ name: "RMSLE", labels: bk, values: bk.map((k) => BB[k].RMSLE) }], {
  x: 4.65, y: 1.75, w: 3.75, h: 4.95, ...chartBase(), barDir: "col", barGapWidthPct: 35, chartColors: [HEX.accent1],
  showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.000", valAxisMinVal: 0, valAxisLabelFormatCode: "0.00",
  title: "RMSLE by actual price band", catAxisLabelFontSize: 10,
});
const worstBand = bk.reduce((a, b) => (BB[a].RMSLE > BB[b].RMSLE ? a : b));
const bestBand = bk.reduce((a, b) => (BB[a].RMSLE < BB[b].RMSLE ? a : b));
card(s, "Where to be careful", [
  `Hardest group: ${gk[0]} (RMSLE ${f3(G[gk[0]].RMSLE)}); easiest: ${gk[gk.length - 1]} (${f3(G[gk[gk.length - 1]].RMSLE)})`,
  `By price: ${worstBand} sales are hardest (${f3(BB[worstBand].RMSLE)}); ${bestBand} sales easiest (${f3(BB[bestBand].RMSLE)})`,
  `Bias: the model tends to over-predict ${bk[0]} machines (${BB[bk[0]]["bias %"] > 0 ? "+" : ""}${Math.round(BB[bk[0]]["bias %"])}%) and under-predict ${bk[bk.length - 1]} (${Math.round(BB[bk[bk.length - 1]]["bias %"])}%), a typical pull towards the average`,
]);

// ================= 13. Test predictions =================
s = content("Test set: 12,457 predictions, ready for Kaggle", "Diagnostics");
stat(s, 0.6, 1.75, 3.9, R.test.n.toLocaleString("en-US"), "test sales priced (May–Nov 2012)", true);
stat(s, 4.7, 1.75, 3.9, money(R.test.median), "median predicted price");
stat(s, 8.8, 1.75, 3.93, `$${Math.round(R.test.min / 1000)}k–$${Math.round(R.test.max / 1000)}k`, "range of predicted prices");
const fx = [
  ["Categories learned from training only", "Test values get the same codes as in training; unseen values become missing instead of a wrong code"],
  ["Right column name", "Saved as SalesID, SalePrice in test_predictions_best_model.csv, as Kaggle expects"],
  ["Same features end to end", "One add_features() and one encode() function used for training, validation and test"],
];
fx.forEach(([h, d], i) => {
  const y = 3.55 + i * 1.07;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y, w: 12.13, h: 0.92, rectRadius: 0.12, fill: { color: C.background2 }, line: { type: "none" }, objectName: "Fix " + h });
  badge(s, 0.85, y + 0.16, 0.6, String(i + 1), 15);
  s.addText(h, { x: 1.7, y: y + 0.1, w: 4.2, h: 0.72, fontSize: 16, bold: true, color: C.text1, valign: "middle", margin: 0, isTextBox: true });
  s.addText(d, { x: 6.0, y: y + 0.1, w: 6.5, h: 0.72, fontSize: 14, color: C.text2, valign: "middle", margin: 0, isTextBox: true });
});

// ================= 14. Recommendation =================
pres.addSection({ title: "Recommendation" });
s = pres.addSlide({ masterName: "TITLE_DARK", sectionTitle: "Recommendation" });
s.addText("Recommendation and next steps", { x: 0.7, y: 0.6, w: 11.9, h: 0.9, fontSize: 36, bold: true, color: C.background1, margin: 0, isTextBox: true, fontFace: THEME.headFontFace });
const cols = [
  ["Recommendation", [`Use ${BEST}, or the top-3 blend, when RMSLE matters most (the competition metric)`, `Use LightGBM when fast retraining matters: ${f3(LG.RMSLE)} RMSLE in about ${Math.round(LG["Fit seconds"])} s`, `Expect ${pct(R.within_25)} of sales within ±25% and about ${money(B.MAE)} average error`]],
  ["Next steps", ["Give recent sales more weight, or train on recent years only", "Tune with time-based cross-validation (e.g. Optuna)", "Reduce under-pricing of $80k+ machines", "Wrap features, encoding and model in one pipeline; monitor drift"]],
];
cols.forEach(([h, items], i) => {
  const x = 0.7 + i * 6.1;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.85, w: 5.8, h: 4.5, rectRadius: 0.12, fill: { color: C.text2 }, line: { type: "none" }, objectName: h });
  s.addText(h, { x: x + 0.35, y: 2.1, w: 5.1, h: 0.5, fontSize: 22, bold: true, color: C.accent1, margin: 0, isTextBox: true });
  s.addText(items.map((t, j) => ({ text: t, options: { bullet: true, breakLine: j < items.length - 1, paraSpaceAfter: 12 } })),
    { x: x + 0.35, y: 2.8, w: 5.1, h: 3.4, fontSize: 17, color: C.background1, valign: "top", margin: 0, isTextBox: true });
});

(async () => {
  const f = process.env.OUT || require("path").join(__dirname, "..", "bulldozer_model_comparison.pptx");
  await pres.writeFile({ fileName: f });
  await applyTheme(f, THEME);
  console.log("wrote", f);
})();
