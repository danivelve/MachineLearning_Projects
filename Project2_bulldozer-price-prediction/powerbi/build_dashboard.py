"""Generates the Bulldozer_Price_Dashboard Power BI Project (.pbip): data model, DAX measures and report pages."""
import json
import shutil
import uuid
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
NAME = "Bulldozer_Price_Dashboard"
DATA_FOLDER = str(ROOT / "data" / "processed" / "powerbi") + "\\"

YELLOW, DARK, SLATE, GREY = "#F2A900", "#22282C", "#5B7083", "#5F6368"
PAGE_BG, BORDER, SOFT = "#F4F2EC", "#E3DFD3", "#FFF6DD"
S = "https://developer.microsoft.com/json-schemas/fabric"

# ------------------------------------------------------------------ data model
I, F, T, D = "int64", "double", "string", "dateTime"
SHARED = [("sale_date", D), ("sale_year", I), ("sale_month", I), ("month_name", T, "sale_month"), ("weekday_order", I),
          ("weekday", T, "weekday_order"), ("state", T), ("product_group", T), ("product_size", T, "product_size_order"),
          ("product_size_order", I), ("year_made", I), ("machine_age", I), ("age_band", T, "age_band_order"), ("age_band_order", I)]
TABLES = {
    "sales": SHARED + [("model_id", I), ("sale_price", I), ("price_band", T, "price_band_order"), ("price_band_order", I)],
    "test_predictions": [("sales_id", I)] + SHARED + [("predicted_price", I)],
    "data_quality": [("column_name", T), ("pct_missing", F)],
    "model_scores": [("model", T), ("model_type", T), ("rmsle", F), ("mae", F), ("r2", F)],
    "accuracy_summary": [("metric", T), ("share", F)],
    "time_validation": [("validation_year", T), ("rmsle", F)],
    "learning_curve": [("training_rows", I), ("rows_label", T, "training_rows"), ("train_rmsle", F), ("valid_rmsle", F)],
    "feature_importance": [("feature", T), ("shap_importance", F)],
    "error_by_price_band": [("price_band", T, "band_order"), ("band_order", I), ("rmsle", F), ("sales", I), ("bias", F)],
}
USD, N, P1, P0, R3 = "\\$#,0", "#,0", "0.0%", "0%", "0.000"
MEASURES = {
    "sales": [
        ("Total Sales", "COUNTROWS ( sales )", N),
        ("Median Price", "MEDIAN ( sales[sale_price] )", USD),
        ("Average Price", "AVERAGE ( sales[sale_price] )", USD),
        ("Machine Models", "DISTINCTCOUNT ( sales[model_id] )", N),
        ("Share Under 40k", "DIVIDE ( CALCULATE ( [Total Sales], sales[sale_price] < 40000 ), [Total Sales] )", P0),
        ("Median Price Known Age", 'IF ( SELECTEDVALUE ( sales[age_band] ) <> "Unknown", [Median Price] )', USD),
        ("Sales Top 10 States", "IF ( RANKX ( ALLSELECTED ( sales[state] ), [Total Sales] ) <= 10, [Total Sales] )", N),
        ("Unknown Build Year Share", "DIVIDE ( COUNTBLANK ( sales[year_made] ), [Total Sales] )", P1),
    ],
    "test_predictions": [
        ("Test Sales", "COUNTROWS ( test_predictions )", N),
        ("Median Predicted Price", "MEDIAN ( test_predictions[predicted_price] )", USD),
        ("Lowest Predicted Price", "MIN ( test_predictions[predicted_price] )", USD),
        ("Highest Predicted Price", "MAX ( test_predictions[predicted_price] )", USD),
        ("Median Predicted Known Age", 'IF ( SELECTEDVALUE ( test_predictions[age_band] ) <> "Unknown", [Median Predicted Price] )', USD),
    ],
    "data_quality": [
        ("Missing Share", "MAX ( data_quality[pct_missing] )", P1),
        ("Missing Share Top 10", "IF ( RANKX ( ALL ( data_quality[column_name] ), [Missing Share], , DESC, SKIP ) <= 10, [Missing Share] )", P1),
        ("Columns With Gaps", "CALCULATE ( COUNTROWS ( data_quality ), data_quality[pct_missing] > 0 )", N),
        ("Columns Over Half Empty", "CALCULATE ( COUNTROWS ( data_quality ), data_quality[pct_missing] > 0.5 )", N),
    ],
    "model_scores": [
        ("Model RMSLE", "MIN ( model_scores[rmsle] )", R3),
        ("Model MAE", "MIN ( model_scores[mae] )", USD),
        ("R Squared", "MAX ( model_scores[r2] )", R3),
        ("Original RF RMSLE", 'CALCULATE ( [Model RMSLE], model_scores[model] = "Original RF" )', R3),
        ("CatBoost RMSLE", 'CALCULATE ( [Model RMSLE], model_scores[model] = "CatBoost" )', R3),
        ("Blend RMSLE", 'CALCULATE ( [Model RMSLE], model_scores[model] = "Top-3 blend" )', R3),
        ("Blend Improvement", "1 - DIVIDE ( [Blend RMSLE], [Original RF RMSLE] )", P1),
    ],
    "accuracy_summary": [("Within 25 Percent", 'CALCULATE ( MAX ( accuracy_summary[share] ), accuracy_summary[metric] = "Within 25%" )', P0)],
    "time_validation": [("Yearly RMSLE", "MAX ( time_validation[rmsle] )", R3)],
    "learning_curve": [("Train RMSLE", "MAX ( learning_curve[train_rmsle] )", R3), ("Validation RMSLE", "MAX ( learning_curve[valid_rmsle] )", R3)],
    "feature_importance": [("SHAP Importance", "MAX ( feature_importance[shap_importance] )", R3),
                           ("SHAP Importance Top 7", "IF ( RANKX ( ALL ( feature_importance[feature] ), [SHAP Importance] ) <= 7, [SHAP Importance] )", R3)],
    "error_by_price_band": [("Price Bias", "MAX ( error_by_price_band[bias] )", P0)],
}
M_TYPE = {I: "Int64.Type", F: "type number", T: "type text", D: "type date"}


