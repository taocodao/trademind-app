"""
Broker ticket annotation generator.

Overlays numbered pointers + the exact order value onto a static broker ticket
screenshot (e.g. Fidelity Stocks/ETFs), producing a PNG guide the user follows
field-by-field. Pure Pillow — no native deps, runs in Next.js.

Coordinates are fractions of the template's width/height so they scale with the
image. The Fidelity Stocks/ETFs template is 1270x1008.
"""

from __future__ import annotations

import base64
import io
import json
import sys
from typing import Optional

from PIL import Image, ImageDraw, ImageFont

# Template paths (under public/, so they also serve as the plain background).
TEMPLATE_STOCKS = "public/broker-guides/fidelity-stocks.jpg"

# Field pointer positions as (cx_frac, cy_frac) of the CROPPED template
# (fidelity-stocks.jpg cropped to the Trade card, 1270x564), in display order.
STOCKS_FIELDS = {
    "symbol":    (0.155, 0.310),
    "action":    (0.133, 0.470),
    "quantity":  (0.265, 0.470),
    "orderType": (0.485, 0.470),
    "tif":       (0.098, 0.560),
}

ACCENT = (16, 163, 74)        # Fidelity-style green
DARK = (17, 24, 39)
WHITE = (255, 255, 255)


def _font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for c in candidates:
        try:
            return ImageFont.truetype(c, size)
        except Exception:
            continue
    return ImageFont.load_default()


def annotate_stocks(
    symbol: str,
    action: str,
    quantity: int,
    out_path: Optional[str] = None,
) -> bytes:
    """Annotate the Fidelity Stocks/ETFs ticket. action: 'buy'|'sell'."""
    im = Image.open(TEMPLATE_STOCKS).convert("RGB")
    W, H = im.size

    # Left-margin gutter for numbered value cards; shift the ticket right.
    gutter = int(W * 0.30)
    canvas = Image.new("RGB", (W + gutter, H), (245, 245, 245))
    canvas.paste(im, (gutter, 0))
    d = ImageDraw.Draw(canvas)

    values = [
        ("1", "Symbol", symbol.upper(), STOCKS_FIELDS["symbol"]),
        ("2", "Action", "Buy" if action == "buy" else "Sell", STOCKS_FIELDS["action"]),
        ("3", "Quantity", f"{quantity}", STOCKS_FIELDS["quantity"]),
        ("4", "Order type", "Market", STOCKS_FIELDS["orderType"]),
        ("5", "Time in force", "Day", STOCKS_FIELDS["tif"]),
    ]

    badge_font = _font(int(H * 0.045))
    label_font = _font(int(H * 0.030), bold=False)
    value_font = _font(int(H * 0.042))

    # Stack the value cards evenly down the gutter; connect each to its field.
    n = len(values)
    card_h = int(H * 0.16)
    gap = int(H * 0.04)
    top = int((H - (n * card_h + (n - 1) * gap)) / 2)
    card_x = int(gutter * 0.07)
    card_w = int(gutter * 0.86)

    for i, (num, label, value, (fx, fy)) in enumerate(values):
        cx, cy = gutter + int(fx * W), int(fy * H)
        card_y = top + i * (card_h + gap)
        card_mid = card_y + card_h // 2
        # pointer line from card to field badge
        d.line([(card_x + card_w, card_mid), (cx, cy)], fill=ACCENT, width=max(2, H // 250))
        # numbered badge on the field
        r = int(H * 0.040)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=ACCENT, outline=WHITE, width=max(2, H // 280))
        tw = d.textlength(num, font=badge_font)
        d.text((cx - tw / 2, cy - r * 0.72), num, font=badge_font, fill=WHITE)
        # gutter value card
        d.rounded_rectangle([card_x, card_y, card_x + card_w, card_y + card_h],
                            radius=10, fill=WHITE, outline=ACCENT, width=2)
        d.text((card_x + 14, card_y + int(card_h * 0.14)), f"{num}. {label}", font=label_font, fill=(107, 114, 128))
        d.text((card_x + 14, card_y + int(card_h * 0.44)), value, font=value_font, fill=DARK)

    buf = io.BytesIO()
    canvas.save(buf, format="PNG")
    data = buf.getvalue()
    if out_path:
        with open(out_path, "wb") as f:
            f.write(data)
    return data


def main() -> None:
    payload = json.loads(sys.stdin.read() or "{}")
    o = payload.get("order", {})
    data = annotate_stocks(
        symbol=o.get("symbol", "QQQ"),
        action=o.get("action", "buy"),
        quantity=int(o.get("quantity", 1)),
    )
    sys.stdout.write(json.dumps({"png_base64": base64.b64encode(data).decode()}))


if __name__ == "__main__":
    main()
