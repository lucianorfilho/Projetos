"""Gera app/assets/icons/dbwatch.ico (ferramenta de build, não entra no app)."""
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).parent.parent / "app" / "assets" / "icons" / "dbwatch.ico"
SIZE = 256

BG_TOP = (17, 24, 39)      # #111827
BG_BOTTOM = (30, 41, 59)   # #1e293b
ACCENT = (56, 189, 248)    # #38bdf8 (cyan)
DOT_OK = (34, 197, 94)     # #22c55e


def make_base(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # fundo com cantos arredondados e leve gradiente vertical
    radius = int(size * 0.22)
    for y in range(size):
        t = y / size
        r = int(BG_TOP[0] + (BG_BOTTOM[0] - BG_TOP[0]) * t)
        g = int(BG_TOP[1] + (BG_BOTTOM[1] - BG_TOP[1]) * t)
        b = int(BG_TOP[2] + (BG_BOTTOM[2] - BG_TOP[2]) * t)
        draw.line([(0, y), (size, y)], fill=(r, g, b, 255))

    mask = Image.new("L", (size, size), 0)
    mdraw = ImageDraw.Draw(mask)
    mdraw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    bg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bg.paste(img, (0, 0), mask)
    img = bg
    draw = ImageDraw.Draw(img)

    # linha de "pulso" (ECG) atravessando o ícone
    m = size * 0.16
    midy = size * 0.56
    pts = [
        (m, midy),
        (size * 0.32, midy),
        (size * 0.40, midy - size * 0.22),
        (size * 0.48, midy + size * 0.30),
        (size * 0.55, midy - size * 0.10),
        (size * 0.62, midy),
        (size - m, midy),
    ]
    width = max(2, int(size * 0.045))
    draw.line(pts, fill=ACCENT, width=width, joint="curve")

    # ponto de status (verde) no fim da linha, como um indicador "OK"
    dot_r = size * 0.055
    cx, cy = size - m - dot_r * 0.2, midy
    draw.ellipse([cx - dot_r, cy - dot_r, cx + dot_r, cy + dot_r], fill=DOT_OK)

    return img


base = make_base(SIZE)
OUT.parent.mkdir(parents=True, exist_ok=True)
sizes = [256, 128, 64, 48, 32, 16]
base.save(OUT, format="ICO", sizes=[(s, s) for s in sizes])
print(f"Ícone salvo em {OUT}")