def table_tmdl(name, cols):
    out = [f"table {name}", ""]
    for m, expr, fmt in MEASURES.get(name, []):
        out += [f"\tmeasure '{m}' = {expr}", f"\t\tformatString: {fmt}", ""]
    for c in cols:
        col, typ, sort = c[0], c[1], c[2] if len(c) > 2 else None
        out += [f"\tcolumn {col}", f"\t\tdataType: {typ}"]
        if typ == D:
            out.append("\t\tformatString: yyyy-mm-dd")
        out += ["\t\tsummarizeBy: none", f"\t\tsourceColumn: {col}"]
        if sort:
            out.append(f"\t\tsortByColumn: {sort}")
        if typ == D:
            out += ["", "\t\tannotation UnderlyingDateTimeDataType = Date"]
        out.append("")
    types = ", ".join('{"%s", %s}' % (c[0], M_TYPE[c[1]]) for c in cols)
    out += [f"\tpartition {name} = m", "\t\tmode: import", "\t\tsource =", "\t\t\t\tlet",
            f'\t\t\t\t    Source = Csv.Document(File.Contents(DataFolder & "{name}.csv"), [Delimiter = ",", Encoding = 65001, QuoteStyle = QuoteStyle.Csv]),',
            "\t\t\t\t    Headers = Table.PromoteHeaders(Source, [PromoteAllScalars = true]),",
            f'\t\t\t\t    Typed = Table.TransformColumnTypes(Headers, {{{types}}}, "en-US")',
            "\t\t\t\tin", "\t\t\t\t    Typed", "", "\tannotation PBI_ResultType = Table", ""]
    return "\n".join(out)


def write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    text = content if isinstance(content, str) else json.dumps(content, indent=2, ensure_ascii=False)
    path.write_text(text, encoding="utf-8", newline="\n")


# ------------------------------------------------------------------ report helpers
counter = 0


def lit(v):
    return {"expr": {"Literal": {"Value": v}}}


def txt(v):
    return lit("'" + v.replace("'", "''") + "'")


def col(c):
    return {"solid": {"color": txt(c)}}


def on(flag=True):
    return lit("true" if flag else "false")


def field(ref):
    table, name = ref.split(".", 1)
    kind = "Measure" if any(name == m[0] for m in MEASURES.get(table, [])) else "Column"
    return {kind: {"Expression": {"SourceRef": {"Entity": table}}, "Property": name}}


def proj(ref, label=None, active=False):
    p = {"field": field(ref), "queryRef": ref, "nativeQueryRef": ref.split(".", 1)[1]}
    if label:
        p["displayName"] = label
    if active:
        p["active"] = True
    return p


