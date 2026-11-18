// Builds bulldozer_interview_qa.pptx: anticipated hiring-manager questions with model answers.
const path = require("path");
const pptxgen = require("pptxgenjs");
const { applyTheme } = require("./apply_theme.js");
const R = require("../../data/processed/analysis_results.json");
const E = require("../../data/processed/encoding_results.json");

const THEME = {
  name: "Bulldozer Amber",
  headFontFace: "Arial",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "1E2226", lt1: "FFFFFF", dk2: "3A4750", lt2: "F1F2F4",
    accent1: "F2A900", accent2: "3A4750", accent3: "C2570C", accent4: "8C9AA5",
    accent5: "6B7B88", accent6: "2E7D5B", hlink: "C2570C", folHlink: "6B7B88",
  },
};
const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = "Bulldozer Project: Interview Q&A";
const C = pres.SchemeColor;
const money = (n) => "$" + Math.round(n).toLocaleString("en-US");

// ---------- layouts ----------
pres.defineSlideMaster({
  title: "TITLE_DARK",
  background: { color: C.text1 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.7, y: 2.3, w: 11.9, h: 1.6, fontSize: 44, bold: true, color: C.background1, align: "left", valign: "bottom", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.7, y: 4.1, w: 11.9, h: 1.2, fontSize: 20, color: C.accent1, align: "left", valign: "top", margin: 0 }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "QA",
  background: { color: C.background1 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 1.55, y: 0.75, w: 11.2, h: 1.1, fontSize: 26, bold: true, color: C.text1, align: "left", valign: "middle", margin: 0 }, text: "" } },
    { text: { text: "Bulldozer price prediction  |  Interview preparation", options: { x: 0.6, y: 7.0, w: 8, h: 0.3, fontSize: 10, color: C.accent5, margin: 0 } } },
  ],
  slideNumber: { x: 12.2, y: 7.0, w: 0.55, h: 0.3, fontSize: 10, color: C.accent5, align: "right" },
});
pres.defineSlideMaster({
  title: "CONTENT_PLAIN",
  background: { color: C.background1 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.45, w: 12.1, h: 0.95, fontSize: 28, bold: true, color: C.text1, align: "left", valign: "middle", margin: 0 }, text: "" } },
    { text: { text: "Bulldozer price prediction  |  Interview preparation", options: { x: 0.6, y: 7.0, w: 8, h: 0.3, fontSize: 10, color: C.accent5, margin: 0 } } },
  ],
  slideNumber: { x: 12.2, y: 7.0, w: 0.55, h: 0.3, fontSize: 10, color: C.accent5, align: "right" },
});

