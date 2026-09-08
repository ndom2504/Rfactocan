"""Rfacto app icon: white R on #0f6b4c (same mark as Android notifications)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

SIZE = 1024
GREEN = (15, 107, 76)  # #0f6b4c — android.adaptiveIcon.backgroundColor


def inside_r(x: float, y: float) -> bool:
    outer = False
    if 5 <= x <= 9.35 and 2.8 <= y <= 21.2:
        outer = True
    if 9.35 <= x <= 14.4 and 2.8 <= y <= 6.15:
        outer = True
    cx, cy, rx, ry = 14.4, 7.75, 4.9, 4.95
    if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 and 2.8 <= y <= 12.4 and x >= 9.35:
        outer = True
    if 12 <= x <= 20.2 and 13.4 <= y <= 21.2:
        t = (y - 13.4) / (21.2 - 13.4)
        left = 12 + t * 3.65
        right = 12 + t * 8.2
        if left <= x <= right:
            outer = True
    hole = False
    if 9.35 <= x <= 16.55 and 6.15 <= y <= 10.5:
        if 9.35 < x < 14.5 and 6.15 < y < 10.5:
            hole = True
        elif ((x - 14.5) / 2.05) ** 2 + ((y - 8.325) / 2.175) ** 2 <= 1:
            hole = True
    return outer and not hole


def raster_r(size: int, pad: float = 3.2) -> Image.Image:
    """White R on transparent, viewBox 24x24 with extra padding for iOS safe zone."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    px = img.load()
    span = 24 + pad * 2
    scale = size / span
    for py in range(size):
        for xpix in range(size):
            hit = 0
            for dy in (0.25, 0.5, 0.75):
                for dx in (0.25, 0.5, 0.75):
                    vx = (xpix + dx) / scale - pad
                    vy = (py + dy) / scale - pad
                    if inside_r(vx, vy):
                        hit += 1
            if hit:
                a = int(255 * hit / 9)
                px[xpix, py] = (255, 255, 255, a)
    return img


def main() -> None:
    out_dir = Path(__file__).resolve().parents[1] / "assets" / "images"
    mark = raster_r(SIZE)
    ios = Image.new("RGB", (SIZE, SIZE), GREEN)
    ios.paste(mark, (0, 0), mark)
    ios.save(out_dir / "icon.png", format="PNG", optimize=True)

    fg = raster_r(512)
    fg.save(out_dir / "android-icon-foreground.png", format="PNG", optimize=True)
    print("wrote", out_dir / "icon.png")
    print("wrote", out_dir / "android-icon-foreground.png")


if __name__ == "__main__":
    main()
