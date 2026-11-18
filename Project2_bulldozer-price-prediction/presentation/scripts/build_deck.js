// Builds bulldozer_price_analysis.pptx from analysis_results.json
const path = require("path");
const pptxgen = require("pptxgenjs");
const { applyTheme } = require("./apply_theme.js");
const R = require("../../data/processed/analysis_results.json");
const T = require("../../data/processed/test_results.json");
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
const HEX = THEME.colors;
const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = "Bulldozer Sale Price Analysis";
const C = pres.SchemeColor;

// ---------- layouts ----------
pres.defineSlideMaster({
  title: "TITLE_DARK",
  background: { color: C.text1 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.7, y: 2.3, w: 11.9, h: 1.6, fontSize: 44, bold: true, color: C.background1, align: "left", valign: "bottom", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.7, y: 4.1, w: 11.9, h: 1.2, fontSize: 20, color: C.accent1, valign: "top", margin: 0 }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "CONTENT",
  background: { color: C.background1 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 1.55, y: 0.45, w: 11.2, h: 0.95, fontSize: 28, bold: true, color: C.text1, align: "left", valign: "middle", margin: 0 }, text: "" } },
    { text: { text: "Bluebook for Bulldozers  |  Sale price analysis", options: { x: 0.6, y: 7.0, w: 8, h: 0.3, fontSize: 10, color: C.accent5, margin: 0 } } },
  ],
  slideNumber: { x: 12.2, y: 7.0, w: 0.55, h: 0.3, fontSize: 10, color: C.accent5, align: "right" },
});

pres.defineSlideMaster({
  title: "CONTENT_PLAIN",
  background: { color: C.background1 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.45, w: 12.1, h: 0.95, fontSize: 28, bold: true, color: C.text1, align: "left", valign: "middle", margin: 0 }, text: "" } },
    { text: { text: "Bluebook for Bulldozers  |  Sale price analysis", options: { x: 0.6, y: 7.0, w: 8, h: 0.3, fontSize: 10, color: C.accent5, margin: 0 } } },
  ],
  slideNumber: { x: 12.2, y: 7.0, w: 0.55, h: 0.3, fontSize: 10, color: C.accent5, align: "right" },
});
// ---------- helpers ----------
const fmt = (n) => Math.round(n).toLocaleString("en-US");
const money = (n) => "$" + fmt(n);
const chartBase = () => ({
  catAxisLabelColor: HEX.dk2, valAxisLabelColor: HEX.dk2,
  catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt", dataLabelFontFace: "+mn-lt", titleFontFace: "+mn-lt",
  catAxisLabelFontSize: 11, valAxisLabelFontSize: 11, dataLabelFontSize: 10,
  dataLabelColor: HEX.dk1,
  valGridLine: { color: "E3E6E9", size: 0.75 }, catGridLine: { style: "none" },
  catAxisLineShow: true, valAxisLineShow: false,
  showLegend: false,
});

function qSlide(num, headline, section) {
  const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: section });
  // motif: amber Q-badge
  s.addShape(pres.shapes.OVAL, { x: 0.6, y: 0.5, w: 0.82, h: 0.82, fill: { color: C.accent1 }, line: { type: "none" }, objectName: "Question badge" });
  s.addText("Q" + num, { x: 0.6, y: 0.5, w: 0.82, h: 0.82, fontSize: 18, bold: true, color: C.text1, align: "center", valign: "middle", margin: 0, isTextBox: true, fontFace: THEME.headFontFace });
  s.addText(headline, { placeholder: "title" });
  return s;
}

// commentary card on the right: question + bullets
function card(s, question, bullets, opts = {}) {
  const x = opts.x ?? 8.6, y = opts.y ?? 1.75, w = opts.w ?? 4.13, h = opts.h ?? 4.95;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: C.background2 }, line: { type: "none" }, objectName: "Insight card" });
  s.addText("THE QUESTION", { x: x + 0.3, y: y + 0.25, w: w - 0.6, h: 0.3, fontSize: 11, bold: true, color: C.accent3, charSpacing: 2, margin: 0, isTextBox: true });
  s.addText(question, { x: x + 0.3, y: y + 0.55, w: w - 0.6, h: 0.8, fontSize: 15, italic: true, color: C.text2, margin: 0, valign: "top", isTextBox: true });
  s.addText("WHAT THE DATA SAYS", { x: x + 0.3, y: y + 1.45, w: w - 0.6, h: 0.3, fontSize: 11, bold: true, color: C.accent3, charSpacing: 2, margin: 0, isTextBox: true });
  s.addText(
    bullets.map((b, i) => ({ text: b, options: { bullet: true, breakLine: i < bullets.length - 1, paraSpaceAfter: 8 } })),
    { x: x + 0.3, y: y + 1.8, w: w - 0.6, h: h - 2.0, fontSize: 14, color: C.text1, valign: "top", margin: 0, isTextBox: true }
  );
}