// ---------- content ----------
// each: [question, [answer bullets], keyBig, keyLabel, tip?]
const SECTIONS = [
  ["Problem & business", [
    ["What problem were you solving, and why does it matter?",
      ["Predict the auction sale price of a used bulldozer from its specs and sale details",
       "Helps dealers price stock, buyers avoid overpaying and lenders value machines as collateral",
       "Machines cost tens of thousands of dollars, so a reliable estimate cuts real financial risk"],
      "412,698", "historical auction sales to learn from"],
    ["Why is this a regression problem, and why a time series one?",
      ["Regression: the target, SalePrice, is a continuous dollar amount",
       "Time series: every sale has a date and the real goal is pricing future sales",
       "So I sorted by date and validated on the most recent year, never a random split"],
      "2012", "held out as the 'future' to validate on"],
    ["What does an RMSLE of 0.245 mean in plain English?",
      ["RMSLE is roughly a relative error on a log scale",
       "e^0.245 ≈ 1.28, so a typical prediction is within about ±28% of the true price",
       `In dollars, the average error is ${money(R.q10.valid_mae)} on a median price of ${money(R.q2.median)}`],
      "±28%", "typical relative error on 2012 sales"],
  ]],
  ["The data", [
    ["Describe the dataset.",
      ["412,698 sales from Jan 1989 to Apr 2012, 53 columns including SalePrice",
       "Machine specs (YearMade, model, ProductSize, enclosure), sale details (date, state, auctioneer)",
       "5,281 distinct models; Test.csv adds 12,457 unpriced sales from May to Nov 2012"],
      "53", "columns, most of them text"],
    ["What data-quality problems did you find?",
      ["Heavy missingness: 40 of 53 columns have gaps, 35 are more than half empty",
       "Placeholder values: about 9.5% of rows have YearMade = 1000",
       `Skewed target: median ${money(R.q2.median)} vs mean ${money(R.q2.mean)}, max ${money(R.q2.max)}`],
      "35 / 53", "columns more than 50% empty"],
    ["Why not just drop the columns that are 90% empty?",
      ["For tree models, missingness itself carries information",
       "A missing Blade_Width usually means the machine type has no blade",
       "I kept them and added _is_missing flags; ProductSize_is_missing ranks in the top 10 features"],
      "Top 10", "rank of ProductSize_is_missing", "Dropping them is still a fair experiment to mention"],
    ["What did your exploratory analysis show?",
      ["Price falls steadily with age: $36k median at 0–2 years down to $15k at 30+ years",
       "Machine type matters: motor graders $40k median vs skid steers $10k",
       "Timing moves volume, not price: sales peak Feb–Mar and Thursdays; median price stays $21k–$27k"],
      "4×", "price gap between motor graders and skid steers"],
  ]],
  ["Preprocessing", [
    ["Walk me through your preprocessing.",
      ["Parse saledate, sort by date, split it into year, month, day, day of week, day of year",
       "Numeric gaps: add an _is_missing flag, fill with the median",
       "Text columns: add an _is_missing flag, convert to category codes + 1 (missing = 0)",
       "Result: no missing values, all numeric, 102 features"],
      "102", "features after preprocessing"],
    ["Why fill with the median rather than the mean?",
      ["The data is skewed and has extreme outliers, e.g. MachineHoursCurrentMeter",
       "The median is not pulled by extreme values, so it is a more typical fill value",
       "The _is_missing flag keeps the information that the value was filled"],
      "Median", "robust to skew and outliers"],
    ["Why category codes instead of one-hot encoding?",
      ["Some columns have thousands of values (fiModelDesc, ModelID: 5,281 models)",
       "One-hot would create thousands of sparse columns, using lots of memory and time",
       "Trees split integer codes well; for a linear model I would not do this"],
      "5,281", "distinct models: too many to one-hot"],
    ["Is there any data leakage risk in your preprocessing?",
      ["Yes: medians were computed on the full data before splitting, so 2012 slightly influenced fills",
       "Bigger issue: Test.csv gets its own category codes, so the same model name maps to a different number",
       "The fix is one sklearn Pipeline fitted on training data and reused for validation and test"],
      "0.245 → 0.399", "validation RMSLE if 2012 is coded like Test.csv", "Raise this yourself: it shows maturity"],
  ]],
  ["Model choice", [
    ["Why a Random Forest?",
      ["Strong default for tabular data with mixed types; no scaling needed",
       "Captures non-linear effects and interactions, e.g. age matters more for some machine types",
       "Robust to outliers and gives feature importances to explain results"],
      "0.88", "validation R² from the final forest"],
    ["How does a Random Forest work?",
      ["Builds many decision trees, each on a bootstrap sample of rows",
       "Each split considers a random subset of features (max_features)",
       "Averaging many different, overfit trees cancels much of their variance: this is bagging"],
      "40", "trees in the final model"],
    ["Why not linear regression?",
      ["Price depends on non-linear interactions between type, size and age",
       "High-cardinality categories and heavy missingness need lots of encoding work for linear models",
       "It would still very likely underperform a tree ensemble here"],
      "Non-linear", "relationships between features and price"],
    ["What would you try next, and why?",
      ["Gradient boosting: LightGBM (fast, native categories and missing values) or CatBoost (high-cardinality text)",
       "Train on log(price) so the model directly optimises RMSLE",
       "Expected validation RMSLE of about 0.22–0.23"],
      "0.22–0.23", "expected RMSLE with boosting + log target"],
    ["Random Forest vs gradient boosting: what is the difference?",
      ["Random Forest: independent trees in parallel, averaged; mainly reduces variance",
       "Boosting: trees built one after another, each fixing previous errors; mainly reduces bias",
       "Boosting is usually more accurate but needs tuning and early stopping to avoid overfitting"],
      "Bagging vs boosting", "variance reduction vs bias reduction"],
  ]],
  ["Training & tuning", [
    ["How did you split the data, and why?",
      ["Train: 401,125 sales before 2012; validate: 11,573 sales from 2012",
       "This mimics real use: predict future sales from past ones",
       "A random split would leak future information and inflate the score"],
      "401k / 11.6k", "training vs validation rows"],
    ["Why use max_samples=10000 at first?",
      ["Training on all 400k rows takes minutes per experiment",
       "Capping each tree at 10,000 rows let me compare settings in seconds",
       "Once settings were chosen, the final model was trained on all rows"],
      "Seconds", "per experiment instead of minutes"],
    ["Why RandomizedSearchCV instead of GridSearchCV?",
      ["The search space was large; grid search tries every combination",
       "Random search samples a fixed number and finds near-optimal settings much faster",
       "For the same budget it is usually as good as grid search"],
      "100", "iterations used to find the final settings"],
    ["Your tuned model (0.316) was worse than the quick model (0.294). Why?",
      ["The search ran on a 10,000-row sample and picked max_depth=10",
       "That limits tree complexity too much, so the model underfit",
       "Lesson: tuning on a small sample can mislead; the final settings came from a longer search"],
      "0.316", "RMSLE of the depth-limited tuned model"],
  ]],
  ["Evaluation & fit", [
    ["Why RMSLE, and which other metrics did you use?",
      ["RMSLE measures relative error, suits skewed prices, and is the official Kaggle metric",
       `MAE (${money(R.q10.valid_mae)}) because it is in dollars and easy to explain`,
       "R² (0.88) for share of variation explained; I would add MAPE for business audiences"],
      "0.245", "validation RMSLE (lower is better)"],
    ["Is your model overfitting or underfitting?",
      ["Train RMSLE 0.145 vs valid 0.245: mildly overfitting, not underfitting",
       "0.245 is close to the top of the Kaggle leaderboard (about 0.23)",
       "Part of the gap is the 2012 market shift; forests always score very well on training rows"],
      "0.145 vs 0.245", "train vs validation RMSLE", "Confirm with learning and validation curves"],
    ["How do you know your validation score is trustworthy?",
      ["It is slightly optimistic: I chose settings by their 2012 score",
       "Cleaner: train to 2010, tune on 2011, report 2012 once",
       "Or use TimeSeriesSplit cross-validation and check the score is stable across years"],
      "1 split", "used so far; time-based CV is the upgrade"],
    ["How confident are you in your test predictions?",
      ["Less confident than the validation score suggests",
       "preprocess_data() codes Test.csv categories on their own, so they don't match training",
       `Re-running 2012 that way: RMSLE ${E.valid_shared.rmsle.toFixed(3)} → ${E.valid_separate.rmsle.toFixed(3)}, MAE ${money(E.valid_shared.mae)} → ${money(E.valid_separate.mae)}`,
       "Reusing the training categories restores 0.245"],
      `${money(E.valid_separate.mae)}`, "average error with mismatched codes"],
  ]],
  ["Interpretation", [
    ["What features matter most?",
      ["YearMade (20.8%), ProductSize (15.3%), saleYear (7.4%), fiSecondaryDesc and Enclosure (6.2%)",
       "In short: age, size, model detail and market timing",
       "Matches domain sense: newer, bigger, enclosed-cab machines cost more"],
      "20.8%", "importance of YearMade, the top feature"],
    ["Can you trust those feature importances?",
      ["They are impurity-based, which favours high-cardinality and continuous features",
       "Correlated features (ModelID, fiModelDesc, fiBaseModel) split importance between them",
       "Permutation importance on validation data or SHAP values would be more reliable"],
      "SHAP", "the better tool for importance and direction"],
    ["How would you explain one prediction to a customer?",
      ["Use SHAP to break the price into contributions from each feature",
       "\"Starting from an average of $31k, +$6k for large size, −$4k for being 15 years old…\"",
       "Turns a black-box number into a story the customer can check"],
      "Per-sale", "explanations build trust"],
  ]],
  ["Production", [
    ["How would you deploy this model?",
      ["Wrap preprocessing and model in one sklearn Pipeline so prediction-time steps match training",
       "Save with joblib and serve behind an API, e.g. FastAPI",
       "Version the model and log every prediction"],
      "1 Pipeline", "prevents the train/test encoding mismatch"],
    ["How would you monitor it after deployment?",
      ["Data drift: new models, states or ages outside the training range",
       "Performance: compare predictions with actual auction prices, track RMSLE and MAE",
       "Retrain on a schedule or when error crosses a threshold"],
      "2009", "recession dip shows prices move with the economy"],
    ["What happens with a model the system has never seen?",
      ["Its category falls into an unknown code, so the model leans on other features",
       "Product size, class and year made still carry most of the signal",
       "CatBoost or target encoding handle unseen categories more gracefully"],
      "Fallback", "broad features cover unseen models"],
    ["What is the biggest risk in using this model?",
      ["Economic shifts: the model learns past conditions and can be systematically off in a downturn",
       "Rare or extreme machines have little data and larger errors",
       "Mitigate with monitoring, regular retraining and wider uncertainty for rare machines"],
      "Drift", "the main long-term risk"],
  ]],
  ["Reflection", [
    ["What would you do differently?",
      ["Build an sklearn Pipeline from day one: no leakage, identical train and test preprocessing",
       "Train on log(price) and use time-based cross-validation",
       "Clean YearMade = 1000, add machineAge, try LightGBM or CatBoost"],
      "Pipeline", "first change I would make"],
    ["What was the hardest part?",
      ["Getting Test.csv into exactly the training format",
       "Fixed column names (saleDayofweek), added auctioneerID_is_missing, reordered to X_train.columns",
       "Then found the category codes still did not match training: a silent error, no crash",
       "Lesson: fit preprocessing once and reuse it"],
      "3 + 1", "fixes made, one still to do"],
    ["What did you learn from this project?",
      ["How you split matters as much as the model: time-based, not random",
       "Missing values can be useful features",
       "The metric should match the business problem: relative error suits prices",
       "A model is only as good as its preprocessing at prediction time"],
      "4", "lessons to carry into the next project"],
  ]],
];

