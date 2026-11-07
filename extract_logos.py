import pymupdf, os, collections
from PIL import Image, ImageDraw
import io, math
doc = pymupdf.open(r"D:\mid 2\CN\DSA+CHEAT+SHEET-compressed.pdf")
counts = collections.Counter()
placements = collections.defaultdict(list)
for pi in range(3, 40):
    page = doc[pi]
    for info in page.get_image_info(xrefs=True):
        bbox = info["bbox"]
        if bbox[0] > 700 and info["xref"] > 0:
            counts[info["xref"]] += 1
            placements[info["xref"]].append((pi+1, round(bbox[1],1), round(bbox[0],1), info["width"], info["height"]))
print("unique logos", len(counts))
for x,c in counts.most_common():
    print(x, c, placements[x][:2], doc.extract_image(x)["width"], doc.extract_image(x)["height"])
os.makedirs("logo_xrefs", exist_ok=True)
items=[]
for x,c in counts.most_common():
    data = doc.extract_image(x)
    ext=data["ext"]; img=Image.open(io.BytesIO(data["image"])).convert("RGB")
    fn=f"logo_xrefs/{x}.png"; img.save(fn)
    items.append((x,c,img.copy()))
# contact sheet
thumb=170; cols=6; rows=math.ceil(len(items)/cols)
sheet=Image.new("RGB",(cols*thumb, rows*(thumb+26)),(255,255,255)); d=ImageDraw.Draw(sheet)
for i,(x,c,img) in enumerate(items):
    im=img.copy(); im.thumbnail((thumb-14,thumb-14), Image.LANCZOS)
    px=(i%cols)*thumb; py=(i//cols)*(thumb+26)
    sheet.paste(im,(px+7,py+7))
    d.rectangle([px,py,px+thumb-1,py+thumb+25],outline=(210,210,210))
    d.text((px+4,py+thumb+5), f"xref {x} n={c}", fill=(0,0,0))
sheet.save("logo_xrefs_sheet.png")
print("sheet", sheet.size)
