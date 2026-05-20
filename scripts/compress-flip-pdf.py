"""Compress flipbook PDF for Cloudflare Workers (25 MiB asset limit)."""
from __future__ import annotations

import sys
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[1]
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "images" / "dezine-flip.pdf"
DST = ROOT / "images" / "dezine-flip.pdf"
MAX_MB = 24


def compress(scale: float, quality: int) -> tuple[Path, float]:
    src = fitz.open(SRC)
    dst = fitz.open()
    for page in src:
        rect = page.rect
        pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
        img = pix.tobytes("jpeg", jpg_quality=quality)
        new_page = dst.new_page(width=rect.width, height=rect.height)
        new_page.insert_image(rect, stream=img)
    src.close()
    dst.save(DST, deflate=True, garbage=4, clean=True)
    dst.close()
    mb = DST.stat().st_size / (1024 * 1024)
    return DST, mb


def main() -> None:
    if not SRC.is_file():
        print(f"Missing source PDF: {SRC}", file=sys.stderr)
        sys.exit(1)

    attempts = [
        (1.5, 82),
        (1.35, 78),
        (1.25, 72),
        (1.15, 68),
    ]
    best = None
    for scale, quality in attempts:
        path, mb = compress(scale, quality)
        print(f"scale={scale} quality={quality} -> {mb:.2f} MiB")
        best = (scale, quality, mb)
        if mb <= MAX_MB:
            print(f"OK: {path} ({mb:.2f} MiB)")
            return

    if best and best[2] > MAX_MB:
        print(f"Warning: smallest attempt still {best[2]:.2f} MiB (target {MAX_MB})", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