// ---------- helpers ----------
function badge(s, x, y, d, text, size) {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: C.accent1 }, line: { type: "none" }, objectName: "Badge " + text });
  s.addText(text, { x, y, w: d, h: d, fontSize: size, bold: true, color: C.text1, align: "center", valign: "middle", margin: 0, isTextBox: true, fontFace: THEME.headFontFace });
}

function qaSlide(n, section, q, answers, big, label, tip) {
  const s = pres.addSlide({ masterName: "QA", sectionTitle: section });
  s.addText(section.toUpperCase(), { x: 0.6, y: 0.4, w: 8, h: 0.3, fontSize: 12, bold: true, color: C.accent3, charSpacing: 2, margin: 0, isTextBox: true });
  badge(s, 0.6, 0.89, 0.82, "Q" + n, n >= 10 ? 16 : 18);
  s.addText(q, { placeholder: "title" });
  // answer card
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 2.15, w: 7.9, h: 4.55, rectRadius: 0.12, fill: { color: C.background2 }, line: { type: "none" }, objectName: "Answer card" });
  s.addText("SUGGESTED ANSWER", { x: 0.95, y: 2.4, w: 7.2, h: 0.3, fontSize: 11, bold: true, color: C.accent3, charSpacing: 2, margin: 0, isTextBox: true });
  s.addText(answers.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < answers.length - 1, paraSpaceAfter: 14 } })),
    { x: 0.95, y: 2.85, w: 7.2, h: 3.7, fontSize: 20, color: C.text1, valign: "top", margin: 0, isTextBox: true });
  // key point card
  const kh = tip ? 2.75 : 4.55;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 8.75, y: 2.15, w: 3.98, h: kh, rectRadius: 0.12, fill: { color: C.text2 }, line: { type: "none" }, objectName: "Key point" });
  s.addText("KEY POINT", { x: 9.05, y: 2.4, w: 3.4, h: 0.3, fontSize: 11, bold: true, color: C.accent4, charSpacing: 2, margin: 0, isTextBox: true });
  s.addText(big, { x: 9.05, y: 2.8, w: 3.4, h: 0.95, fontSize: big.length > 9 ? 28 : 40, bold: true, color: C.accent1, valign: "middle", margin: 0, isTextBox: true, fontFace: THEME.headFontFace, fit: "none" });
  s.addText(label, { x: 9.05, y: 3.85, w: 3.4, h: 1.1, fontSize: 18, color: C.background1, valign: "top", margin: 0, isTextBox: true });
  if (tip) {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 8.75, y: 5.1, w: 3.98, h: 1.6, rectRadius: 0.12, fill: { color: C.accent1 }, line: { type: "none" }, objectName: "Tip" });
    s.addText("TIP", { x: 9.05, y: 5.3, w: 3.4, h: 0.3, fontSize: 11, bold: true, color: C.text1, charSpacing: 2, margin: 0, isTextBox: true });
    s.addText(tip, { x: 9.05, y: 5.65, w: 3.4, h: 0.9, fontSize: 15, color: C.text1, valign: "top", margin: 0, isTextBox: true });
  }
  return s;
}

