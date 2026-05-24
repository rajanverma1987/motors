#!/usr/bin/env python3
"""Generate native splash image matching AppSplashScreen / login hero styling."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "splash-screen.png"
LOGO = ROOT / "assets" / "iqmotorbase-logo.png"

W, H = 1284, 2778
BG = (253, 252, 251)  # hsl(32, 22%, 99%)
HERO = (237, 228, 217)  # hsl(28, 32%, 93%)
PRIMARY = (154, 93, 51)  # hsl(26, 52%, 38%)
TITLE = (23, 18, 14)
SUB = (115, 98, 86)


def main():
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    hero_h = int(H * 0.42)
    draw.rectangle([0, 0, W, hero_h], fill=HERO)

    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse([W - 320, -80, W + 40, 280], fill=(154, 93, 51, 32))
    img = Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")
    draw = ImageDraw.Draw(img)

    badge_size = 140
    bx = (W - badge_size) // 2
    by = int(H * 0.14)
    draw.rounded_rectangle(
        [bx, by, bx + badge_size, by + badge_size],
        radius=36,
        fill=PRIMARY,
    )

    try:
        title_font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 72)
        sub_font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 40)
        ver_font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 32)
    except OSError:
        title_font = ImageFont.load_default()
        sub_font = title_font
        ver_font = title_font

    title = "Motop Technician"
    sub = "Shop floor tools for IQ Motorbase CRM"
    tw = draw.textlength(title, font=title_font)
    draw.text(((W - tw) / 2, by + badge_size + 48), title, fill=TITLE, font=title_font)
    sw = draw.textlength(sub, font=sub_font)
    draw.text(((W - sw) / 2, by + badge_size + 140), sub, fill=SUB, font=sub_font)

    logo = Image.open(LOGO).convert("RGBA")
    logo_w = 560
    logo_h = int(logo.height * (logo_w / logo.width))
    logo = logo.resize((logo_w, logo_h), Image.Resampling.LANCZOS)
    lx = (W - logo_w) // 2
    ly = H - logo_h - 180
    img.paste(logo, (lx, ly), logo)

    ver = "Version 1.0.0"
    vw = draw.textlength(ver, font=ver_font)
    draw.text(((W - vw) / 2, ly + logo_h + 36), ver, fill=SUB, font=ver_font)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "PNG", optimize=True)
    print(f"Wrote {OUT} ({W}x{H})")


if __name__ == "__main__":
    main()
