#!/usr/bin/env python3
"""Build src/tasks.json (task catalog with steps) from the two reference CSVs in ref/.

    python3 scripts/build_tasks.py            # writes src/tasks.json
    python3 scripts/build_tasks.py --check    # exits 1 when src/tasks.json is stale

Sources:
- ref/KichBan-HienTruong.csv: the canonical list. One task per "Mã vòng" (V01..V76), 5 steps each.
- ref/[MICKY] Master.xlsx - 1. PLAN.csv: the shooting plan. Groups of 5 steps without a code.
  Groups whose 5 steps match a KichBan task get that task's code; the others get P01.. in plan order.

Codes (`V22`, `P03`, steps `V22-1`) only use QR alphanumeric characters so they fit the QR payload.
"""

from __future__ import annotations

import csv
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KICHBAN = ROOT / "ref" / "KichBan-HienTruong.csv"
PLAN = ROOT / "ref" / "[MICKY] Master.xlsx - 1. PLAN.csv"
OUT = ROOT / "src" / "tasks.json"

TASK_CODE = re.compile(r"^[A-Z][0-9]{2}$")
STEPS_PER_TASK = 5

# Order of the sections in the picker.
SECTIONS = [
    {"id": "other", "name": "Không có mã phù hợp"},
    {"id": "plan", "name": "Kế hoạch Micky (chưa có mã vòng)"},
    {"id": "general", "name": "Nhóm chung"},
    {"id": "industrial", "name": "Industrial"},
]

# Fallback when none of the catalog tasks fits what is being recorded; first in the list, no steps.
OTHER_TASK = {
    "code": "OTHER", "name": "Khác - không có mã việc phù hợp", "section": "other",
    "sources": [], "variantOf": None, "steps": [],
}

# Names for PLAN groups that are not in KichBan, keyed by the "No." of the group's first row.
# `variantOf`: same object as a KichBan task but a different set of steps.
PLAN_ONLY = {
    6: ("Áo sơ mi - lăn bụi, cài cúc và đóng túi", "V04"),
    31: ("Bột - rây và chia hộp", None),
    41: ("Cốc - lau và chia hạt", "V07"),
    46: ("Sách - phân loại và dán sticky note", None),
    51: ("Túi xách - lau và xếp đồ", None),
    56: ("Quần - gấp và phân loại", None),
    61: ("Bút - tháo lắp và phân loại", "V24"),
    71: ("Tất - ghép đôi và buộc chùm", None),
    76: ("Hoa giả - cắm xốp và đóng hộp", "V37"),
    81: ("Chai gia vị - xếp khay (Kịch bản 1)", None),
    86: ("Đũa thìa - phân loại và xếp ống (Kịch bản 4)", None),
    91: ("Bát đĩa - xếp chồng (Kịch bản 5)", None),
    96: ("Bát đũa - rải hàng và gom (Kịch bản 6)", None),
    101: ("Thẻ đeo - lồng thẻ và luồn dây", None),
    106: ("Cờ tướng - phân loại và xếp bàn cờ", None),
    111: ("Túi xách - xếp mỹ phẩm và bút", None),
    116: ("Hàng hóa - đóng túi và buộc dây", None),
    121: ("Hộp giấy - gấp hộp, đóng tất và dán tem", None),
    126: ("Sọt đồ - phân loại, lau và xếp khay", None),
    131: ("Hộp hàng - lót chống sốc và đóng hộp", None),
    136: ("Túi bóng - lót bìa, cho tất và đóng hộp", None),
}

VIETNAMESE = re.compile(r"[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]", re.I)
SCENARIO_PREFIX = re.compile(r"^Kịch bản \d+ - Bước \d+:\s*", re.I)


def clean(text: str) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFC", text)).strip()


def split_list(text: str, sep: str) -> list[str]:
    return [clean(p) for p in text.split(sep) if clean(p)]


def fold(text: str) -> str:
    """Lowercase, no diacritics: used only to compare step names between the two files."""
    base = unicodedata.normalize("NFD", clean(text).lower()).replace("đ", "d")
    return "".join(ch for ch in base if not unicodedata.combining(ch))


