#!/usr/bin/env python3
"""Build CM Best Match demo workbook (xlsx) matching src/lib/cm-calculator.js."""

from __future__ import annotations

import json
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, NamedStyle, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = Path(__file__).resolve().parents[1]
OUT_XLSX = ROOT / "documents" / "CM_Best_Match_Calculator.xlsx"
OUT_BAS = ROOT / "documents" / "CM_Best_Match_Calculator.bas"

# From src/lib/platform-cir-mills.js DEFAULT_CIR_MILLS_ROWS
DEFAULT_CIR_MILLS_ROWS = [
    ("0.5", 94000), ("1", 83690), ("1.5", 74530), ("2", 66360), ("2.5", 59100),
    ("3", 52620), ("3.5", 46870), ("4", 41740), ("4.5", 37170), ("5", 33090),
    ("5.5", 29480), ("6", 26240), ("6.5", 23380), ("7", 20820), ("7.5", 18550),
    ("8", 16510), ("8.5", 14710), ("9", 13090), ("9.5", 11660), ("10", 10380),
    ("10.5", 9250), ("11", 8230), ("11.5", 7330), ("12", 6530), ("12.5", 5820),
    ("13", 5180), ("13.5", 4610), ("14", 4110), ("14.5", 3660), ("15", 3260),
    ("15.5", 2910), ("16", 2580), ("16.5", 2300), ("17", 2050), ("17.5", 1820),
    ("18", 1620), ("18.5", 1440), ("19", 1290), ("19.5", 1150), ("20", 1020),
    ("20.5", 912), ("21", 812), ("21.5", 724), ("22", 640), ("22.5", 571),
    ("23", 511), ("23.5", 454), ("24", 404), ("24.5", 361), ("25", 320),
    ("25.5", 286), ("26", 253), ("26.5", 225), ("27", 202), ("27.5", 180),
    ("28", 159), ("28.5", 142), ("29", 128), ("29.5", 112), ("30", 100),
    ("30.5", 90.3), ("31", 79.2), ("32", 64), ("33", 50.4), ("34", 39.7),
    ("35", 31.4), ("36", 25),
]

DEMO_SELECTED = {"14", "16", "18", "19", "20"}
DEMO_TARGET = 12330.0  # 3 x AWG 14
DEMO_MIN = 1
DEMO_MAX = 6
MAX_SELECT = 10

ARIA = Font(name="Arial", size=11)
ARIA_BOLD = Font(name="Arial", size=11, bold=True)
ARIA_TITLE = Font(name="Arial", size=16, bold=True)
ARIA_HDR = Font(name="Arial", size=11, bold=True, color="FFFFFF")
FILL_HDR = PatternFill("solid", fgColor="1F4E79")
FILL_INPUT = PatternFill("solid", fgColor="FFF2CC")
FILL_GOOD = PatternFill("solid", fgColor="C6EFCE")
FILL_MID = PatternFill("solid", fgColor="FFEB9C")
FILL_SUMMARY = PatternFill("solid", fgColor="DDEBF7")
FILL_SELECT = PatternFill("solid", fgColor="E2EFDA")
THIN = Border(
    left=Side(style="thin", color="B0B0B0"),
    right=Side(style="thin", color="B0B0B0"),
    top=Side(style="thin", color="B0B0B0"),
    bottom=Side(style="thin", color="B0B0B0"),
)