// ================= Title =================
pres.addSection({ title: "Introduction" });
let s = pres.addSlide({ masterName: "TITLE_DARK", sectionTitle: "Introduction" });
badge(s, 0.7, 1.2, 0.82, "Q&A", 15);
s.addText("Bulldozer Price Prediction: Interview Q&A", { placeholder: "title" });
s.addText("Questions a hiring manager is likely to ask about the dataset, model and results, with suggested answers", { placeholder: "body" });
s.addText("Based on end-end-bulldozer-price-regression.ipynb and the Kaggle Blue Book for Bulldozers data", { x: 0.7, y: 6.6, w: 11.9, h: 0.35, fontSize: 12, color: C.accent4, margin: 0, isTextBox: true });

// ================= Pitch =================
s = pres.addSlide({ masterName: "CONTENT_PLAIN", sectionTitle: "Introduction" });
s.addText("Your 60-second project summary", { placeholder: "title" });
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 1.75, w: 7.9, h: 4.95, rectRadius: 0.12, fill: { color: C.background2 }, line: { type: "none" }, objectName: "Pitch card" });
s.addText([
  { text: "\"I built a regression model to predict used bulldozer auction prices from Kaggle's Blue Book data: about 412,000 sales from 1989 to 2012.", options: { breakLine: true, paraSpaceAfter: 10 } },
  { text: "I treated it as a time series problem, engineered date features, handled heavy missing data with median fills and missing-value flags, and validated on 2012 sales the model never saw.", options: { breakLine: true, paraSpaceAfter: 10 } },
  { text: "A tuned Random Forest reached RMSLE 0.245 and R² 0.88, close to the top of the Kaggle leaderboard. Age, size and sale year drive price.\"" },
], { x: 0.95, y: 2.05, w: 7.2, h: 4.4, fontSize: 21, italic: true, color: C.text1, valign: "top", margin: 0, isTextBox: true });
[["412,698", "sales analysed"], ["0.245", "validation RMSLE"], ["0.88", "validation R²"]].forEach(([b, l], i) => {
  const y = 1.75 + i * 1.7;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 8.75, y, w: 3.98, h: 1.55, rectRadius: 0.12, fill: { color: C.text2 }, line: { type: "none" }, objectName: "Pitch stat " + l });
  s.addText(b, { x: 9.05, y: y + 0.18, w: 3.4, h: 0.75, fontSize: 34, bold: true, color: C.accent1, margin: 0, isTextBox: true, fontFace: THEME.headFontFace });
  s.addText(l, { x: 9.05, y: y + 0.95, w: 3.4, h: 0.45, fontSize: 15, color: C.background1, margin: 0, isTextBox: true });
});

