import json
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
with open(os.path.join(ROOT, "data", "characters.json"), encoding="utf-8") as source:
    characters = json.load(source)["characters"]

rows = []
for character_id, character in characters.items():
    for expression, relative_path in character["portraits"].items():
        path = os.path.join(ROOT, *relative_path.split("/"))
        if not os.path.exists(path):
            rows.append((character_id, expression, relative_path, "MISSING", "", "", "", ""))
            continue
        with Image.open(path) as image:
            width, height = image.size
            bounds = image.getbbox()
        if bounds:
            left, top, right, bottom = bounds
            padding = (left / width, top / height, (width - right) / width, (height - bottom) / height)
            visible = (right - left, bottom - top)
        else:
            padding = (0, 0, 0, 0)
            visible = (0, 0)
        rows.append((
            character_id,
            expression,
            relative_path,
            f"{width}x{height}",
            f"{width / height:.4f}",
            str(bounds),
            ",".join(f"{value:.3f}" for value in padding),
            f"{visible[0]}x{visible[1]}",
        ))

print("TOTAL", len(rows), "CHARACTERS", len(characters), "MISSING", sum(row[3] == "MISSING" for row in rows))
for character_id in characters:
    character_rows = [row for row in rows if row[0] == character_id]
    print(f"\n{character_id} assets={len(character_rows)} canvas={sorted({row[3] for row in character_rows})} ratios={sorted({row[4] for row in character_rows})}")
    for row in character_rows:
        print("|".join(row))