def calculate_cm_best_match(wires, targeted_cm, min_wires, max_wires):
    """Port of src/lib/cm-calculator.js calculateCMBestMatch."""
    results = []
    seen = set()

    if not wires:
        return results
    if not (isinstance(targeted_cm, (int, float)) and targeted_cm > 0):
        return results
    if min_wires < 1 or max_wires < min_wires:
        return results

    low = targeted_cm * 0.95
    high = targeted_cm * 1.05

    def push(d):
        parts = []
        if d["i"] > 0:
            parts.append({"size": d["w1"]["size"], "qty": d["i"]})
        if d["j"] > 0 and d.get("w2"):
            parts.append({"size": d["w2"]["size"], "qty": d["j"]})
        if d["k"] > 0 and d.get("w3"):
            parts.append({"size": d["w3"]["size"], "qty": d["k"]})
        if not parts:
            return
        key = "|".join(sorted(f"{w['size']}-{w['qty']}" for w in parts))
        if key in seen:
            return
        seen.add(key)
        wires_in_hand = sum(w["qty"] for w in parts)
        percent = ((d["total"] - targeted_cm) / targeted_cm) * 100
        no_of_wires = 1
        for _ in parts:
            no_of_wires += 2
        row = {
            "totalCM": d["total"],
            "targetedCM": targeted_cm,
            "wiresInHand": wires_in_hand,
            "percentDifference": round(percent, 2),
            "cmDifference": round(abs(d["total"] - targeted_cm), 3),
            "noOfWires": no_of_wires,
        }
        for idx, w in enumerate(parts, start=1):
            row[f"wireSize{idx}"] = w["size"]
            row[f"wires{idx}"] = w["qty"]
        results.append(row)

    for a, w1 in enumerate(wires):
        if not w1.get("cm") or w1["cm"] <= 0:
            continue
        for i in range(0, max_wires + 1):
            t1 = i * w1["cm"]
            if t1 > high:
                break
            if i >= min_wires and low <= t1 <= high:
                push({"w1": w1, "i": i, "j": 0, "k": 0, "total": t1})

    for a, w1 in enumerate(wires):
        for b, w2 in enumerate(wires):
            if b == a:
                continue
            if not w1.get("cm") or not w2.get("cm") or w1["cm"] <= 0 or w2["cm"] <= 0:
                continue
            for i in range(0, max_wires + 1):
                t1 = i * w1["cm"]
                if t1 > high:
                    break
                for j in range(0, max_wires - i + 1):
                    t2 = t1 + j * w2["cm"]
                    if t2 > high:
                        break
                    if i + j >= min_wires and low <= t2 <= high:
                        push({"w1": w1, "w2": w2, "i": i, "j": j, "k": 0, "total": t2})

    if len(wires) >= 3:
        for a, w1 in enumerate(wires):
            for b, w2 in enumerate(wires):
                if b == a:
                    continue
                for c, w3 in enumerate(wires):
                    if c == a or c == b:
                        continue
                    if (
                        not w1.get("cm")
                        or not w2.get("cm")
                        or not w3.get("cm")
                        or w1["cm"] <= 0
                        or w2["cm"] <= 0
                        or w3["cm"] <= 0
                    ):
                        continue
                    for i in range(0, max_wires + 1):
                        t1 = i * w1["cm"]
                        if t1 > high:
                            break
                        if i >= min_wires and low <= t1 <= high:
                            push({"w1": w1, "w2": None, "w3": None, "i": i, "j": 0, "k": 0, "total": t1})
                        for j in range(0, max_wires - i + 1):
                            t2 = i * w1["cm"] + j * w2["cm"]
                            if t2 > high:
                                break
                            if i + j >= min_wires and low <= t2 <= high:
                                push({"w1": w1, "w2": w2, "w3": None, "i": i, "j": j, "k": 0, "total": t2})
                            k_start = max(0, min_wires - i - j)
                            for k in range(k_start, max_wires - i - j + 1):
                                t3 = i * w1["cm"] + j * w2["cm"] + k * w3["cm"]
                                if low <= t3 <= high:
                                    push(
                                        {
                                            "w1": w1,
                                            "w2": w2,
                                            "w3": w3,
                                            "i": i,
                                            "j": j,
                                            "k": k,
                                            "total": t3,
                                        }
                                    )

    results.sort(key=lambda r: r["cmDifference"])
    return results


def style_header_row(ws, row, start_col, end_col):
    for col in range(start_col, end_col + 1):
        cell = ws.cell(row=row, column=col)
        cell.font = ARIA_HDR
        cell.fill = FILL_HDR
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = THIN


def set_col_widths(ws, widths):
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w


def write_howto(ws):
    ws["A1"] = "CM Best Match Calculator (Excel demo)"
    ws["A1"].font = ARIA_TITLE
    lines = [
        "",
        "Purpose",
        "Demonstrate the same CM Best Match math as 3PhaseFlow / 3PhaseWire (src/lib/cm-calculator.js).",
        "Match band is ±5% of Target CM. Up to 3 distinct wire sizes per combination. Max 10 sizes selected.",
        "",
        "Sheets",
        "1) Inputs — Target CM, Min wires, Max wires (yellow cells are editable).",
        "2) WireCatalog — default AWG circular-mils table (same seed as platform).",
        "3) Selection — put Y in Selected for sizes to include (demo pre-selects 14,16,18,19,20).",
        "4) Results — all matching combinations sorted by absolute CM difference (best first).",
        "5) Summary — calculation summary, selection export, and best-match highlight.",
        "6) VBA_Code — full macro text (also saved as CM_Best_Match_Calculator.bas).",
        "",
        "How to enable VBA recalculation",
        "1. Open this workbook in Microsoft Excel.",
        "2. File → Save As → Excel Macro-Enabled Workbook (*.xlsm).",
        "3. Developer → Visual Basic → File → Import File → choose CM_Best_Match_Calculator.bas",
        "   (same folder as this workbook under documents/).",
        "4. Close VBA editor. Developer → Insert → Button (Form Control), assign macro RunCMBestMatch.",
        "5. Edit Inputs / Selection, click the button. Results and Summary refresh.",
        "",
        "Source of truth for algorithm: motors/src/lib/cm-calculator.js",
        "Catalog seed: motors/src/lib/platform-cir-mills.js DEFAULT_CIR_MILLS_ROWS",
        "",
        "Assumption note: Demo Target CM = 12330 (3 × AWG 14 @ 4110 CM). Change Inputs!B2 to try other targets.",
    ]
    for i, line in enumerate(lines, start=2):
        ws[f"A{i}"] = line
        ws[f"A{i}"].font = ARIA_BOLD if line in {
            "Purpose", "Sheets", "How to enable VBA recalculation",
        } or line.startswith("Assumption") else ARIA
    set_col_widths(ws, [110])