def read_kichban() -> list[dict]:
    tasks: dict[str, dict] = {}
    section = "general"
    with KICHBAN.open(encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.reader(handle, delimiter=";"))
    for row in rows[1:]:
        row = [clean(c) for c in row] + [""] * (8 - len(row))
        group, code, order, name_vi, name_en, description, props, note = row[:8]
        if not code and group and not any(row[2:]):
            section = group.lower()  # a section title row, e.g. "Industrial"
            continue
        if not TASK_CODE.match(code):
            continue
        task = tasks.setdefault(code, {
            "code": code, "name": group, "section": section, "sources": ["kichban"], "variantOf": None, "steps": [],
        })
        task["steps"].append({
            "code": f"{code}-{int(order)}",
            "order": int(order),
            "nameVi": name_vi,
            "nameEn": name_en or None,
            "description": description,
            "props": split_list(props, ";"),
            "wristcamNote": note or None,
        })
    for task in tasks.values():
        task["steps"].sort(key=lambda s: s["order"])
    return list(tasks.values())


def read_plan() -> list[list[dict]]:
    """Groups of PLAN rows; each row keeps its No., step order and split vi/en names."""
    with PLAN.open(encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.reader(handle))
    groups: list[list[dict]] = []
    for row in rows[1:]:
        no, _plan, order, task, description, props = (clean(c) for c in row[:6])
        if not order.isdigit():
            continue
        lines = [clean(p) for p in row[3].split("\n") if clean(p)]
        vi = next((p for p in lines if VIETNAMESE.search(p)), lines[0] if lines else "")
        en = next((p for p in lines if p != vi), None)
        vi = SCENARIO_PREFIX.sub("", vi)
        vi = vi[:1].upper() + vi[1:]
        if int(order) == 1:
            groups.append([])
        groups[-1].append({
            "no": int(no), "order": int(order), "nameVi": vi, "nameEn": en,
            "description": clean(row[4]), "props": split_list(row[5], "\n"),
        })
    return groups


def same_step(a: dict, b: dict) -> bool:
    """Same Vietnamese name, or English names equal or one contained in the other (wording drifts)."""
    if fold(a["nameVi"]) == fold(b["nameVi"]):
        return True
    if not (a["nameEn"] and b["nameEn"]):
        return False
    x, y = fold(a["nameEn"]), fold(b["nameEn"])
    return x in y or y in x


def matches(task: dict, group: list[dict]) -> bool:
    """Every PLAN step of the group must correspond to a step of the task."""
    return len(group) == len(task["steps"]) and all(any(same_step(r, s) for s in task["steps"]) for r in group)


def merge_plan(tasks: list[dict], groups: list[list[dict]]) -> None:
    by_code = {t["code"]: t for t in tasks}
    next_plan = 1
    for group in groups:
        hit = next((t for t in tasks if matches(t, group)), None)
        if hit:
            hit["sources"].append("plan")
            continue
        first = group[0]["no"]
        if first not in PLAN_ONLY:
            raise SystemExit(f"PLAN group starting at No. {first} matches no KichBan task and has no name in PLAN_ONLY")
        name, variant_of = PLAN_ONLY[first]
        if variant_of and variant_of not in by_code:
            raise SystemExit(f"variantOf {variant_of} is not a known task")
        code = f"P{next_plan:02d}"
        next_plan += 1
        tasks.append({
            "code": code, "name": name, "section": "plan", "sources": ["plan"], "variantOf": variant_of,
            "steps": [{
                "code": f"{code}-{r['order']}", "order": r["order"], "nameVi": r["nameVi"], "nameEn": r["nameEn"],
                "description": r["description"], "props": r["props"], "wristcamNote": None,
            } for r in group],
        })


def validate(tasks: list[dict]) -> None:
    codes = [t["code"] for t in tasks]
    assert len(codes) == len(set(codes)), "duplicate task codes"
    for t in tasks:
        assert t["name"], t["code"]
        if t["code"] == OTHER_TASK["code"]:
            continue
        assert TASK_CODE.match(t["code"]), t["code"]
        assert [s["order"] for s in t["steps"]] == list(range(1, STEPS_PER_TASK + 1)), f"{t['code']} steps"
        assert all(s["nameVi"] for s in t["steps"]), f"{t['code']} has an unnamed step"


def main() -> int:
    tasks = read_kichban()
    merge_plan(tasks, read_plan())
    tasks.insert(0, dict(OTHER_TASK))
    order = {sec["id"]: i for i, sec in enumerate(SECTIONS)}
    tasks.sort(key=lambda t: order[t["section"]])  # stable: keeps V/P numbering inside a section
    validate(tasks)
    catalog = {
        "version": 1,
        "generatedBy": "scripts/build_tasks.py",
        "sources": [KICHBAN.name, PLAN.name],
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
    plan_only = sum(1 for t in tasks if t["section"] == "plan")
    print(f"{OUT.relative_to(ROOT)}: {len(tasks)} tasks ({len(tasks) - plan_only - 1} from KichBan, {plan_only} plan-only, 1 OTHER)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