function stat(s, x, y, w, big, label, dark = false) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 1.55, rectRadius: 0.12, fill: { color: dark ? C.text2 : C.background2 }, line: { type: "none" }, objectName: "Stat " + label });
  s.addText(big, { x: x + 0.25, y: y + 0.18, w: w - 0.5, h: 0.75, fontSize: 34, bold: true, color: dark ? C.accent1 : C.text1, margin: 0, isTextBox: true, fontFace: THEME.headFontFace });
  s.addText(label, { x: x + 0.25, y: y + 0.95, w: w - 0.5, h: 0.45, fontSize: 13, color: dark ? C.background1 : C.text2, margin: 0, valign: "top", isTextBox: true });
}

const CH = { x: 0.6, y: 1.75, w: 7.7, h: 4.95 }; // chart area

// ================= 1. Title =================
pres.addSection({ title: "Introduction" });
let s = pres.addSlide({ masterName: "TITLE_DARK", sectionTitle: "Introduction" });
s.addShape(pres.shapes.OVAL, { x: 0.7, y: 1.2, w: 0.82, h: 0.82, fill: { color: C.accent1 }, line: { type: "none" }, objectName: "Badge" });
s.addText("10", { x: 0.7, y: 1.2, w: 0.82, h: 0.82, fontSize: 20, bold: true, color: C.text1, align: "center", valign: "middle", margin: 0, isTextBox: true });
s.addText("What Drives the Price of a Used Bulldozer?", { placeholder: "title" });
s.addText("10 questions answered from 412,698 auction sales (1989–2012) and a Random Forest price model", { placeholder: "body" });
s.addText("Data: Kaggle Bluebook for Bulldozers  |  Notebook: end-end-bulldozer-price-regression.ipynb", { x: 0.7, y: 6.6, w: 11.9, h: 0.35, fontSize: 12, color: C.accent4, margin: 0, isTextBox: true });
s.addNotes("This deck summarises the exploratory analysis and model built in the bulldozer price regression notebook. Each content slide answers one question.");

// ================= 2. Executive summary =================
s = pres.addSlide({ masterName: "CONTENT_PLAIN", sectionTitle: "Introduction" });
s.addText("Executive summary: age and machine type set the price", { placeholder: "title" });
stat(s, 0.6, 1.75, 2.85, money(R.q2.median), "Median sale price");
stat(s, 3.68, 1.75, 2.85, "−58%", "Median price, new (0–2 yrs) vs 30+ yrs old");
stat(s, 6.76, 1.75, 2.85, "4×", "Median price gap: motor graders vs skid steers");
stat(s, 9.84, 1.75, 2.89, R.q10.valid_rmsle.toFixed(3), "Model RMSLE on 2012 sales (R² " + R.q10.valid_r2.toFixed(2) + ")", true);
const qs = [
  ["Q1", "Dataset size & scope"], ["Q2", "Price distribution"], ["Q3", "Sales volume over time"], ["Q4", "Price trend over time"], ["Q5", "Where machines sell"],
  ["Q6", "Missing data"], ["Q7", "Price by product group"], ["Q8", "Effect of machine age"], ["Q9", "Seasonality"], ["Q10", "Model accuracy & drivers"],
];
qs.forEach(([q, t], i) => {
  const col = i < 5 ? 0 : 1, row = i % 5;
  const x = 0.6 + col * 6.15, y = 3.65 + row * 0.62;
  s.addShape(pres.shapes.OVAL, { x, y, w: 0.46, h: 0.46, fill: { color: C.accent1 }, line: { type: "none" }, objectName: "Badge " + q });
  s.addText(q, { x, y, w: 0.46, h: 0.46, fontSize: 11, bold: true, color: C.text1, align: "center", valign: "middle", margin: 0, isTextBox: true });
  s.addText(t, { x: x + 0.62, y, w: 5.3, h: 0.46, fontSize: 16, color: C.text1, valign: "middle", margin: 0, isTextBox: true });
});