// ================= Agenda =================
s = pres.addSlide({ masterName: "CONTENT_PLAIN", sectionTitle: "Introduction" });
const TOTAL_Q = SECTIONS.reduce((n, [, qs]) => n + qs.length, 0);
s.addText(`${TOTAL_Q} likely questions across ${SECTIONS.length} topics`, { placeholder: "title" });
let qn = 1;
SECTIONS.forEach(([name, qs], i) => {
  const col = i % 3, row = Math.floor(i / 3);
  const x = 0.6 + col * 4.1, y = 1.75 + row * 1.65, w = 3.9;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 1.45, rectRadius: 0.12, fill: { color: C.background2 }, line: { type: "none" }, objectName: "Topic " + name });
  badge(s, x + 0.25, y + 0.38, 0.7, String(i + 1), 18);
  s.addText(name, { x: x + 1.15, y: y + 0.28, w: w - 1.35, h: 0.45, fontSize: 18, bold: true, color: C.text1, margin: 0, isTextBox: true });
  s.addText(`Q${qn}–Q${qn + qs.length - 1}  ·  ${qs.length} questions`, { x: x + 1.15, y: y + 0.78, w: w - 1.35, h: 0.4, fontSize: 14, color: C.text2, margin: 0, isTextBox: true });
  qn += qs.length;
});