def write_inputs(ws):
    ws["A1"] = "Inputs (edit yellow cells)"
    ws["A1"].font = ARIA_TITLE
    labels = [
        (2, "Target CM", DEMO_TARGET, "Circular mils to match (±5% band)."),
        (3, "Min wires in hand", DEMO_MIN, "Minimum total conductor count."),
        (4, "Max wires in hand", DEMO_MAX, "Maximum total conductor count (cap 200 in app)."),
        (5, "Match band low %", 0.95, "Fixed in app: 95% of target (do not change for parity)."),
        (6, "Match band high %", 1.05, "Fixed in app: 105% of target (do not change for parity)."),
        (7, "Max distinct sizes", 3, "App allows at most 3 wire sizes per mix."),
        (8, "Max selected catalog sizes", MAX_SELECT, "App selection limit."),
    ]
    ws["A10"] = "Named ranges used by VBA: TargetCM, MinWires, MaxWires"
    ws["A10"].font = ARIA
    for row, label, value, note in labels:
        ws.cell(row=row, column=1, value=label).font = ARIA_BOLD
        cell = ws.cell(row=row, column=2, value=value)
        cell.font = ARIA
        cell.fill = FILL_INPUT
        cell.border = THIN
        ws.cell(row=row, column=3, value=note).font = ARIA
    ws["A12"] = "After editing, run macro RunCMBestMatch (see HowTo)."
    ws["A12"].font = ARIA_BOLD
    set_col_widths(ws, [28, 14, 70])


def write_catalog(ws):
    ws["A1"] = "Wire catalog (AWG default)"
    ws["A1"].font = ARIA_TITLE
    ws["A2"] = "Source: platform DEFAULT_CIR_MILLS_ROWS. VBA reads Size + CirMills where Selection=Y."
    ws["A2"].font = ARIA
    headers = ["Size", "CirMills", "Selected"]
    for col, h in enumerate(headers, start=1):
        ws.cell(row=4, column=col, value=h)
    style_header_row(ws, 4, 1, 3)
    dv = DataValidation(type="list", formula1='"Y,N"', allow_blank=True)
    ws.add_data_validation(dv)
    for i, (size, cm) in enumerate(DEFAULT_CIR_MILLS_ROWS):
        r = 5 + i
        ws.cell(row=r, column=1, value=size).font = ARIA
        ws.cell(row=r, column=2, value=cm).font = ARIA
        sel = "Y" if size in DEMO_SELECTED else "N"
        cell = ws.cell(row=r, column=3, value=sel)
        cell.font = ARIA
        cell.fill = FILL_SELECT if sel == "Y" else PatternFill()
        cell.border = THIN
        cell.alignment = Alignment(horizontal="center")
        dv.add(cell)
        for c in range(1, 3):
            ws.cell(row=r, column=c).border = THIN
    last = 4 + len(DEFAULT_CIR_MILLS_ROWS)
    ws["E4"] = "Selected count"
    ws["E4"].font = ARIA_BOLD
    ws["F4"] = f'=COUNTIF(C5:C{last},"Y")'
    ws["F4"].font = ARIA
    ws["E5"] = "Must be 1–10 for a valid run"
    ws["E5"].font = ARIA
    set_col_widths(ws, [12, 12, 12, 3, 22, 12])


def write_selection_export(ws, selected_wires):
    ws["A1"] = "Selection export (filled by builder / VBA)"
    ws["A1"].font = ARIA_TITLE
    ws["A2"] = "This sheet lists only Selected=Y rows from WireCatalog (max 10)."
    ws["A2"].font = ARIA
    headers = ["#", "Size", "CirMills"]
    for col, h in enumerate(headers, start=1):
        ws.cell(row=4, column=col, value=h)
    style_header_row(ws, 4, 1, 3)
    for i, w in enumerate(selected_wires, start=1):
        r = 4 + i
        ws.cell(row=r, column=1, value=i).font = ARIA
        ws.cell(row=r, column=2, value=w["size"]).font = ARIA
        ws.cell(row=r, column=3, value=w["cm"]).font = ARIA
        for c in range(1, 4):
            ws.cell(row=r, column=c).border = THIN
            ws.cell(row=r, column=c).fill = FILL_SELECT
    set_col_widths(ws, [6, 12, 12])


def write_results(ws, results):
    ws["A1"] = "Results (sorted by CM difference ascending)"
    ws["A1"].font = ARIA_TITLE
    ws["A2"] = "Green: |% diff| ≤ 2. Yellow: |% diff| ≤ 5. Cleared and rewritten by VBA RunCMBestMatch."
    ws["A2"].font = ARIA
    headers = [
        "Rank",
        "TotalCM",
        "TargetCM",
        "CM Diff",
        "% Diff",
        "WiresInHand",
        "Size1",
        "Qty1",
        "Size2",
        "Qty2",
        "Size3",
        "Qty3",
        "NoOfWiresScore",
    ]
    for col, h in enumerate(headers, start=1):
        ws.cell(row=4, column=col, value=h)
    style_header_row(ws, 4, 1, len(headers))
    for i, row in enumerate(results, start=1):
        r = 4 + i
        vals = [
            i,
            row["totalCM"],
            row["targetedCM"],
            row["cmDifference"],
            row["percentDifference"],
            row["wiresInHand"],
            row.get("wireSize1", 0) or 0,
            row.get("wires1", 0) or 0,
            row.get("wireSize2", 0) or 0,
            row.get("wires2", 0) or 0,
            row.get("wireSize3", 0) or 0,
            row.get("wires3", 0) or 0,
            row["noOfWires"],
        ]
        pct = abs(row["percentDifference"])
        fill = FILL_GOOD if pct <= 2 else FILL_MID if pct <= 5 else None
        for col, v in enumerate(vals, start=1):
            cell = ws.cell(row=r, column=col, value=v)
            cell.font = ARIA
            cell.border = THIN
            if fill:
                cell.fill = fill
            if col in (2, 3, 4, 5):
                cell.number_format = "0.###" if col != 5 else "0.00"
    set_col_widths(ws, [8, 12, 12, 10, 10, 12, 10, 8, 10, 8, 10, 8, 14])
    ws["A3"] = len(results)
    ws["B3"] = "match count (also Summary!B8)"
    ws["A3"].font = ARIA_BOLD