// ================= Q1 =================
pres.addSection({ title: "Exploring the data" });
s = qSlide(1, "Q1. A large, long history: 412k sales across 23 years", "Exploring the data");
stat(s, 0.6, 1.75, 3.6, fmt(R.q1.rows), "Auction sales (TrainAndValid.csv)");
stat(s, 4.4, 1.75, 3.6, String(R.q1.cols), "Columns, incl. target SalePrice");
stat(s, 0.6, 3.5, 3.6, fmt(R.q1.models), "Distinct machine models (ModelID)");
stat(s, 4.4, 3.5, 3.6, "1989–2012", "Sale dates covered");
stat(s, 0.6, 5.25, 3.6, String(R.q1.states), "US states (+ 'Unspecified')");
stat(s, 4.4, 5.25, 3.6, fmt(R.q10.n_valid), "2012 sales held out for validation");
card(s, "How much data do we have, and what does it describe?", [
  "Each row is one bulldozer auction: machine specs, where and when it sold, and the price",
  "Time series data, so the notebook sorts by saledate and validates on the latest year (2012)",
  "Most columns are text, which must become numbers before modelling",
]);

// ================= Q2 =================
s = qSlide(2, "Q2. Prices are right-skewed: most machines sell under $40k", "Exploring the data");
s.addChart(pres.charts.BAR, [{ name: "Sales", labels: R.q2.labels, values: R.q2.counts }], {
  ...CH, ...chartBase(), barDir: "col", barGapWidthPct: 25, chartColors: [HEX.accent1],
  showTitle: true, title: "Number of sales by sale price band (USD)", titleFontSize: 14, titleColor: HEX.dk1,
  valAxisLabelFormatCode: "#,##0", catAxisTitle: "Sale price band (start of $10k band)", showCatAxisTitle: true, catAxisTitleFontSize: 11, catAxisTitleColor: HEX.dk2,
});
card(s, "What does the sale price distribution look like?", [
  `Median ${money(R.q2.median)} vs mean ${money(R.q2.mean)}: a long tail of expensive machines pulls the mean up`,
  `${Math.round(R.q2.share_under_40k * 100)}% of sales are under $40k; range ${money(R.q2.min)} to ${money(R.q2.max)}`,
  "Skew explains why the competition scores with RMSLE, a log-based error",
]);

// ================= Q3 =================
s = qSlide(3, "Q3. Sales volume grew 9× from 1989 to its 2009 peak", "Exploring the data");
s.addChart(pres.charts.BAR, [{ name: "Sales", labels: R.q3.years, values: R.q3.counts }], {
  ...CH, ...chartBase(), barDir: "col", barGapWidthPct: 30,
  chartColors: R.q3.years.map((y) => (y === "2009" ? HEX.accent3 : y === "2012" ? HEX.accent4 : HEX.accent1)),
  showTitle: true, title: "Number of sales per year", titleFontSize: 14, titleColor: HEX.dk1,
  valAxisLabelFormatCode: "#,##0", catAxisLabelRotate: -45, catAxisLabelFontSize: 10,
});
card(s, "How has the number of sales changed over time?", [
  `From ${fmt(R.q3.counts[0])} sales in 1989 to ${fmt(43849)} in 2009 (orange)`,
  "Volume jumped in 2007–2009 as the housing and construction slump pushed fleets onto the auction market",
  "2012 (grey) only covers Jan–Apr and is the notebook's validation set",
]);

// ================= Q4 =================
s = qSlide(4, "Q4. Median prices stayed in a narrow $21k–$27k band", "Exploring the data");
s.addChart(pres.charts.LINE, [{ name: "Median price", labels: R.q4.years, values: R.q4.median }], {
  ...CH, ...chartBase(), chartColors: [HEX.accent3], lineSize: 3, lineDataSymbol: "circle", lineDataSymbolSize: 7,
  showTitle: true, title: "Median sale price by year (USD)", titleFontSize: 14, titleColor: HEX.dk1,
  valAxisMinVal: 15000, valAxisMaxVal: 30000, valAxisLabelFormatCode: "$#,##0", catAxisLabelRotate: -45, catAxisLabelFontSize: 10,
});
card(s, "Have bulldozer prices changed over time?", [
  "Nominal median rose only about 29% in 23 years (from $21,000 to $27,000), well below inflation",
  "Visible dip in 2009 ($22,000) during the recession, then recovery to $26,000+ by 2011",
  "saleYear still ranks #3 in model importance: time matters once machine type is controlled for",
]);

