from PIL import Image, ImageDraw, ImageFont

BG   = (250, 250, 249)
INK  = (24, 24, 27)
MUT  = (113, 113, 122)
LINE = (228, 228, 231)
PUR  = (109, 40, 217)
CARD = (255, 255, 255)

B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
R = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

def f(path, size): return ImageFont.truetype(path, size)

def rr(d, box, radius, fill=None, outline=None, width=1):
    d.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)

def tracked(d, xy, text, font, fill, spacing=2):
    x, y = xy
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill)
        x += d.textlength(ch, font=font) + spacing
    return x

def wordmark(d, x, y, scale=1.0):
    s = int(34 * scale)
    d.rectangle([x, y + int(4 * scale), x + s, y + int(4 * scale) + s], fill=PUR)
    tracked(d, (x + s + int(14 * scale), y), "FRELUX", f(B, int(38 * scale)), INK, spacing=int(3 * scale))
    return x + s + int(14 * scale) + d.textlength("FRELUX", font=f(B, int(38 * scale))) + int(3 * scale) * 6

def chip(d, x, y, w, h, label, fs):
    rr(d, [x, y, x + w, y + h], h // 2, fill=CARD, outline=LINE)
    d.rounded_rectangle([x + 20, y + h // 2 - 4, x + 28, y + h // 2 + 4], radius=2, fill=PUR)
    tracked(d, (x + 40, y + h // 2 - fs // 2 - 2), label, f(B, fs), MUT, spacing=2)

def form_panel(d, x, y, w, h, label_fs, field_h, text_fs, gap):
    """A calculator form: three labelled fields and a filled action button."""
    rr(d, [x, y, x + w, y + h], 18, fill=CARD, outline=LINE)
    cy = y + int(h * 0.06)
    for label, value in (("PLOT SIZE", "100 x 50 ft"), ("HEIGHT", "9 coaches"), ("BLOCK", "9 inch")):
        d.text((x + 26, cy), label, font=f(B, label_fs), fill=MUT)
        cy += label_fs + 8
        rr(d, [x + 26, cy, x + w - 26, cy + field_h], 10, fill=(250, 250, 249), outline=LINE)
        d.text((x + 40, cy + field_h // 2 - text_fs // 2 - 2), value, font=f(R, text_fs), fill=INK)
        cy += field_h + gap
    rr(d, [x + 26, cy, x + w - 26, cy + field_h + 6], 10, fill=PUR)
    tw = d.textlength("Calculate", font=f(B, text_fs))
    d.text((x + (w - tw) / 2, cy + (field_h + 6) // 2 - text_fs // 2 - 2), "Calculate", font=f(B, text_fs), fill=(255, 255, 255))

def results_panel(d, x, y, w, h, rows, label_fs, text_fs, gap):
    rr(d, [x, y, x + w, y + h], 18, fill=CARD, outline=LINE)
    d.text((x + 26, y + int(h * 0.06)), "MATERIALS", font=f(B, label_fs), fill=MUT)
    cy = y + int(h * 0.06) + label_fs + 22
    for label, value in rows:
        d.text((x + 26, cy), label, font=f(R, text_fs), fill=MUT)
        vw = d.textlength(value, font=f(B, text_fs))
        d.text((x + w - 26 - vw, cy), value, font=f(B, text_fs), fill=INK)
        cy += text_fs + 16
        d.line([x + 26, cy, x + w - 26, cy], fill=LINE)
        cy += gap

ROWS = [("9 inch blocks", "1,164"), ("Cement", "38 bags"), ("Sharp sand", "4 trips")]

# ---------------- Instagram / square 1080 ----------------
S = 1080
im = Image.new("RGB", (S, S), BG)
d = ImageDraw.Draw(im)
wordmark(d, 72, 64)
pill = "freluxtools.com"
pw = d.textlength(pill, font=f(B, 22)) + 44
rr(d, [S - 72 - pw, 64, S - 72, 116], 26, fill=CARD, outline=LINE)
d.text((S - 72 - pw + 22, 80), pill, font=f(B, 22), fill=MUT)

d.text((72, 208), "Material quantities,", font=f(B, 82), fill=INK)
d.text((72, 300), "before the quote.", font=f(B, 82), fill=INK)
d.rectangle([72, 420, 168, 426], fill=PUR)
d.text((72, 462), "Estimators for every stage, priced in local units.", font=f(R, 30), fill=MUT)

labels = ["ROOFING", "PAINT", "BLOCKS", "BOREHOLE"]
cw = (S - 144 - 3 * 16) // 4
for i, lab in enumerate(labels):
    chip(d, 72 + i * (cw + 16), 528, cw, 62, lab, 19)

form_panel(d, 72, 620, 452, 400, 17, 50, 24, 18)
results_panel(d, 556, 620, S - 556 - 72, 400, ROWS, 17, 26, 26)
im.save("marketing/frelux-features-1080.png")

# ---------------- Reels / TikTok 1080x1920 ----------------
W, H = 1080, 1920
im = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(im)
wordmark(d, 80, 120, 1.15)
d.text((80, 330), "Local units.", font=f(B, 96), fill=INK)
d.text((80, 442), "Real quantities.", font=f(B, 96), fill=INK)
d.text((80, 554), "One screen.", font=f(B, 96), fill=PUR)
d.rectangle([80, 700, 196, 708], fill=PUR)
d.text((80, 748), "Coaches, trips, plots and block sizes.", font=f(R, 34), fill=MUT)
d.text((80, 796), "Roofing, paint, tiles, blocks, borehole.", font=f(R, 34), fill=MUT)

rr(d, [80, 900, 460, 1780], 40, fill=CARD, outline=LINE)
rr(d, [112, 940, 428, 1740], 24, fill=(250, 250, 249), outline=LINE)
d.text((140, 976), "FRELUX", font=f(B, 26), fill=INK)
d.rectangle([140, 1018, 388, 1022], fill=LINE)
cy = 1052
for label, value in (("Plot", "100 x 50 ft"), ("Height", "9 coaches"), ("Block", "9 inch")):
    d.text((140, cy), label.upper(), font=f(B, 16), fill=MUT)
    rr(d, [140, cy + 26, 400, cy + 84], 12, fill=CARD, outline=LINE)
    d.text((156, cy + 44), value, font=f(R, 22), fill=INK)
    cy += 108
rr(d, [140, cy + 8, 400, cy + 76], 12, fill=PUR)
tw = d.textlength("Calculate", font=f(B, 24))
d.text((270 - tw / 2, cy + 32), "Calculate", font=f(B, 24), fill=(255, 255, 255))
ry = cy + 116
for label, value in ROWS:
    d.text((140, ry), label, font=f(R, 20), fill=MUT)
    vw = d.textlength(value, font=f(B, 20))
    d.text((400 - vw, ry), value, font=f(B, 20), fill=INK)
    ry += 44
    d.line([140, ry - 12, 400, ry - 12], fill=LINE)

chip(d, 520, 960, 420, 74, "TRIPS OF SAND", 22)
chip(d, 520, 1060, 420, 74, "COACHES OF BLOCK", 22)
chip(d, 520, 1160, 420, 74, "PLOT SIZES", 22)
form_panel(d, 520, 1280, 460, 400, 17, 54, 24, 24)
d.text((80, 1820), "freluxtools.com", font=f(B, 32), fill=PUR)
im.save("marketing/frelux-features-1080x1920.png")
print("built")
