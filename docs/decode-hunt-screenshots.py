from __future__ import annotations

import base64
from io import BytesIO
from pathlib import Path

from PIL import Image

DOCS = Path("docs")


def webp_b64_to_png(stem: str, dest_names: list[str]) -> None:
    payload = (DOCS / f"{stem}.webp.b64").read_text(encoding="ascii")
    raw = base64.b64decode(payload)
    image = Image.open(BytesIO(raw)).convert("RGB")
    for name in dest_names:
        image.save(DOCS / name, format="PNG", optimize=True)


if __name__ == "__main__":
    DOCS.mkdir(exist_ok=True)
    webp_b64_to_png("jev-hunt-after-autoplace", ["jev-hunt-after-autoplace.png"])
    webp_b64_to_png(
        "jev-hunt-midgame-board",
        ["jev-hunt-midgame-board.png", "jev-hunt-journal-jev-source.png"],
    )
    print("wrote PNGs")
