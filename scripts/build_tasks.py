#!/usr/bin/env python3
"""Build src/tasks.json (Micky task catalog with steps) from ref/MICKY - TASK NAME & DESCRIPTION.xlsx.

    python3 scripts/build_tasks.py            # writes src/tasks.json
    python3 scripts/build_tasks.py --check    # exits 1 when src/tasks.json is stale

Needs openpyxl (`pip install openpyxl`).

Source: sheet "Tiếng Anh". One row per step: A = step number 1..5, B = task (EN), C = description (EN),
D = task (VI), E = description (VI). D/E are GOOGLETRANSLATE formulas; the cached values are read.
A new task starts at every step 1. A repeated step number is an alternative of the previous step
(the shirt task has two step 5: zippered bag / plastic bag) and is merged into it.

The sheet has no task-level name or environment, so TASKS below gives them, in sheet order, and is
checked against the first step of every group. Codes M01..M43 follow the sheet order; steps are `M02-3`.
Codes only use QR alphanumeric characters so they fit the QR payload.
"""

from __future__ import annotations

import json
import re
import sys
import unicodedata
from pathlib import Path

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "ref" / "MICKY - TASK NAME & DESCRIPTION.xlsx"
SHEET = "Tiếng Anh"
OUT = ROOT / "src" / "tasks.json"

CODE_PREFIX = "M"
TASK_CODE = re.compile(rf"^{CODE_PREFIX}[0-9]{{2}}$")
STEPS_PER_TASK = 5
ALT_SEPARATOR = " / "

# Order of the sections in the picker. Environment of each task taken from the "Môi trường" column
# of the sheet "Bản sao của 1. PLAN" in the same file.
SECTIONS = [
    {"id": "other", "name": "Không có mã phù hợp"},
    {"id": "home", "name": "Nhà"},
    {"id": "industrial", "name": "Industrial"},
]

# Fallback when none of the catalog tasks fits what is being recorded; first in the list, no steps.
OTHER_TASK = {
    "code": "OTHER", "name": "Khác - không có mã việc phù hợp", "section": "other",
    "sources": [], "variantOf": None, "steps": [],
}

