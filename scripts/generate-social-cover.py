"""
Builds the social preview card (1200x630) from the live brand assets.

Why a script rather than a designed file: the previous card still carried the
wordmark that was removed from the logo in the icon-only rebrand, so every link
preview showed a logo the site no longer uses. This composes the card from
public/logo-mark.png, the Plus Jakarta Sans and Inter files the site serves, and
the positioning copy from src/config/site.ts, so the preview cannot drift from
the product again. Re-run after any brand change:

    python3 scripts/generate-social-cover.py

Outputs: public/social-cover.png (canonical OG image),
         public/og-image.png and public/og-image-opt.jpg (legacy URLs kept in
         step so old embeds update too).
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
INK = (10, 10, 26)
MUTED = (82, 82, 91)
RULE = (214, 211, 199)
CREAM_TOP = (251, 249, 243)
CREAM_BOTTOM = (243, 239, 229)
ACCENT = (124, 58, 237)  # --primary, #7C3AED

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "scripts" / "assets" / "fonts"
JAKARTA = FONTS / "jakarta800.ttf"
JAKARTA_MD = FONTS / "jakarta600.ttf"
INTER = FONTS / "inter400.ttf"
INTER_MD = FONTS / "inter500.ttf"


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size)


def background() -> Image.Image:
    img = Image.new("RGB", (W, H), CREAM_TOP)
    draw = ImageDraw.Draw(img)
    for y in range(H):
        t = y / (H - 1)
        draw.line(
            [(0, y), (W, y)],
            fill=tuple(
                round(CREAM_TOP[i] + (CREAM_BOTTOM[i] - CREAM_TOP[i]) * t)
                for i in range(3)
            ),
        )
    return img


def wrap(draw, text, fnt, max_width):
    words = text.split()
    lines, line = [], ""
    for word in words:
        candidate = f"{line} {word}".strip()
        if draw.textlength(candidate, font=fnt) <= max_width or not line:
            line = candidate
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def tracked(draw, xy, text, fnt, fill, spacing):
    """Letter-spaced small caps, as used in the header lockup."""
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=fnt, fill=fill)
        x += draw.textlength(ch, font=fnt) + spacing


card = background()
draw = ImageDraw.Draw(card)

# Logo mark, the icon-only asset the site actually renders in its header.
mark = Image.open(ROOT / "public" / "logo-mark.png").convert("RGBA")
mark_h = 78
mark_w = round(mark.width * mark_h / mark.height)
mark = mark.resize((mark_w, mark_h), Image.LANCZOS)
card.paste(mark, (72, 64), mark)

# Wordmark beside it, at the mark's optical centre.
name_font = font(JAKARTA, 42)
draw.text((72 + mark_w + 26, 66), "FRELUX", font=name_font, fill=INK)
tracked(
    draw,
    (72 + mark_w + 26, 118),
    "SMART CALC",
    font(JAKARTA_MD, 17),
    ACCENT,
    4.2,
)

# Positioning line, two lines, from siteConfig.tagline.
head_font = font(JAKARTA, 60)
head_lines = ["Every trade. Every market.", "One construction platform."]
y = 246
for line in head_lines:
    draw.text((72, y), line, font=head_font, fill=INK)
    y += 74

# What the platform does, in one sentence a reader can act on.
accent_bar_y = 400
draw.rectangle([72, accent_bar_y, 72 + 64, accent_bar_y + 5], fill=ACCENT)

body_font = font(INTER, 27)
body = (
    "Measurements become material quantities and market prices, from one room "
    "to a whole building, with guides and answered questions beside every "
    "calculator."
)
body_lines = wrap(draw, body, body_font, 940)
y = 432
for line in body_lines:
    draw.text((72, y), line, font=body_font, fill=(63, 63, 70))
    y += 36

# Footer rule and the two facts worth carrying on a link preview.
draw.line([(72, 552), (W - 72, 552)], fill=RULE, width=1)
draw.text(
    (72, 574), "freluxtools.com", font=font(INTER_MD, 23), fill=INK
)
right = "Free to use  ·  32 markets  ·  Every trade"
rf = font(INTER, 23)
draw.text((W - 72 - draw.textlength(right, font=rf), 574), right, font=rf, fill=MUTED)

out = ROOT / "scripts" / "assets"
out.mkdir(parents=True, exist_ok=True)
card_path = out / "social-cover.png"
card.save(card_path, "PNG", optimize=True)

public = ROOT / "public"
card.save(public / "social-cover.png", "PNG", optimize=True)
card.save(public / "og-image.png", "PNG", optimize=True)
card.save(public / "og-image-opt.jpg", "JPEG", quality=88, optimize=True, progressive=True)

print(f"social cover written: {card_path.stat().st_size // 1024} kB at {W}x{H}")