def frame(title=None):
    o = {"background": [{"properties": {"show": on(), "color": col("#FFFFFF"), "transparency": lit("0D")}}],
         "border": [{"properties": {"show": on(), "color": col(BORDER), "radius": lit("8D")}}],
         "visualHeader": [{"properties": {"show": on(False)}}]}
    if title:
        o["title"] = [{"properties": {"show": on(), "text": txt(title), "fontSize": lit("12D"), "fontColor": col(DARK), "bold": on()}}]
        o["general"] = [{"properties": {"altText": txt(title)}}]
    else:
        o["title"] = [{"properties": {"show": on(False)}}]
    return o


def visual(pos, body):
    global counter
    counter += 1
    x, y, w, h = pos
    return {"$schema": f"{S}/item/report/definition/visualContainer/2.14.0/schema.json", "name": f"v{counter:015x}",
            "position": {"x": x, "y": y, "z": counter * 1000, "height": h, "width": w}, "visual": {**body, "drillFilterOtherVisuals": True}}


def textbox(pos, runs, bg="#FFFFFF", border=True):
    paragraphs = [{"textRuns": [{"value": v, "textStyle": st} for v, st in para]} for para in runs]
    vco = {"background": [{"properties": {"show": on(), "color": col(bg), "transparency": lit("0D")}}], "visualHeader": [{"properties": {"show": on(False)}}]}
    if border:
        vco["border"] = [{"properties": {"show": on(), "color": col(BORDER), "radius": lit("8D")}}]
    return visual(pos, {"visualType": "textbox", "objects": {"general": [{"properties": {"paragraphs": paragraphs}}]}, "visualContainerObjects": vco})


def header(subtitle):
    return textbox((0, 0, 1280, 62), [[("BULLDOZER PRICE ANALYSIS", {"fontSize": "18pt", "color": YELLOW, "fontWeight": "bold"}),
                                       ("   |   " + subtitle, {"fontSize": "14pt", "color": "#FFFFFF"})]], DARK, border=False)


def insight(pos, text):
    return textbox(pos, [[("KEY INSIGHT", {"fontSize": "10pt", "color": "#8A5F00", "fontWeight": "bold"})], [(text, {"fontSize": "11pt", "color": DARK})]], SOFT)


def card(pos, ref, label):
    return visual(pos, {"visualType": "card", "query": {"queryState": {"Values": {"projections": [proj(ref, label)]}}},
                        "objects": {"labels": [{"properties": {"color": col(DARK), "fontSize": lit("24D"), "labelDisplayUnits": lit("1D")}}],
                                    "categoryLabels": [{"properties": {"show": on(), "color": col(GREY), "fontSize": lit("10D")}}]},
                        "visualContainerObjects": frame()})


def chart(kind, pos, title, cat, y, sort=None, desc=False, labels=True, color=YELLOW, y2=None, legend=False, label_names=None):
    ys = [y] if isinstance(y, str) else y
    state = {"Category": {"projections": [proj(cat, active=True)]}, "Y": {"projections": [proj(r, (label_names or {}).get(r)) for r in ys]}}
    if y2:
        state["Y2"] = {"projections": [proj(y2, (label_names or {}).get(y2))]}
    sort_ref = sort or cat
    query = {"queryState": state, "sortDefinition": {"sort": [{"field": field(sort_ref), "direction": "Descending" if desc else "Ascending"}], "isDefaultSort": sort is None}}
    points = [{"properties": {"fill": col(color)}}]
    if kind == "lineChart":
        palette = [SLATE, YELLOW]
        points = [{"properties": {"fill": col(palette[i])}, "selector": {"metadata": r}} for i, r in enumerate(ys)]
    if y2:
        points.append({"properties": {"fill": col(DARK)}, "selector": {"metadata": y2}})
    value_axis = {"show": on(), "gridlineShow": on(), "fontSize": lit("8D"), "showAxisTitle": on(False)}
    if y2:
        value_axis.update({"secShow": on(), "secShowAxisTitle": on(False)})
    objects = {"dataPoint": points,
               "labels": [{"properties": {"show": on(labels), "color": col("#333333"), "fontSize": lit("9D")}}],
               "valueAxis": [{"properties": value_axis}],
               "categoryAxis": [{"properties": {"show": on(), "fontSize": lit("9D"), "showAxisTitle": on(False), "axisType": txt("Categorical")}}],
               "legend": [{"properties": {"show": on(legend), "position": txt("Top")}}]}
    return visual(pos, {"visualType": kind, "query": query, "objects": objects, "visualContainerObjects": frame(title)})