# (first step EN as in the sheet, task name VI, section), in sheet order. Index + 1 = code number.
TASKS = [
    ("Smooth Towels Flat", "Khăn - gấp, cuộn và buộc đai", "home"),
    ("Spread a Shirt", "Áo sơ mi - lăn bụi, cài cúc, gấp và đóng túi", "home"),
    ("Fold Letters to Fit Envelopes", "Phong bì - gấp thư, cho vào và buộc dây", "home"),
    ("Open and shape paper bag", "Túi giấy - lót giấy và xếp sản phẩm", "home"),
    ("Remove a Pillowcase", "Vỏ gối - tháo, gấp và lồng gối", "home"),
    ("Spread a Garment Flat", "Áo - gấp theo cữ và xếp chồng", "home"),
    ("Transfer flour into a sieve", "Bột mì - rây và chia hộp", "home"),
    ("Separate and Arrange Cups", "Cốc - lau và chia hạt", "home"),
    ("Collect and Spread Out Books", "Sách - phân loại và dán sticky note", "home"),
    ("Open and Clean Handbags", "Túi xách - lau và xếp đồ", "home"),
    ("Spread and Straighten Trousers", "Quần - gấp và phân loại", "home"),
    ("Arrange All Types of Pens", "Bút - tháo lắp và phân loại", "home"),
    ("Spread the Napkin and Fold It into a Triangle", "Khăn ăn - gấp túi dao nĩa và bày bàn", "home"),
    ("Match Socks into Pairs", "Tất - ghép đôi và buộc chùm", "home"),
    ("Set Up the Flower Arrangement Base", "Hoa - cắm xốp và đóng hộp", "home"),
    ("Gather Spice Bottles Near the Tray", "Chai gia vị - phân loại và xếp khay", "home"),
    ("Gather the Utensils into a Pile", "Đũa thìa - phân loại, lau và xếp ống", "home"),
    ("Turn Bowls and Plates Face Up", "Bát đĩa - xếp chồng thành tháp", "home"),
    ("Arrange ID Card Lanyards", "Thẻ đeo - lồng thẻ và luồn dây", "home"),
    ("Open the Chinese Chess Set and Empty the Mixed Pieces from the Zip Bag",
     "Cờ tướng - phân loại và xếp bàn cờ", "home"),
    ("Open Multiple Handbags", "Túi xách - cho mỹ phẩm và bút vào túi", "home"),
    ("Stack the Plastic Bags", "Túi nilon - cuộn bó, đóng thùng (thu hồi trong thùng)", "home"),
    ("Remove the Pot Lid", "Nồi chảo - chuyển dụng cụ bếp", "home"),
    ("Sort Bags and Shirts", "Hàng hóa - đóng túi, xếp chồng và buộc dây", "industrial"),
    ("Assemble Three Boxes and Tape the Bottoms", "Hộp giấy - gấp hộp, đóng tất và dán tem", "industrial"),
    ("Remove Items from the Basket", "Sọt đồ - phân loại, lau và xếp khay", "industrial"),
    ("Open Product Boxes", "Hộp hàng - lót chống sốc và đóng hộp", "industrial"),
    ("Sort Bags and Cardboard Inserts", "Túi bóng - lót bìa và cho tất", "industrial"),
    ("Separate Blister Packs and Medicine Bottles from a Mixed Pile", "Thuốc - phân loại và đóng gói", "home"),
    ("Arrange Bowls in Rows", "Bát đũa - xếp hàng, gác đũa và xếp chồng", "home"),
    ("Stack plastic bags into piles", "Túi nilon - cuộn bó, đóng thùng (rải lại ra bàn)", "home"),
    ("Remove the Red Envelopes from the Packaging", "Bao lì xì - cắt giấy, cho vào và đóng gói", "home"),
    ("Remove Lids and Straps from Insulated Bottles", "Bình giữ nhiệt - tháo nắp và vệ sinh", "home"),
    ("Turn each type of hat right-side out", "Mũ - phân loại, gấp và cất hộp", "home"),
    ("Place the teapot on the tray and fill it with water", "Ấm chén - bày khay và rót nước", "home"),
    ("Arrange Badminton Rackets and Shuttlecock Tubes", "Cầu lông - lau vợt và đếm cầu", "home"),
    ("Place the umbrellas on the table", "Ô - kiểm tra, lau và gấp", "home"),
    ("Remove the Vacuum Cleaner from the Basket", "Máy hút bụi - vệ sinh và tháo lắp hộp bụi", "industrial"),
    ("Clean the PC Case Exterior", "Cây PC - vệ sinh và tháo lắp linh kiện", "industrial"),
    ("Disconnect the Keyboard Cable", "Bàn phím - vệ sinh và tháo lắp ốc", "industrial"),
    ("Remove Artificial Flowers from the Basket", "Hoa giả - cắm que, cắm xốp và gói bó", "industrial"),
    ("Remove Mat Pieces from the Basket", "Thảm ghép - phân loại, ghép và lau", "industrial"),
    ("Remove Fruits and Vegetables from the Bag", "Củ quả - rửa, lau khô và bày mẹt", "home"),
]

# Steps whose VI columns are empty in the sheet: (name VI, description VI), taken from the same steps
# in the sheet "Bản sao của 1. PLAN". Keyed by the step EN.
VI_FALLBACK = {
    "Remove Fruits and Vegetables from the Bag":
        ("Bỏ các loại củ quả ra khỏi túi", "Dùng 2 tay bỏ các loại củ quả trong túi đựng ra rổ/bàn"),
    "Wash Fruits and Vegetables": ("Rửa các loại củ quả", "Rửa sạch các loại quả bằng nước"),
    "Dry the Fruits and Vegetables": ("Lau khô các quả", "Dùng khăn lau khô các loại quả rồi bỏ vào rổ/bàn"),
    "Arrange Fruits and Vegetables on Trays":
        ("Bày quả ra các mẹt", "Dùng 2 tay sắp xếp từng loại quả lẫn lộn vào các mẹt (3-4 mẹt)"),
    "Pack fruits and vegetables back into the bag":
        ("Thu hồi các loại quả vào túi đựng", "Thu hồi các loại quả từ mẹt vào túi đựng ban đầu"),
}


def clean(value: object) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", unicodedata.normalize("NFC", str(value))).strip()


def name(value: object) -> str:
    """Step or task name: no trailing period, first letter upper case."""
    text = clean(value).rstrip(". ")
    return text[:1].upper() + text[1:]


def fold(text: str) -> str:
    return clean(text).lower().rstrip(".")


