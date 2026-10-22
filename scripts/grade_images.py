"""Applies one shared colour grade to the AI-generated source images and exports AVIF/WebP/JPEG sizes."""
import json
import os
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageEnhance

RAW = Path(os.environ.get("RAW_DIR", "/app/scripts/raw"))
OUT = Path("/app/frontend/public/images")
MANIFEST = Path("/app/frontend/src/lib/imageManifest.json")
OUT.mkdir(parents=True, exist_ok=True)


def grain(size, strength=7):
    random.seed(7)
    noise = Image.effect_noise(size, 40).point(lambda v: 128 + (v - 128) * strength // 40)
    return Image.merge("RGB", (noise, noise, noise))


def grade(img: Image.Image) -> Image.Image:
    img = img.convert("RGB")
    img = ImageEnhance.Color(img).enhance(0.86)
    img = ImageEnhance.Contrast(img).enhance(1.06)
    r, g, b = img.split()
    img = Image.merge("RGB", (r.point(lambda v: int(v * 0.94)), g, b.point(lambda v: min(255, int(v * 1.04 + 3)))))
    img = Image.blend(img, Image.new("RGB", img.size, (6, 14, 44)), 0.08)
    return ImageChops.add(img, grain(img.size), 1.0, -128)


manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
for src in sorted(RAW.glob("*.jpg")):
    name = src.stem
    img = grade(Image.open(src))
    manifest[name] = {"w": img.width, "h": img.height}
    for suffix, scale in (("lg", 1), ("sm", 0.5)):
        copy = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
        copy.save(OUT / f"{name}-{suffix}.avif", "AVIF", quality=58)
        copy.save(OUT / f"{name}-{suffix}.webp", "WEBP", quality=74, method=6)
        copy.save(OUT / f"{name}-{suffix}.jpg", "JPEG", quality=78, progressive=True, optimize=True)
    print(name, img.size)

MANIFEST.write_text(json.dumps(manifest, indent=2))