def table(pos, title, refs):
    query = {"queryState": {"Values": {"projections": [proj(r, l) for r, l in refs]}}, "sortDefinition": {"sort": [{"field": field("model_scores.Model RMSLE"), "direction": "Ascending"}], "isDefaultSort": False}}
    return visual(pos, {"visualType": "tableEx", "query": query,
                        "objects": {"columnHeaders": [{"properties": {"fontSize": lit("9D")}}], "values": [{"properties": {"fontSize": lit("9D")}}], "total": [{"properties": {"totals": on(False)}}]},
                        "visualContainerObjects": frame(title)})


def slicer(pos, ref, title, group, mode="Dropdown"):
    body = {"visualType": "slicer", "query": {"queryState": {"Values": {"projections": [proj(ref, active=True)]}}},
            "objects": {"data": [{"properties": {"mode": txt(mode)}}], "selection": [{"properties": {"selectAllCheckboxEnabled": on()}}] if mode == "Dropdown" else [],
                        "header": [{"properties": {"show": on(False)}}]},
            "visualContainerObjects": frame(title), "syncGroup": {"groupName": group, "fieldChanges": True, "filterChanges": True}}
    if mode != "Dropdown":
        del body["objects"]["selection"]
    return visual(pos, body)


def rail():
    x, w = 1090, 175
    return [slicer((x, 76, w, 104), "sales.sale_year", "Sale year", "year", "Between"),
            slicer((x, 192, w, 76), "sales.product_group", "Machine type", "group"),
            slicer((x, 280, w, 76), "sales.product_size", "Machine size", "size"),
            slicer((x, 368, w, 76), "sales.state", "State", "state"),
            textbox((x, 456, w, 248), [[("HOW TO USE", {"fontSize": "10pt", "color": "#8A5F00", "fontWeight": "bold"})],
                                       [("These filters apply to both market pages. Click any bar to focus the other charts on it. Key insights describe all sales.", {"fontSize": "10pt", "color": DARK})]], SOFT)]


# ------------------------------------------------------------------ pages
def cards_row(items, x0, total_w, y=76, h=88, gap=12):
    w = (total_w - gap * (len(items) - 1)) // len(items)
    return [card((x0 + i * (w + gap), y, w, h), r, l) for i, (r, l) in enumerate(items)]