// ================= Q5 =================
s = qSlide(5, "Q5. Florida and Texas account for nearly 3 in 10 sales", "Exploring the data");
s.addChart(pres.charts.BAR, [{ name: "Sales", labels: [...R.q5.states].reverse(), values: [...R.q5.counts].reverse() }], {
  ...CH, ...chartBase(), barDir: "bar", barGapWidthPct: 35, chartColors: [HEX.accent2],
  showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "#,##0", valAxisHidden: true, valGridLine: { style: "none" },
  showTitle: true, title: "Top 10 states by number of sales", titleFontSize: 14, titleColor: HEX.dk1,
});
card(s, "Which states have the most bulldozer sales?", [
  `Florida leads with ${fmt(R.q5.counts[0])} sales (${Math.round(R.q5.top_share * 100)}% of all)`,
  `The top 5 states hold ${Math.round(R.q5.top5_share * 100)}% of sales, all Sun Belt or fast-growing regions`,
  "state was one of the columns converted to a pandas category in the notebook",
]);

// ================= Q6 =================
s = qSlide(6, "Q6. Data quality: 35 of 53 columns are more than half empty", "Exploring the data");
s.addChart(pres.charts.BAR, [{ name: "% missing", labels: [...R.q6.cols].reverse(), values: [...R.q6.pct].reverse() }], {
  ...CH, ...chartBase(), barDir: "bar", barGapWidthPct: 35, chartColors: [HEX.accent3],
  showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: '0.0"%"', valAxisHidden: true, valGridLine: { style: "none" }, valAxisMaxVal: 110,
  showTitle: true, title: "Columns with the most missing values (% of rows)", titleFontSize: 14, titleColor: HEX.dk1,
});
card(s, "How much data is missing, and how was it handled?", [
  `${R.q6.n_any} of 53 columns have gaps; ${R.q6.n_over50} are over 50% empty`,
  "Numeric gaps filled with the median (robust to the price skew)",
  "Text columns turned into category codes, with missing = 0",
  "Each fill adds an _is_missing flag, so the model can learn from the gap itself",
]);

// ================= Q7 =================
pres.addSection({ title: "Price drivers" });
s = qSlide(7, "Q7. Machine type matters: graders sell for 4× skid steers", "Price drivers");
s.addChart(pres.charts.BAR, [{ name: "Median price", labels: [...R.q7.groups].reverse(), values: [...R.q7.median].reverse() }], {
  ...CH, ...chartBase(), barDir: "bar", barGapWidthPct: 35, chartColors: [HEX.accent1],
  showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "$#,##0", valAxisHidden: true, valGridLine: { style: "none" }, valAxisMaxVal: 47000,
  showTitle: true, title: "Median sale price by product group (USD)", titleFontSize: 14, titleColor: HEX.dk1,
});
card(s, "Which kinds of machine sell for the most?", [
  "Motor graders top the list at $40,000 median; skid steer loaders are cheapest at $10,000",
  `Track excavators are the most traded group (${fmt(R.q7.count[3])} sales)`,
  "ProductSize and product class are the #2 and #6 model features, confirming type and size drive price",
]);

// ================= Q8 =================
s = qSlide(8, "Q8. Every few years of age takes thousands off the price", "Price drivers");
s.addChart(pres.charts.BAR, [{ name: "Median price", labels: R.q8.labels, values: R.q8.median }], {
  ...CH, ...chartBase(), barDir: "col", barGapWidthPct: 30, chartColors: [HEX.accent2],
  showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "$#,##0", valAxisLabelFormatCode: "$#,##0", valAxisMinVal: 0, valAxisMaxVal: 42000, valAxisMajorUnit: 10000,
  showTitle: true, title: "Median sale price by machine age at sale (years)", titleFontSize: 14, titleColor: HEX.dk1,
  catAxisTitle: "Age at sale = saleYear − YearMade", showCatAxisTitle: true, catAxisTitleFontSize: 11, catAxisTitleColor: HEX.dk2,
});
card(s, "Does a machine's age affect its sale price?", [
  "Median price falls steadily from $36,000 (0–2 yrs) to $15,000 (30+ yrs)",
  "YearMade is the model's single most important feature (21% importance)",
  `Caveat: ${(R.q8_yearmade1000 * 100).toFixed(1)}% of rows have YearMade = 1000 (a placeholder), excluded here`,
]);