// ================= Q&A slides =================
qn = 1;
SECTIONS.forEach(([name, qs]) => {
  pres.addSection({ title: name });
  qs.forEach(([q, a, big, label, tip]) => { qaSlide(qn++, name, q, a, big, label, tip); });
});

// ================= Quick facts =================
pres.addSection({ title: "Wrap-up" });
s = pres.addSlide({ masterName: "CONTENT_PLAIN", sectionTitle: "Wrap-up" });
s.addText("Quick facts to memorise", { placeholder: "title" });
const facts = [
  ["Rows / columns", "412,698 / 53 (102 features after preprocessing)"],
  ["Date range", "Jan 1989 – Apr 2012; test set May – Nov 2012"],
  ["Train / validation", "401,125 / 11,573 (validation = 2012)"],
  ["Median / mean price", `${money(R.q2.median)} / ${money(R.q2.mean)}`],
  ["Final model", "Random Forest: 40 trees, max_features 0.5, min_samples_split 14"],
  ["Validation RMSLE / R² / MAE", `0.245 / 0.88 / ${money(R.q10.valid_mae)}`],
  ["Train RMSLE", "0.145 (mild overfitting)"],
  ["Baseline RMSLE (predict median)", "0.744: the model is 67% better"],
  ["Top 3 features", "YearMade, ProductSize, saleYear"],
  ["Test-set encoding risk", `RMSLE 0.245 → ${E.valid_separate.rmsle.toFixed(3)} if categories are coded separately`],
];
const rows = facts.map(([k, v], i) => [
  { text: k, options: { bold: true, color: C.text1, fill: { color: i % 2 ? C.background1 : C.background2 } } },
  { text: v, options: { color: C.text2, fill: { color: i % 2 ? C.background1 : C.background2 } } },
]);
s.addTable(rows, { x: 0.6, y: 1.7, w: 12.1, colW: [4.3, 7.8], fontSize: 15, rowH: 0.48, border: { type: "none" }, margin: [0, 0.15, 0, 0.15], valign: "middle" });

// ================= Questions to ask =================
s = pres.addSlide({ masterName: "TITLE_DARK", sectionTitle: "Wrap-up" });
s.addText("Questions to ask her at the end", { x: 0.7, y: 0.6, w: 11.9, h: 0.9, fontSize: 36, bold: true, color: C.background1, margin: 0, isTextBox: true, fontFace: THEME.headFontFace });
[
  ["Use", "How would a model like this be used in your team: pricing, risk, or something else?"],
  ["Production", "How do you handle model monitoring and retraining in production?"],
  ["Stack", "What does your ML stack look like? Do you use pipelines or a feature store?"],
].forEach(([h, t], i) => {
  const x = 0.7 + i * 4.05;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.85, w: 3.8, h: 3.6, rectRadius: 0.12, fill: { color: C.text2 }, line: { type: "none" }, objectName: "Ask " + h });
  badge(s, x + 0.3, 2.15, 0.7, String(i + 1), 18);
  s.addText(h, { x: x + 0.3, y: 3.05, w: 3.2, h: 0.45, fontSize: 20, bold: true, color: C.accent1, margin: 0, isTextBox: true });
  s.addText(t, { x: x + 0.3, y: 3.6, w: 3.2, h: 1.7, fontSize: 16, color: C.background1, valign: "top", margin: 0, isTextBox: true });
});

(async () => {
  const f = process.env.OUT || path.join(__dirname, "..", "bulldozer_interview_qa.pptx");
  await pres.writeFile({ fileName: f });
  await applyTheme(f, THEME);
  console.log("wrote", f);
})();