def write_summary(ws, results, selected_wires):
    ws["A1"] = "Calculation summary"
    ws["A1"].font = ARIA_TITLE
    ws["A2"] = "Exports inputs, selection, and best-match outcome. Yellow = inputs mirror; blue = summary."
    ws["A2"].font = ARIA

    best = results[0] if results else None

    rows = [
        (4, "INPUTS", None, True),
        (5, "Target CM", DEMO_TARGET, False),
        (6, "Min wires", DEMO_MIN, False),
        (7, "Max wires", DEMO_MAX, False),
        (8, "Match band", "Target × 0.95 to Target × 1.05 (±5%)", False),
        (9, "Low CM", DEMO_TARGET * 0.95, False),
        (10, "High CM", DEMO_TARGET * 1.05, False),
        (12, "SELECTION", None, True),
        (13, "Selected sizes", ", ".join(w["size"] for w in selected_wires), False),
        (14, "Selected count", len(selected_wires), False),
        (15, "Selected CM values", ", ".join(str(w["cm"]) for w in selected_wires), False),
        (17, "RESULTS SUMMARY", None, True),
        (18, "Match count", len(results), False),
        (19, "Best Total CM", best["totalCM"] if best else "", False),
        (20, "Best CM difference", best["cmDifference"] if best else "", False),
        (21, "Best % difference", best["percentDifference"] if best else "", False),
        (22, "Best wires in hand", best["wiresInHand"] if best else "", False),
        (23, "Best mix Size1 / Qty1", f"{best.get('wireSize1', '')} / {best.get('wires1', '')}" if best else "", False),
        (24, "Best mix Size2 / Qty2", f"{best.get('wireSize2', '')} / {best.get('wires2', '')}" if best else "", False),
        (25, "Best mix Size3 / Qty3", f"{best.get('wireSize3', '')} / {best.get('wires3', '')}" if best else "", False),
        (27, "VERIFICATION", None, True),
        (28, "Algorithm", "Identical to src/lib/cm-calculator.js (one/two/three size nested search, dedupe, sort by cmDifference)", False),
        (29, "Demo scenario", "Target 12330 CM = 3 × AWG 14 (4110). Expect perfect match Rank 1: 3 × 14.", False),
        (30, "Perfect matches (|%|=0)", sum(1 for r in results if r["percentDifference"] == 0), False),
        (31, "Within |%| ≤ 2", sum(1 for r in results if abs(r["percentDifference"]) <= 2), False),
        (32, "Within |%| ≤ 5 (all rows)", len(results), False),
    ]

    for row, label, value, is_section in rows:
        a = ws.cell(row=row, column=1, value=label)
        a.font = ARIA_BOLD
        if is_section:
            a.fill = FILL_HDR
            a.font = ARIA_HDR
            ws.cell(row=row, column=2).fill = FILL_HDR
            continue
        b = ws.cell(row=row, column=2, value=value)
        b.font = ARIA
        b.fill = FILL_SUMMARY
        b.border = THIN
        a.border = THIN
        if row in (5, 6, 7):
            b.fill = FILL_INPUT

    # Live formulas mirroring Inputs / Results for after-VBA runs
    ws["D4"] = "Live links (update after VBA)"
    ws["D4"].font = ARIA_BOLD
    live = [
        (5, "Target CM", "=Inputs!B2"),
        (6, "Min wires", "=Inputs!B3"),
        (7, "Max wires", "=Inputs!B4"),
        (8, "Match count", "=Results!A3"),
        (9, "Best Total CM", "=IF(Results!A3=0,\"\",Results!B5)"),
        (10, "Best CM Diff", "=IF(Results!A3=0,\"\",Results!D5)"),
        (11, "Best % Diff", "=IF(Results!A3=0,\"\",Results!E5)"),
        (12, "Best Size1", "=IF(Results!A3=0,\"\",Results!G5)"),
        (13, "Best Qty1", "=IF(Results!A3=0,\"\",Results!H5)"),
        (14, "Best Size2", "=IF(Results!A3=0,\"\",Results!I5)"),
        (15, "Best Qty2", "=IF(Results!A3=0,\"\",Results!J5)"),
        (16, "Best Size3", "=IF(Results!A3=0,\"\",Results!K5)"),
        (17, "Best Qty3", "=IF(Results!A3=0,\"\",Results!L5)"),
        (18, "Catalog selected count", "=WireCatalog!F4"),
    ]
    for row, label, formula in live:
        ws.cell(row=row, column=4, value=label).font = ARIA_BOLD
        cell = ws.cell(row=row, column=5, value=formula)
        cell.font = ARIA
        cell.fill = FILL_SUMMARY
        cell.border = THIN

    ws["A34"] = "Top 5 matches (snapshot from last calculation)"
    ws["A34"].font = ARIA_BOLD
    headers = ["Rank", "TotalCM", "CM Diff", "% Diff", "Mix"]
    for col, h in enumerate(headers, start=1):
        ws.cell(row=35, column=col, value=h)
    style_header_row(ws, 35, 1, 5)
    for i, row in enumerate(results[:5], start=1):
        r = 35 + i
        mix_parts = []
        for n in (1, 2, 3):
            sz = row.get(f"wireSize{n}")
            qty = row.get(f"wires{n}")
            if sz and qty:
                mix_parts.append(f"{qty}×{sz}")
        vals = [i, row["totalCM"], row["cmDifference"], row["percentDifference"], " + ".join(mix_parts)]
        for col, v in enumerate(vals, start=1):
            cell = ws.cell(row=r, column=col, value=v)
            cell.font = ARIA
            cell.border = THIN
            if abs(row["percentDifference"]) <= 2:
                cell.fill = FILL_GOOD
            elif abs(row["percentDifference"]) <= 5:
                cell.fill = FILL_MID

    set_col_widths(ws, [28, 55, 3, 24, 16])


