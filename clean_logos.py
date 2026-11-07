import pymupdf, io, os
from PIL import Image, ImageDraw
doc=pymupdf.open(r"D:\mid 2\CN\DSA+CHEAT+SHEET-compressed.pdf")
os.makedirs("logo_clean",exist_ok=True)
for fn in os.listdir("logo_xrefs2"):
    if not fn.endswith(".png"): continue
    x=int(fn[:-4]); data=doc.extract_image(x)
    pix=pymupdf.Pixmap(doc,x)
    if data.get("smask"):
        mask=pymupdf.Pixmap(doc,data["smask"])
        try:
            pix=pymupdf.Pixmap(pix,mask)
        except Exception as e:
            print("maskerr",x,e)
    if pix.n-pix.alpha<3: pix=pymupdf.Pixmap(pymupdf.csRGB,pix)
    png=pix.tobytes("png")
    im=Image.open(io.BytesIO(png)).convert("RGBA")
    bg=Image.new("RGBA",im.size,(255,255,255,255)); bg.alpha_composite(im)
    bg.convert("RGB").save(f"logo_clean/{x}.png")
print("done",len(os.listdir("logo_clean")))