// ================= Q9 =================
s = qSlide(9, "Q9. Timing shapes sales volume, not price", "Price drivers");
s.addChart(pres.charts.BAR, [{ name: "Sales", labels: R.q9.months, values: R.q9.m_count }], {
  x: 0.6, y: 1.75, w: 3.95, h: 4.95, ...chartBase(), barDir: "col", barGapWidthPct: 30, chartColors: [HEX.accent1],
  valAxisLabelFormatCode: "#,##0", catAxisLabelFontSize: 10,
  showTitle: true, title: "Sales by month", titleFontSize: 14, titleColor: HEX.dk1,
});
s.addChart(pres.charts.BAR, [{ name: "Sales", labels: R.q9.dow, values: R.q9.d_count }], {
  x: 4.65, y: 1.75, w: 3.75, h: 4.95, ...chartBase(), barDir: "col", barGapWidthPct: 30,
  chartColors: R.q9.dow.map((d) => (d === "Thu" ? HEX.accent3 : HEX.accent2)),
  valAxisLabelFormatCode: "#,##0", catAxisLabelFontSize: 10,
  showTitle: true, title: "Sales by day of week", titleFontSize: 14, titleColor: HEX.dk1,
});
card(s, "Is there seasonality in when and how machines sell?", [
  "Feb and Mar are the busiest months; Jan and Jul the quietest",
  "Thursday hosts 30% of sales; weekends are rare",
  "Monthly median price only ranges $23,000–$26,000, so timing affects volume far more than price",
]);

// ================= Q10a =================
pres.addSection({ title: "Modelling" });
s = qSlide(10, "Q10. The Random Forest predicts 2012 prices within ~$6k", "Modelling");
stat(s, 0.6, 1.75, 2.5, R.q10.valid_rmsle.toFixed(3), "Validation RMSLE", true);
stat(s, 3.25, 1.75, 2.5, R.q10.valid_r2.toFixed(2), "Validation R²", true);
stat(s, 5.9, 1.75, 2.45, money(R.q10.valid_mae), "Mean absolute error", true);
s.addChart(pres.charts.BAR, [{ name: "Validation RMSLE", labels: ["Baseline: predict median", "Quick RF (10k samples)", "Tuned RF (RandomizedSearchCV)", "Final RF (all data)"], values: [R.q10.baseline_rmsle, 0.2936, 0.3160, R.q10.valid_rmsle] }], {
  x: 0.6, y: 3.5, w: 7.75, h: 3.2, ...chartBase(), barDir: "bar", barGapWidthPct: 35,
  chartColors: [HEX.accent4, HEX.accent4, HEX.accent4, HEX.accent1], invertedColors: [HEX.accent4], showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.000",
  valAxisHidden: true, valGridLine: { style: "none" }, valAxisMaxVal: 0.9,
  showTitle: true, title: "Validation RMSLE by model (lower is better)", titleFontSize: 14, titleColor: HEX.dk1,
});
card(s, "How accurately can we predict the sale price of a bulldozer?", [
  "Final model: RandomForestRegressor, 40 trees, max_features 0.5, min_samples_split 14",
  "Trained on 401,125 sales before 2012, validated on 11,573 sales from 2012",
  "Cuts error by 67% versus always guessing the median price",
  "Train RMSLE 0.145 vs valid 0.245: some overfitting remains",
]);

// ================= Q10b =================
s = qSlide(10, "Q10. What the model relies on: age, size and model detail", "Modelling");
s.addChart(pres.charts.BAR, [{ name: "Importance", labels: [...R.q10.features].reverse(), values: [...R.q10.importance].reverse() }], {
  ...CH, ...chartBase(), barDir: "bar", barGapWidthPct: 35, chartColors: [HEX.accent1],
  showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.0%", valAxisHidden: true, valGridLine: { style: "none" }, valAxisMaxVal: 0.25,
  showTitle: true, title: "Top 10 feature importances (final Random Forest)", titleFontSize: 14, titleColor: HEX.dk1,
});
card(s, "Which features drive the model's predictions?", [
  "YearMade (21%) and ProductSize (15%) alone carry over a third of the signal",
  "saleYear ranks #3: market conditions at the time of sale matter",
  "ProductSize_is_missing appears in the top 10: the missing-value flags add real signal",
]);