VBA_CODE = r'''Attribute VB_Name = "CMBestMatch"
' CM Best Match — port of motors/src/lib/cm-calculator.js
' Sheets: Inputs, WireCatalog, Selection, Results, Summary
' Run: RunCMBestMatch

Option Explicit

Private Type WireRec
    Size As String
    CM As Double
End Type

Private Type ResultRec
    TotalCM As Double
    TargetedCM As Double
    WiresInHand As Long
    PercentDifference As Double
    CMDifference As Double
    NoOfWires As Long
    WireSize1 As String
    Wires1 As Long
    WireSize2 As String
    Wires2 As Long
    WireSize3 As String
    Wires3 As Long
End Type

Public Sub RunCMBestMatch()
    Dim wires() As WireRec
    Dim nWires As Long
    Dim targetedCM As Double
    Dim minWires As Long
    Dim maxWires As Long
    Dim results() As ResultRec
    Dim nResults As Long
    Dim i As Long

    targetedCM = CDbl(Worksheets("Inputs").Range("B2").Value)
    minWires = CLng(Worksheets("Inputs").Range("B3").Value)
    maxWires = CLng(Worksheets("Inputs").Range("B4").Value)

    If targetedCM <= 0 Then
        MsgBox "Target CM must be > 0", vbExclamation
        Exit Sub
    End If
    If minWires < 1 Or maxWires < minWires Then
        MsgBox "Check Min/Max wires", vbExclamation
        Exit Sub
    End If
    If maxWires > 200 Then maxWires = 200

    nWires = LoadSelectedWires(wires)
    If nWires < 1 Then
        MsgBox "Select at least one wire size (Y) on WireCatalog", vbExclamation
        Exit Sub
    End If
    If nWires > 10 Then
        MsgBox "Select at most 10 wire sizes (app limit)", vbExclamation
        Exit Sub
    End If

    WriteSelectionSheet wires, nWires

    CalculateCMBestMatch wires, nWires, targetedCM, minWires, maxWires, results, nResults
    WriteResultsSheet results, nResults, targetedCM
    WriteSummarySheet wires, nWires, targetedCM, minWires, maxWires, results, nResults

    MsgBox "CM Best Match complete: " & nResults & " match(es).", vbInformation
End Sub

Private Function LoadSelectedWires(ByRef wires() As WireRec) As Long
    Dim ws As Worksheet
    Dim r As Long
    Dim last As Long
    Dim count As Long
    Set ws = Worksheets("WireCatalog")
    last = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
    count = 0
    For r = 5 To last
        If UCase$(Trim$(CStr(ws.Cells(r, 3).Value))) = "Y" Then
            count = count + 1
            ReDim Preserve wires(1 To count)
            wires(count).Size = CStr(ws.Cells(r, 1).Value)
            wires(count).CM = CDbl(ws.Cells(r, 2).Value)
        End If
    Next r
    LoadSelectedWires = count
End Function

Private Sub WriteSelectionSheet(ByRef wires() As WireRec, ByVal nWires As Long)
    Dim ws As Worksheet
    Dim i As Long
    Set ws = Worksheets("Selection")
    ws.Range("A5:C100").ClearContents
    For i = 1 To nWires
        ws.Cells(4 + i, 1).Value = i
        ws.Cells(4 + i, 2).Value = wires(i).Size
        ws.Cells(4 + i, 3).Value = wires(i).CM
    Next i
End Sub

Private Sub CalculateCMBestMatch( _
    ByRef wires() As WireRec, ByVal nWires As Long, _
    ByVal targetedCM As Double, ByVal minWires As Long, ByVal maxWires As Long, _
    ByRef results() As ResultRec, ByRef nResults As Long)

    Dim low As Double, high As Double
    Dim a As Long, b As Long, c As Long
    Dim i As Long, j As Long, k As Long
    Dim t1 As Double, t2 As Double, t3 As Double
    Dim seen As Object
    Set seen = CreateObject("Scripting.Dictionary")
    nResults = 0
    low = targetedCM * 0.95
    high = targetedCM * 1.05

    ' One wire type
    For a = 1 To nWires
        If wires(a).CM > 0 Then
            For i = 0 To maxWires
                t1 = i * wires(a).CM
                If t1 > high Then Exit For
                If i >= minWires And t1 >= low And t1 <= high Then
                    Call PushResult(results, nResults, seen, wires(a).Size, wires(a).CM, i, "", 0, 0, "", 0, 0, t1, targetedCM)
                End If
            Next i
        End If
    Next a

    ' Two distinct wire types
    For a = 1 To nWires
        For b = 1 To nWires
            If b <> a And wires(a).CM > 0 And wires(b).CM > 0 Then
                For i = 0 To maxWires
                    t1 = i * wires(a).CM
                    If t1 > high Then Exit For
                    For j = 0 To maxWires - i
                        t2 = t1 + j * wires(b).CM
                        If t2 > high Then Exit For
                        If i + j >= minWires And t2 >= low And t2 <= high Then
                            Call PushResult(results, nResults, seen, wires(a).Size, wires(a).CM, i, wires(b).Size, wires(b).CM, j, "", 0, 0, t2, targetedCM)
                        End If
                    Next j
                Next i
            End If
        Next b
    Next a

    ' Three distinct wire types
    If nWires >= 3 Then
        For a = 1 To nWires
            For b = 1 To nWires
                If b <> a Then
                    For c = 1 To nWires
                        If c <> a And c <> b Then
                            If wires(a).CM > 0 And wires(b).CM > 0 And wires(c).CM > 0 Then
                                For i = 0 To maxWires
                                    t1 = i * wires(a).CM
                                    If t1 > high Then Exit For
                                    If i >= minWires And t1 >= low And t1 <= high Then
                                        Call PushResult(results, nResults, seen, wires(a).Size, wires(a).CM, i, "", 0, 0, "", 0, 0, t1, targetedCM)
                                    End If
                                    For j = 0 To maxWires - i
                                        t2 = i * wires(a).CM + j * wires(b).CM
                                        If t2 > high Then Exit For
                                        If i + j >= minWires And t2 >= low And t2 <= high Then
                                            Call PushResult(results, nResults, seen, wires(a).Size, wires(a).CM, i, wires(b).Size, wires(b).CM, j, "", 0, 0, t2, targetedCM)
                                        End If
                                        For k = Application.WorksheetFunction.Max(0, minWires - i - j) To maxWires - i - j
                                            t3 = i * wires(a).CM + j * wires(b).CM + k * wires(c).CM
                                            If t3 >= low And t3 <= high Then
                                                Call PushResult(results, nResults, seen, wires(a).Size, wires(a).CM, i, wires(b).Size, wires(b).CM, j, wires(c).Size, wires(c).CM, k, t3, targetedCM)
                                            End If
                                        Next k
                                    Next j
                                Next i
                            End If
                        End If
                    Next c
                End If
            Next b
        Next a
    End If

    Call SortResultsByCMDiff(results, nResults)
End Sub

Private Sub PushResult( _
    ByRef results() As ResultRec, ByRef nResults As Long, ByVal seen As Object, _
    ByVal size1 As String, ByVal cm1 As Double, ByVal i As Long, _
    ByVal size2 As String, ByVal cm2 As Double, ByVal j As Long, _
    ByVal size3 As String, ByVal cm3 As Double, ByVal k As Long, _
    ByVal total As Double, ByVal targetedCM As Double)

    Dim partsSize(1 To 3) As String
    Dim partsQty(1 To 3) As Long
    Dim nParts As Long
    Dim key As String
    Dim p As Long
    Dim wiresInHand As Long
    Dim percentDifference As Double
    Dim noOfWires As Long
    Dim tmpS As String
    Dim tmpQ As Long
    Dim a As Long, b As Long

    nParts = 0
    If i > 0 Then
        nParts = nParts + 1
        partsSize(nParts) = size1
        partsQty(nParts) = i
    End If
    If j > 0 And Len(size2) > 0 Then
        nParts = nParts + 1
        partsSize(nParts) = size2
        partsQty(nParts) = j
    End If
    If k > 0 And Len(size3) > 0 Then
        nParts = nParts + 1
        partsSize(nParts) = size3
        partsQty(nParts) = k
    End If
    If nParts = 0 Then Exit Sub

    ' Sort copy for dedupe key (JS sorts size-qty strings)
    For a = 1 To nParts - 1
        For b = a + 1 To nParts
            If (partsSize(b) & "-" & CStr(partsQty(b))) < (partsSize(a) & "-" & CStr(partsQty(a))) Then
                tmpS = partsSize(a): partsSize(a) = partsSize(b): partsSize(b) = tmpS
                tmpQ = partsQty(a): partsQty(a) = partsQty(b): partsQty(b) = tmpQ
            End If
        Next b
    Next a

    key = ""
    For p = 1 To nParts
        If p > 1 Then key = key & "|"
        key = key & partsSize(p) & "-" & CStr(partsQty(p))
    Next p
    If seen.Exists(key) Then Exit Sub
    seen.Add key, True

    wiresInHand = 0
    If i > 0 Then wiresInHand = wiresInHand + i
    If j > 0 And Len(size2) > 0 Then wiresInHand = wiresInHand + j
    If k > 0 And Len(size3) > 0 Then wiresInHand = wiresInHand + k

    percentDifference = ((total - targetedCM) / targetedCM) * 100
    noOfWires = 1
    If i > 0 Then noOfWires = noOfWires + 2
    If j > 0 And Len(size2) > 0 Then noOfWires = noOfWires + 2
    If k > 0 And Len(size3) > 0 Then noOfWires = noOfWires + 2

    nResults = nResults + 1
    ReDim Preserve results(1 To nResults)
    With results(nResults)
        .TotalCM = total
        .TargetedCM = targetedCM
        .WiresInHand = wiresInHand
        .PercentDifference = Round(percentDifference, 2)
        .CMDifference = Round(Abs(total - targetedCM), 3)
        .NoOfWires = noOfWires
        .WireSize1 = "": .Wires1 = 0
        .WireSize2 = "": .Wires2 = 0
        .WireSize3 = "": .Wires3 = 0
    End With

    ' Display slots follow original i/j/k push order (same as JS)
    nParts = 0
    If i > 0 Then
        results(nResults).WireSize1 = size1
        results(nResults).Wires1 = i
        nParts = 1
    End If
    If j > 0 And Len(size2) > 0 Then
        If nParts = 0 Then
            results(nResults).WireSize1 = size2
            results(nResults).Wires1 = j
        Else
            results(nResults).WireSize2 = size2
            results(nResults).Wires2 = j
        End If
        nParts = nParts + 1
    End If
    If k > 0 And Len(size3) > 0 Then
        If nParts = 0 Then
            results(nResults).WireSize1 = size3
            results(nResults).Wires1 = k
        ElseIf nParts = 1 Then
            results(nResults).WireSize2 = size3
            results(nResults).Wires2 = k
        Else
            results(nResults).WireSize3 = size3
            results(nResults).Wires3 = k
        End If
    End If
End Sub

Private Sub SortResultsByCMDiff(ByRef results() As ResultRec, ByVal nResults As Long)
    Dim a As Long, b As Long
    Dim tmp As ResultRec
    For a = 1 To nResults - 1
        For b = a + 1 To nResults
            If results(b).CMDifference < results(a).CMDifference Then
                tmp = results(a)
                results(a) = results(b)
                results(b) = tmp
            End If
        Next b
    Next a
End Sub

Private Sub WriteResultsSheet(ByRef results() As ResultRec, ByVal nResults As Long, ByVal targetedCM As Double)
    Dim ws As Worksheet
    Dim i As Long
    Dim r As Long
    Dim pct As Double
    Set ws = Worksheets("Results")
    If ws.Cells(5, 1).Value <> "" Then
        ws.Range("A5:M" & ws.Cells(ws.Rows.Count, 1).End(xlUp).Row).ClearContents
        ws.Range("A5:M" & ws.Cells(ws.Rows.Count, 1).End(xlUp).Row).Interior.ColorIndex = xlNone
    End If
    ws.Range("A5:M1000").ClearContents
    ws.Range("A5:M1000").Interior.ColorIndex = xlNone

    ws.Range("A3").Value = nResults
    For i = 1 To nResults
        r = 4 + i
        ws.Cells(r, 1).Value = i
        ws.Cells(r, 2).Value = results(i).TotalCM
        ws.Cells(r, 3).Value = results(i).TargetedCM
        ws.Cells(r, 4).Value = results(i).CMDifference
        ws.Cells(r, 5).Value = results(i).PercentDifference
        ws.Cells(r, 6).Value = results(i).WiresInHand
        ws.Cells(r, 7).Value = IIf(results(i).Wires1 > 0, results(i).WireSize1, 0)
        ws.Cells(r, 8).Value = results(i).Wires1
        ws.Cells(r, 9).Value = IIf(results(i).Wires2 > 0, results(i).WireSize2, 0)
        ws.Cells(r, 10).Value = results(i).Wires2
        ws.Cells(r, 11).Value = IIf(results(i).Wires3 > 0, results(i).WireSize3, 0)
        ws.Cells(r, 12).Value = results(i).Wires3
        ws.Cells(r, 13).Value = results(i).NoOfWires
        pct = Abs(results(i).PercentDifference)
        If pct <= 2 Then
            ws.Range(ws.Cells(r, 1), ws.Cells(r, 13)).Interior.Color = RGB(198, 239, 206)
        ElseIf pct <= 5 Then
            ws.Range(ws.Cells(r, 1), ws.Cells(r, 13)).Interior.Color = RGB(255, 235, 156)
        End If
    Next i
End Sub

Private Sub WriteSummarySheet( _
    ByRef wires() As WireRec, ByVal nWires As Long, _
    ByVal targetedCM As Double, ByVal minWires As Long, ByVal maxWires As Long, _
    ByRef results() As ResultRec, ByVal nResults As Long)

    Dim ws As Worksheet
    Dim i As Long
    Dim sizes As String
    Dim cms As String
    Dim perfect As Long, within2 As Long
    Dim best As ResultRec
    Dim mix As String

    Set ws = Worksheets("Summary")
    sizes = "": cms = ""
    For i = 1 To nWires
        If i > 1 Then sizes = sizes & ", ": cms = cms & ", "
        sizes = sizes & wires(i).Size
        cms = cms & CStr(wires(i).CM)
    Next i

    ws.Range("B5").Value = targetedCM
    ws.Range("B6").Value = minWires
    ws.Range("B7").Value = maxWires
    ws.Range("B9").Value = targetedCM * 0.95
    ws.Range("B10").Value = targetedCM * 1.05
    ws.Range("B13").Value = sizes
    ws.Range("B14").Value = nWires
    ws.Range("B15").Value = cms
    ws.Range("B18").Value = nResults

    If nResults >= 1 Then
        best = results(1)
        ws.Range("B19").Value = best.TotalCM
        ws.Range("B20").Value = best.CMDifference
        ws.Range("B21").Value = best.PercentDifference
        ws.Range("B22").Value = best.WiresInHand
        ws.Range("B23").Value = best.WireSize1 & " / " & best.Wires1
        ws.Range("B24").Value = IIf(best.Wires2 > 0, best.WireSize2 & " / " & best.Wires2, "")
        ws.Range("B25").Value = IIf(best.Wires3 > 0, best.WireSize3 & " / " & best.Wires3, "")
    Else
        ws.Range("B19:B25").ClearContents
    End If

    perfect = 0: within2 = 0
    For i = 1 To nResults
        If results(i).PercentDifference = 0 Then perfect = perfect + 1
        If Abs(results(i).PercentDifference) <= 2 Then within2 = within2 + 1
    Next i
    ws.Range("B30").Value = perfect
    ws.Range("B31").Value = within2
    ws.Range("B32").Value = nResults

    ws.Range("A36:E40").ClearContents
    For i = 1 To Application.Min(5, nResults)
        mix = ""
        If results(i).Wires1 > 0 Then mix = results(i).Wires1 & "x" & results(i).WireSize1
        If results(i).Wires2 > 0 Then mix = mix & " + " & results(i).Wires2 & "x" & results(i).WireSize2
        If results(i).Wires3 > 0 Then mix = mix & " + " & results(i).Wires3 & "x" & results(i).WireSize3
        ws.Cells(35 + i, 1).Value = i
        ws.Cells(35 + i, 2).Value = results(i).TotalCM
        ws.Cells(35 + i, 3).Value = results(i).CMDifference
        ws.Cells(35 + i, 4).Value = results(i).PercentDifference
        ws.Cells(35 + i, 5).Value = mix
    Next i
End Sub
'''


