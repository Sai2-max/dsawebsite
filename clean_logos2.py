import pymupdf, io, os
from PIL import Image
doc=pymupdf.open(r"D:\mid 2\CN\DSA+CHEAT+SHEET-compressed.pdf")
os.makedirs("logo_clean",exist_ok=True)
for fn in os.listdir("logo_xrefs2"):
    if not fn.endswith(".png"): continue
    x=int(fn[:-4]); data=doc.extract_image(x)
    base=Image.open(io.BytesIO(data["image"])).convert("RGB")
    if data.get("smask"):
        mdata=doc.extract_image(data["smask"])
        mask=Image.open(io.BytesIO(mdata["image"])).convert("L")
        if mask.size!=base.size:
            mask=mask.resize(base.size, Image.LANCZOS)
        im=Image.new("RGBA",base.size,(255,255,255,255))
        fg=base.convert("RGBA"); fg.putalpha(mask)
        im.alpha_composite(fg)
        im.convert("RGB").save(f"logo_clean/{x}.png")
    else:
        base.save(f"logo_clean/{x}.png")
print("done")