// ================= Method =================
s = pres.addSlide({ masterName: "CONTENT_PLAIN", sectionTitle: "Modelling" });
s.addText("How the notebook gets from raw CSV to predictions", { placeholder: "title" });
const steps = [
  ["1", "Load & sort", "Read TrainAndValid.csv, parse saledate, sort by date"],
  ["2", "Date features", "Year, month, day, day of week, day of year"],
  ["3", "Missing values", "Median fill, _is_missing flags, text to codes"],
  ["4", "Time split", "Train before 2012 (401k), validate on 2012 (11.6k)"],
  ["5", "Tune & train", "Randomized search, then final RF on all training rows"],
  ["6", "Predict test", "Same steps on Test.csv, align columns, 12,457 prices"],
];
steps.forEach(([n, h, d], i) => {
  const x = 0.6 + i * 2.05, y = 1.9, w = 1.87;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 3.9, rectRadius: 0.12, fill: { color: i === 5 ? C.text2 : C.background2 }, line: { type: "none" }, objectName: "Step " + n });
  s.addShape(pres.shapes.OVAL, { x: x + 0.2, y: y + 0.3, w: 0.65, h: 0.65, fill: { color: C.accent1 }, line: { type: "none" }, objectName: "Step badge " + n });
  s.addText(n, { x: x + 0.2, y: y + 0.3, w: 0.65, h: 0.65, fontSize: 20, bold: true, color: C.text1, align: "center", valign: "middle", margin: 0, isTextBox: true });
  s.addText(h, { x: x + 0.2, y: y + 1.15, w: w - 0.4, h: 0.7, fontSize: 17, bold: true, color: i === 5 ? C.accent1 : C.text1, valign: "top", margin: 0, isTextBox: true });
  s.addText(d, { x: x + 0.2, y: y + 1.9, w: w - 0.4, h: 1.85, fontSize: 14, color: i === 5 ? C.background1 : C.text2, valign: "top", margin: 0, isTextBox: true });
});
s.addText("Evaluation metric: RMSLE (root mean squared log error), as set by the Kaggle competition", { x: 0.6, y: 6.15, w: 12.1, h: 0.4, fontSize: 14, italic: true, color: C.text2, margin: 0, isTextBox: true });

// ================= Test predictions =================
pres.addSection({ title: "From model to predictions" });
s = pres.addSlide({ masterName: "CONTENT_PLAIN", sectionTitle: "From model to predictions" });
s.addText("Test set: 12,457 May–Nov 2012 sales priced by the model", { placeholder: "title" });
const fixes = [
  ["Date column names", "preprocess_data() first wrote saleDayofweek; renamed to saleDayOfWeek / saleDayOfYear to match training"],
  ["Missing flag", "Test.csv has no gaps in auctioneerID, so auctioneerID_is_missing was never made; added it as False"],
  ["Column order", "Reordered with df_test[X_train.columns] so all 102 features line up with the trained model"],
];
s.addText("THREE FIXES THAT MADE ideal_model.predict(df_test) RUN", { x: 0.6, y: 1.65, w: 7.6, h: 0.35, fontSize: 12, bold: true, color: C.accent3, charSpacing: 2, margin: 0, isTextBox: true });
fixes.forEach(([h, d], i) => {
  const y = 2.15 + i * 1.5;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y, w: 7.6, h: 1.3, rectRadius: 0.12, fill: { color: C.background2 }, line: { type: "none" }, objectName: "Fix " + (i + 1) });
  s.addShape(pres.shapes.OVAL, { x: 0.85, y: y + 0.32, w: 0.66, h: 0.66, fill: { color: C.accent1 }, line: { type: "none" }, objectName: "Fix badge " + (i + 1) });
  s.addText(String(i + 1), { x: 0.85, y: y + 0.32, w: 0.66, h: 0.66, fontSize: 18, bold: true, color: C.text1, align: "center", valign: "middle", margin: 0, isTextBox: true });
  s.addText(h, { x: 1.8, y: y + 0.15, w: 6.2, h: 0.4, fontSize: 17, bold: true, color: C.text1, margin: 0, isTextBox: true });
  s.addText(d, { x: 1.8, y: y + 0.55, w: 6.2, h: 0.7, fontSize: 14, color: C.text2, valign: "top", margin: 0, isTextBox: true });
});
stat(s, 8.6, 1.75, 4.13, fmt(T.preds.n), "Predictions, one per SalesID (cells 111–113)", true);
stat(s, 8.6, 3.5, 4.13, money(E.test_notebook_median), "Median predicted price (2012 validation actual: " + money(T.valid2012_median) + ")");
stat(s, 8.6, 5.25, 4.13, "May–Nov 2012", "Sale dates covered by Test.csv");