PAGES = [
    ("market0001", "Market Overview", lambda: [
        header("Market overview"),
        *cards_row([("sales.Total Sales", "Auction sales"), ("sales.Median Price", "Median sale price"), ("sales.Average Price", "Average sale price"),
                    ("sales.Machine Models", "Machine models"), ("sales.Share Under 40k", "Sales under $40k")], 16, 1058),
        chart("lineClusteredColumnComboChart", (16, 176, 640, 270), "Sales volume and median price by year", "sales.sale_year", "sales.Total Sales", labels=False, y2="sales.Median Price",
              legend=True, label_names={"sales.Total Sales": "Sales", "sales.Median Price": "Median price"}),
        chart("clusteredColumnChart", (668, 176, 406, 270), "How sale prices are distributed", "sales.price_band", "sales.Total Sales", labels=False, color=SLATE),
        chart("clusteredColumnChart", (16, 458, 400, 246), "Sales by month", "sales.month_name", "sales.Total Sales"),
        chart("clusteredColumnChart", (428, 458, 268, 246), "Sales by weekday", "sales.weekday", "sales.Total Sales", color=SLATE),
        insight((708, 458, 366, 246), "412,698 sales from 1989 to 2012. Prices are right-skewed: the median is $24,000, the average is $31,215, and 74% of machines sell for under $40,000. Annual sales grew about 9 times to a 2009 peak of 43,849."),
        *rail()]),
    ("drivers0002", "Price Drivers", lambda: [
        header("What drives price"),
        chart("clusteredBarChart", (16, 76, 524, 300), "Median price by machine type", "sales.product_group", "sales.Median Price", sort="sales.Median Price", desc=True),
        chart("clusteredColumnChart", (552, 76, 522, 300), "Median price by machine age (years at sale)", "sales.age_band", "sales.Median Price Known Age", label_names={"sales.Median Price Known Age": "Median price"}),
        chart("clusteredBarChart", (16, 388, 340, 316), "Top 10 states by sales", "sales.state", "sales.Sales Top 10 States", sort="sales.Sales Top 10 States", desc=True, color=SLATE, label_names={"sales.Sales Top 10 States": "Sales"}),
        chart("clusteredColumnChart", (368, 388, 340, 316), "Median price by machine size", "sales.product_size", "sales.Median Price"),
        insight((720, 388, 354, 316), "Motor graders have a $40,000 median, 4 times skid steer loaders at $10,000. Median price falls from $36,000 at 0-2 years old to $15,000 at 30 or more years. Florida has 16% of sales and the top five states have 44%."),
        *rail()]),
    ("models00003", "Model Performance", lambda: [
        header("Model performance on 2012 sales"),
        *cards_row([("model_scores.Original RF RMSLE", "Original Random Forest RMSLE"), ("model_scores.CatBoost RMSLE", "CatBoost RMSLE"), ("model_scores.Blend RMSLE", "Top-3 blend RMSLE"),
                    ("model_scores.Blend Improvement", "Blend error reduction"), ("accuracy_summary.Within 25 Percent", "CatBoost within 25% of price")], 16, 1248),
        chart("clusteredBarChart", (16, 176, 416, 256), "Validation RMSLE by model (lower is better)", "model_scores.model", "model_scores.Model RMSLE", sort="model_scores.Model RMSLE", label_names={"model_scores.Model RMSLE": "RMSLE"}),
        chart("clusteredBarChart", (444, 176, 400, 256), "What drives LightGBM predictions (SHAP)", "feature_importance.feature", "feature_importance.SHAP Importance Top 7", sort="feature_importance.SHAP Importance Top 7", desc=True, color=SLATE, label_names={"feature_importance.SHAP Importance Top 7": "SHAP importance"}),
        chart("clusteredColumnChart", (856, 176, 408, 256), "LightGBM RMSLE by validation year", "time_validation.validation_year", "time_validation.Yearly RMSLE", label_names={"time_validation.Yearly RMSLE": "RMSLE"}),
        chart("lineChart", (16, 444, 416, 260), "LightGBM learning curve (most recent rows)", "learning_curve.rows_label", ["learning_curve.Train RMSLE", "learning_curve.Validation RMSLE"], labels=False, legend=True),
        chart("clusteredColumnChart", (444, 444, 400, 260), "CatBoost pricing bias by actual price band", "error_by_price_band.price_band", "error_by_price_band.Price Bias", color=SLATE),
        table((856, 444, 408, 196), "Model scores", [("model_scores.model", "Model"), ("model_scores.Model RMSLE", "RMSLE"), ("model_scores.Model MAE", "MAE"), ("model_scores.R Squared", "R²")]),
        textbox((856, 650, 408, 54), [[("KEY INSIGHT  ", {"fontSize": "10pt", "color": "#8A5F00", "fontWeight": "bold"}), ("The blend cuts RMSLE by 7%, but sales of $80k or more are under-priced by about 18%.", {"fontSize": "10pt", "color": DARK})]], SOFT),
    ]),
    ("predict0004", "Predictions and Data Quality", lambda: [
        header("Test predictions and data quality"),
        *cards_row([("test_predictions.Test Sales", "Test sales priced"), ("test_predictions.Median Predicted Price", "Median predicted price"), ("test_predictions.Lowest Predicted Price", "Lowest predicted price"),
                    ("test_predictions.Highest Predicted Price", "Highest predicted price"), ("data_quality.Columns Over Half Empty", "Columns over half empty"), ("sales.Unknown Build Year Share", "Unknown build year")], 16, 1248),
        chart("clusteredBarChart", (16, 176, 416, 256), "Median predicted price by machine type", "test_predictions.product_group", "test_predictions.Median Predicted Price", sort="test_predictions.Median Predicted Price", desc=True, label_names={"test_predictions.Median Predicted Price": "Median predicted price"}),
        chart("clusteredColumnChart", (444, 176, 400, 256), "Median predicted price by sale month (2012)", "test_predictions.month_name", "test_predictions.Median Predicted Price", color=SLATE, label_names={"test_predictions.Median Predicted Price": "Median predicted price"}),
        chart("clusteredBarChart", (856, 176, 408, 528), "Ten emptiest columns in the raw data", "data_quality.column_name", "data_quality.Missing Share Top 10", sort="data_quality.Missing Share Top 10", desc=True, color=SLATE, label_names={"data_quality.Missing Share Top 10": "Missing"}),
        chart("clusteredColumnChart", (16, 444, 416, 260), "Median predicted price by machine age (years)", "test_predictions.age_band", "test_predictions.Median Predicted Known Age", label_names={"test_predictions.Median Predicted Known Age": "Median predicted price"}),
        insight((444, 444, 400, 260), "CatBoost prices 12,457 sales from May to November 2012 at a median of $23,628. These sales have no actual prices, so these predictions cannot be scored here. In the raw data, 35 of 53 columns are more than half empty and 9.5% of machines have a placeholder build year."),
    ]),
]

