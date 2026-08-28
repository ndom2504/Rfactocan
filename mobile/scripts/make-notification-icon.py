"""White-on-transparent Rfacto R for Android status-bar notification icon."""
from __future__ import annotations

import struct
import zlib
from pathlib import Path

# Vector path from Android ic_stat_rfacto.xml, viewBox 24x24, rasterized at 96px.
PATH = (
    "M5,2.8h9.4c2.7,0 4.9,2.15 4.9,4.95c0,2.15 -1.35,4 -3.35,4.65"
    "L20.2,21.2h-4.55L12,13.4H9.35V21.2H5V2.8z"
    "M9.35,6.15v4.35h5.15c1.15,0 2.05,-0.9 2.05,-2.15c0,-1.2 -0.9,-2.2 -2.05,-2.2H9.35z"
)


def png_bytes(width: int, height: int, pixels: bytes) -> bytes:
    def chunk(tag: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)

    raw = b""
    stride = width * 4
    for y in range(height):
        raw += b"\x00" + pixels[y * stride : (y + 1) * stride]
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


def inside_r(x: float, y: float) -> bool:
    """Match ic_stat_rfacto silhouette (even-odd for the bowl hole)."""
    outer = False
    # stem
    if 5 <= x <= 9.35 and 2.8 <= y <= 21.2:
        outer = True
    # top bar + bowl
    if 9.35 <= x <= 14.4 and 2.8 <= y <= 6.15:
        outer = True
    # rounded outer bowl (circle-ish)
    cx, cy, rx, ry = 14.4, 7.75, 4.9, 4.95
    if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 and 2.8 <= y <= 12.4 and x >= 9.35:
        outer = True
    # diagonal leg
    if 12 <= x <= 20.2 and 13.4 <= y <= 21.2:
        t = (y - 13.4) / (21.2 - 13.4)
        left = 12 + t * 3.65
        right = 12 + t * 8.2
        if left <= x <= right:
            outer = True
    hole = False
    if 9.35 <= x <= 16.55 and 6.15 <= y <= 10.5:
        hcx, hcy = 14.5, 8.325
        if ((x - hcx) / 2.05) ** 2 + ((y - hcy) / 2.175) ** 2 <= 1 or (
            9.35 <= x <= 14.5 and 6.15 <= y <= 10.5
        ):
            # inner counter of the R
            if 9.35 < x < 14.5 and 6.15 < y < 10.5:
                hole = True
            elif ((x - 14.5) / 2.05) ** 2 + ((y - 8.325) / 2.175) ** 2 <= 1:
                hole = True
    return outer and not hole


def main() -> None:
    size = 96
    scale = size / 24
    pixels = bytearray(size * size * 4)
    for py in range(size):
        for px in range(size):
            # 4x supersample
            hit = 0
            for dy in (0.2, 0.5, 0.8):
                for dx in (0.2, 0.5, 0.8):
                    if inside_r((px + dx) / scale, (py + dy) / scale):
                        hit += 1
            if hit:
                i = (py * size + px) * 4
                a = int(255 * hit / 9)
                pixels[i : i + 4] = bytes((255, 255, 255, a))
    out = Path(__file__).resolve().parents[1] / "assets" / "images" / "notification-icon.png"
    out.write_bytes(png_bytes(size, size, bytes(pixels)))
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
