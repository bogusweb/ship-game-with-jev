from __future__ import annotations

import base64
from io import BytesIO
from pathlib import Path

from PIL import Image

DOCS = Path("docs")


def read_b64(stem: str) -> str:
    single = DOCS / f"{stem}.webp.b64"
    if single.exists():
        return "".join(single.read_text(encoding="ascii").split())
    part_dir = DOCS / f"{stem}.webp.b64.d"
    parts = sorted(part_dir.glob("part*"))
    if not parts:
        raise FileNotFoundError(f"missing payload for {stem}")
    return "".join("".join(p.read_text(encoding="ascii").split()) for p in parts)


def webp_b64_to_png(stem: str, dest_names: list[str]) -> None:
    raw = base64.b64decode(read_b64(stem))
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