def read_groups() -> list[list[dict]]:
    sheet = load_workbook(SOURCE, data_only=True, read_only=True)[SHEET]
    groups: list[list[dict]] = []
    for row in sheet.iter_rows(min_row=2, max_col=5, values_only=True):
        number, name_en, desc_en, name_vi, desc_vi = (list(row) + [None] * 5)[:5]
        if not isinstance(number, (int, float)) or not clean(name_en):
            continue
        order = int(number)
        if not clean(name_vi) and clean(name_en) in VI_FALLBACK:
            name_vi, desc_vi = VI_FALLBACK[clean(name_en)]
        step = {
            "order": order, "nameVi": name(name_vi), "nameEn": name(name_en),
            "description": clean(desc_vi), "descriptionEn": clean(desc_en),
        }
        if order == 1:
            groups.append([step])
            continue
        if not groups:
            raise SystemExit(f"{SHEET}: step {order} '{step['nameEn']}' before any step 1")
        last = groups[-1][-1]
        if order == last["order"]:  # alternative of the previous step
            for key in ("nameVi", "nameEn", "description", "descriptionEn"):
                last[key] = ALT_SEPARATOR.join(p for p in (last[key], step[key]) if p)
        elif order == last["order"] + 1:
            groups[-1].append(step)
        else:
            raise SystemExit(f"{SHEET}: step {order} '{step['nameEn']}' follows step {last['order']}")
    return groups


def build(groups: list[list[dict]]) -> list[dict]:
    if len(groups) != len(TASKS):
        raise SystemExit(f"{SHEET} has {len(groups)} tasks but TASKS lists {len(TASKS)}; update TASKS")
    tasks = []
    for index, (group, (first_en, task_name, section)) in enumerate(zip(groups, TASKS), start=1):
        if fold(group[0]["nameEn"]) != fold(first_en):
            raise SystemExit(f"task {index}: sheet starts with '{group[0]['nameEn']}', TASKS expects '{first_en}'")
        code = f"{CODE_PREFIX}{index:02d}"
        tasks.append({
            "code": code, "name": task_name, "section": section, "sources": ["micky"], "variantOf": None,
            "steps": [{
                "code": f"{code}-{s['order']}", "order": s["order"], "nameVi": s["nameVi"], "nameEn": s["nameEn"],
                "description": s["description"], "descriptionEn": s["descriptionEn"] or None,
                "props": [], "wristcamNote": None,
            } for s in group],
        })
    return tasks


def validate(tasks: list[dict]) -> None:
    codes = [t["code"] for t in tasks]
    assert len(codes) == len(set(codes)), "duplicate task codes"
    names = [t["name"] for t in tasks]
    assert len(names) == len(set(names)), "duplicate task names"
    sections = {s["id"] for s in SECTIONS}
    for t in tasks:
        assert t["name"] and t["section"] in sections, t["code"]
        if t["code"] == OTHER_TASK["code"]:
            continue
        assert TASK_CODE.match(t["code"]), t["code"]
        assert [s["order"] for s in t["steps"]] == list(range(1, STEPS_PER_TASK + 1)), f"{t['code']} steps"
        for s in t["steps"]:
            assert s["nameVi"] and s["nameEn"], f"{s['code']} has an unnamed step"


def main() -> int:
    tasks = build(read_groups())
    tasks.insert(0, dict(OTHER_TASK))
    order = {sec["id"]: i for i, sec in enumerate(SECTIONS)}
    tasks.sort(key=lambda t: order[t["section"]])  # stable: keeps M numbering inside a section
    validate(tasks)
    catalog = {
        "version": 2,
        "generatedBy": "scripts/build_tasks.py",
        "sources": [f"{SOURCE.name} - {SHEET}"],
        "sections": SECTIONS,
        "tasks": tasks,
    }
    text = json.dumps(catalog, ensure_ascii=False, indent=2) + "\n"
    if "--check" in sys.argv:
        if OUT.read_text(encoding="utf-8") != text:
            print(f"{OUT.relative_to(ROOT)} is stale; run scripts/build_tasks.py", file=sys.stderr)
            return 1
        return 0
    OUT.write_text(text, encoding="utf-8")
    per_section = {s["id"]: sum(1 for t in tasks if t["section"] == s["id"]) for s in SECTIONS}
    print(f"{OUT.relative_to(ROOT)}: {len(tasks)} tasks {per_section}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
