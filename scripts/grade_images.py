"""Downloads royalty-free stock photos once and applies one consistent night-match grade."""
import io
from pathlib import Path

import requests
from PIL import Image, ImageEnhance, ImageOps

OUT = Path("/app/frontend/public/images")
OUT.mkdir(parents=True, exist_ok=True)

U = "https://images.unsplash.com/photo-{}?auto=format&fit=crop&w=2000&q=85"
P = "https://images.pexels.com/photos/{0}/pexels-photo-{0}.jpeg?auto=compress&cs=tinysrgb&w=2000"

SOURCES = {
    "stadium-night": U.format("1679391029864-d46f366a456b"),
    "floodlight-pitch": U.format("1431324155629-1a6deb1dec8d"),
    "stadium-aerial": P.format("35898730"),
    "fans-night": U.format("1706675780107-7c43cc487928"),
    "fans-crowd": U.format("1665413811870-5b29a250f64a"),
    "fan-shirt": U.format("1556816214-fda351e4a7fb"),
    "phone-filming": U.format("1509473383868-b934025a9bc3"),
    "phone-crowd": U.format("1779809140695-9312654f0090"),
    "gimbal-creator": U.format("1651471086771-6c529f276dac"),
    "ball-night": P.format("38105639"),
    "ball-goal-floodlight": P.format("16826135"),
    "ball-line": U.format("1599204606395-ede983387d21"),
}


def grade(img: Image.Image) -> Image.Image:
    img = ImageOps.exif_transpose(img).convert("RGB")
    img = ImageEnhance.Color(img).enhance(0.72)
    img = ImageEnhance.Contrast(img).enhance(1.12)
    img = ImageEnhance.Brightness(img).enhance(0.82)
    tint = Image.new("RGB", img.size, (8, 22, 70))
    return Image.blend(img, tint, 0.16)


for name, url in SOURCES.items():
    data = requests.get(url, timeout=60).content
    img = grade(Image.open(io.BytesIO(data)))
    for width in (1600, 800):
        copy = img.copy()
        copy.thumbnail((width, width * 2))
        copy.save(OUT / f"{name}-{width}.webp", "WEBP", quality=74, method=6)
    print("ok", name, img.size)