def write_vba_sheet(ws):
    ws["A1"] = "VBA module (import as CM_Best_Match_Calculator.bas)"
    ws["A1"].font = ARIA_TITLE
    ws["A2"] = "Copy from the .bas file in documents/ for reliable Attribute headers."
    ws["A2"].font = ARIA
    for i, line in enumerate(VBA_CODE.splitlines(), start=4):
        ws.cell(row=i, column=1, value=line).font = Font(name="Consolas", size=9)
    set_col_widths(ws, [140])


def main():
    selected_wires = [
        {"size": s, "cm": cm}
        for s, cm in DEFAULT_CIR_MILLS_ROWS
        if s in DEMO_SELECTED
    ]
    # Keep catalog order of selection for display
    selected_wires.sort(key=lambda w: float(w["size"]))
    results = calculate_cm_best_match(selected_wires, DEMO_TARGET, DEMO_MIN, DEMO_MAX)

    wb = Workbook()
    ws0 = wb.active
    ws0.title = "HowTo"
    write_howto(ws0)

    ws_in = wb.create_sheet("Inputs")
    write_inputs(ws_in)

    ws_cat = wb.create_sheet("WireCatalog")
    write_catalog(ws_cat)

    ws_sel = wb.create_sheet("Selection")
    write_selection_export(ws_sel, selected_wires)

    ws_res = wb.create_sheet("Results")
    write_results(ws_res, results)

    ws_sum = wb.create_sheet("Summary")
    write_summary(ws_sum, results, selected_wires)

    ws_vba = wb.create_sheet("VBA_Code")
    write_vba_sheet(ws_vba)

    OUT_XLSX.parent.mkdir(parents=True, exist_ok=True)
    wb.save(OUT_XLSX)
    OUT_BAS.write_text(VBA_CODE, encoding="utf-8")

    meta = {
        "xlsx": str(OUT_XLSX),
        "bas": str(OUT_BAS),
        "demo_target": DEMO_TARGET,
        "selected": [w["size"] for w in selected_wires],
        "match_count": len(results),
        "best": results[0] if results else None,
    }
    print(json.dumps(meta, indent=2))


if __name__ == "__main__":
    main()
