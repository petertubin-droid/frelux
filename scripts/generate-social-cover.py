"""
Derives the social preview files from the approved brand artwork.

The master is scripts/assets/social-cover-master.png: the FRELUXTOOLS banner
with the F-house-wrench mark, the build / calculate / plan / innovate line and
the six tool icons. Everything served is generated from it, so a share card can
never drift from the artwork the brand was signed off on.

The master is 1024x512 (2:1) and the Open Graph frame is 1200x630, so twenty
nine pixels of height are added rather than taken: the artwork is scaled to the
full width and the top and bottom rows are extended by replicating their own
edge pixels. That keeps the logo, the icon row and the building silhouette
uncropped, and the extension sits on flat gradient so the seam is invisible.

    python3 scripts/generate-social-cover.py

Outputs: public/social-cover.png  (canonical OG image)
         public/og-image.png      (legacy URL, same artwork)
         public/og-image-opt.jpg  (lighter copy for clients that prefer JPEG)
"""
from pathlib import Path
from PIL import Image

W, H = 1200, 630
ROOT = Path(__file__).resolve().parent.parent
MASTER = ROOT / "scripts" / "assets" / "social-cover-master.png"


def build_card() -> Image.Image:
    master = Image.open(MASTER).convert("RGB")
    scaled = master.resize((W, round(master.height * W / master.width)), Image.LANCZOS)
    if scaled.height > H:  # taller than the frame: trim equally from both edges
        excess = scaled.height - H
        top = excess // 2
        return scaled.crop((0, top, W, top + H))

    pad = H - scaled.height
    top_pad = pad // 2
    bottom_pad = pad - top_pad
    card = Image.new("RGB", (W, H))
    # Extend with the artwork's own edge rows so the added bands carry its
    # gradient instead of a flat colour that would show as a seam.
    card.paste(scaled.crop((0, 0, W, 1)).resize((W, top_pad), Image.NEAREST), (0, 0))
    card.paste(scaled, (0, top_pad))
    tail = scaled.crop((0, scaled.height - 1, W, scaled.height))
    card.paste(tail.resize((W, bottom_pad), Image.NEAREST), (0, top_pad + scaled.height))
    return card


card = build_card()

# Alt text lives with the artwork it describes: the card is a picture, so the
# only thing a screen reader or a crawler can know about it is this sentence.
ALT = "FRELUXTOOLS logo over a construction skyline: build, calculate, plan, innovate"

public = ROOT / "public"
card.save(public / "social-cover.png", "PNG", optimize=True)
card.save(public / "og-image.png", "PNG", optimize=True)
card.save(public / "og-image-opt.jpg", "JPEG", quality=90, optimize=True, progressive=True)
print(f"social cover: {W}x{H} from {MASTER.name}, {card.size}")
