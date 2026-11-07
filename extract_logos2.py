import pymupdf, os, collections, io, math
from PIL import Image, ImageDraw
doc = pymupdf.open(r"D:\mid 2\CN\DSA+CHEAT+SHEET-compressed.pdf")
counts = collections.Counter(); placements=collections.defaultdict(list)
for pi in range(3, 40):
    page=doc[pi]
    for info in page.get_image_info(xrefs=True):
        bb=info["bbox"]
        if bb[0] >= 800 and info["xref"]>0:
            counts[info["xref"]]+=1; placements[info["xref"]].append((pi+1,round(bb[1],1),round(bb[0],1)))
print("unique",len(counts))
for x,c in counts.most_common(): print(x,c,placements[x][:2])
os.makedirs("logo_xrefs2",exist_ok=True)
items=[]
for x,c in counts.most_common():
    data=doc.extract_image(x); img=Image.open(io.BytesIO(data["image"])).convert("RGB")
    img.save(f"logo_xrefs2/{x}.png"); items.append((x,c,img.copy()))
thumb=200; cols=5; rows=math.ceil(len(items)/cols)
sheet=Image.new("RGB",(cols*thumb,rows*(thumb+28)),(250,250,250)); d=ImageDraw.Draw(sheet)
for i,(x,c,img) in enumerate(items):
    im=img.copy(); im.thumbnail((thumb-18,thumb-18),Image.LANCZOS)
    px=(i%cols)*thumb; py=(i//cols)*(thumb+28)
    sheet.paste(im,(px+9,py+9)); d.rectangle([px,py,px+thumb-1,py+thumb+27],outline=(210,210,210))
    d.text((px+5,py+thumb+7),f"xref {x} n={c}",fill=(0,0,0))
sheet.save("logo_xrefs_sheet2.png")
print(sheet.size)