// ================= Hidden risk =================
s = pres.addSlide({ masterName: "CONTENT_PLAIN", sectionTitle: "From model to predictions" });
s.addText("Hidden risk: test categories are coded differently from training", { placeholder: "title" });
s.addChart(pres.charts.BAR, [{ name: "Validation RMSLE", labels: ["Fix: reuse training categories", "Codes rebuilt from 2012 rows only (as Test.csv)", "Codes shared with training (as validated)"], values: [E.valid_fixed.rmsle, E.valid_separate.rmsle, E.valid_shared.rmsle] }], {
  ...CH, ...chartBase(), barDir: "bar", barGapWidthPct: 40,
  chartColors: [HEX.accent6, HEX.accent3, HEX.accent4], showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.000",
  valAxisHidden: true, valGridLine: { style: "none" }, valAxisMinVal: 0, valAxisMaxVal: 0.5,
  showTitle: true, title: "Same model, 2012 validation sales, three ways of encoding text columns (RMSLE)", titleFontSize: 14, titleColor: HEX.dk1,
});
card(s, "Are the test predictions as accurate as the validation score says?", [
  "No. preprocess_data() builds category codes from Test.csv alone, so the same model name or state gets a different number than in training",
  `${T.cols_with_mismatch} of ${T.n_text_cols} text columns are affected, touching every test row`,
  `Re-run on 2012 sales: RMSLE ${E.valid_shared.rmsle.toFixed(3)} → ${E.valid_separate.rmsle.toFixed(3)}, MAE ${money(E.valid_shared.mae)} → ${money(E.valid_separate.mae)}`,
  `Fix: encode test with the training categories; predictions move a median ${Math.round(E.test_median_abs_change_pct)}% per sale`,
]);

// ================= Conclusion =================
pres.addSection({ title: "Conclusion" });
s = pres.addSlide({ masterName: "TITLE_DARK", sectionTitle: "Conclusion" });
s.addText("Takeaways and next steps", { x: 0.7, y: 0.6, w: 11.9, h: 0.9, fontSize: 36, bold: true, color: C.background1, margin: 0, isTextBox: true, fontFace: THEME.headFontFace });
const cols = [
  ["What we learned", ["Price is set mainly by age, size and machine type", "Timing changes volume, not price", "The Random Forest reaches RMSLE 0.245 and R² 0.88 on unseen 2012 sales", "The notebook now produces prices for all 12,457 test sales"]],
  ["Next steps", ["Encode Test.csv with the training categories (one sklearn Pipeline for train and test)", "Rename the output column to SalePrice, as Kaggle expects, and submit", "Train on log(price), try LightGBM, and use time-based cross-validation", "Clean YearMade = 1000 placeholders"]],
];
cols.forEach(([h, items], i) => {
  const x = 0.7 + i * 6.1;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.85, w: 5.8, h: 4.5, rectRadius: 0.12, fill: { color: C.text2 }, line: { type: "none" }, objectName: h });
  s.addText(h, { x: x + 0.35, y: 2.1, w: 5.1, h: 0.5, fontSize: 22, bold: true, color: C.accent1, margin: 0, isTextBox: true });
  s.addText(items.map((t, j) => ({ text: t, options: { bullet: true, breakLine: j < items.length - 1, paraSpaceAfter: 12 } })),
    { x: x + 0.35, y: 2.8, w: 5.1, h: 3.4, fontSize: 16, color: C.background1, valign: "top", margin: 0, isTextBox: true });
});

(async () => {
  const f = process.env.OUT || path.join(__dirname, "..", "bulldozer_price_analysis.pptx");
  await pres.writeFile({ fileName: f });
  await applyTheme(f, THEME);
  console.log("wrote", f);
})();