# ------------------------------------------------------------------ write the project
sm, rp = HERE / f"{NAME}.SemanticModel", HERE / f"{NAME}.Report"
for folder in (sm / "definition", rp / "definition"):
    shutil.rmtree(folder, ignore_errors=True)

write(HERE / f"{NAME}.pbip", {"$schema": f"{S}/pbip/pbipProperties/1.0.0/schema.json", "version": "1.0", "artifacts": [{"report": {"path": f"{NAME}.Report"}}], "settings": {"enableAutoRecovery": True}})
for folder, kind in ((sm, "SemanticModel"), (rp, "Report")):
    write(folder / ".platform", {"$schema": f"{S}/gitIntegration/platformProperties/2.0.0/schema.json", "metadata": {"type": kind, "displayName": NAME},
                                 "config": {"version": "2.0", "logicalId": str(uuid.uuid5(uuid.NAMESPACE_DNS, NAME + kind))}})
write(sm / "definition.pbism", {"$schema": f"{S}/item/semanticModel/definitionProperties/1.0.0/schema.json", "version": "4.2", "settings": {}})
write(sm / "definition/database.tmdl", "database\n\tcompatibilityLevel: 1600\n")
order = json.dumps(["DataFolder", *TABLES])
write(sm / "definition/model.tmdl", "model Model\n\tculture: en-US\n\tdefaultPowerBIDataSourceVersion: powerBI_V3\n\tsourceQueryCulture: en-US\n\tdataAccessOptions\n\t\tlegacyRedirects\n\t\treturnErrorValuesAsNull\n\n"
      f"annotation PBI_QueryOrder = {order}\n\nannotation __PBI_TimeIntelligenceEnabled = 0\n\n" + "".join(f"ref table {t}\n" for t in TABLES))
write(sm / "definition/expressions.tmdl", f'expression DataFolder = "{DATA_FOLDER}" meta [IsParameterQuery = true, Type = "Text", IsParameterQueryRequired = true]\n\n\tannotation PBI_ResultType = Text\n')
for name, cols in TABLES.items():
    write(sm / f"definition/tables/{name}.tmdl", table_tmdl(name, cols))

write(rp / "definition.pbir", {"$schema": f"{S}/item/report/definitionProperties/2.0.0/schema.json", "version": "4.0", "datasetReference": {"byPath": {"path": f"../{NAME}.SemanticModel"}}})
d = rp / "definition"
write(d / "version.json", {"$schema": f"{S}/item/report/definition/versionMetadata/1.0.0/schema.json", "version": "2.0.0"})
write(d / "report.json", {"$schema": f"{S}/item/report/definition/report/3.3.0/schema.json", "themeCollection": {}, "objects": {"section": [{"properties": {"verticalAlignment": txt("Top")}}]}, "settings": {"useEnhancedTooltips": False}})
write(d / "pages/pages.json", {"$schema": f"{S}/item/report/definition/pagesMetadata/1.1.0/schema.json", "pageOrder": [p[0] for p in PAGES], "activePageName": PAGES[0][0]})
for pid, title, build in PAGES:
    write(d / f"pages/{pid}/page.json", {"$schema": f"{S}/item/report/definition/page/2.1.0/schema.json", "name": pid, "displayName": title, "displayOption": "FitToPage", "height": 720, "width": 1280,
                                         "objects": {"background": [{"properties": {"color": col(PAGE_BG), "transparency": lit("0D")}}], "outspace": [{"properties": {"color": col(PAGE_BG)}}]}})
    for v in build():
        write(d / f"pages/{pid}/visuals/{v['name']}/visual.json", v)
print("built", NAME, "with", counter, "visuals on", len(PAGES), "pages")
