from PIL import Image, ImageDraw
import os, math
files=sorted([f for f in os.listdir("logo_xrefs2") if f.endswith(".png")], key=lambda x:int(x[:-4]))
items=[]
for f in files:
    x=int(f[:-4]); im=Image.open("logo_xrefs2/"+f).convert("RGB"); items.append((x,im))
cell=260; cols=5; per_sheet=20
for si in range(0,len(items),per_sheet):
    chunk=items[si:si+per_sheet]
    rows=math.ceil(len(chunk)/cols)
    sheet=Image.new("RGB",(cols*cell,rows*(cell+24)),(245,245,245)); d=ImageDraw.Draw(sheet)
    for i,(x,im) in enumerate(chunk):
        im2=im.copy(); im2.thumbnail((cell-30,cell-30),Image.LANCZOS)
        px=(i%cols)*cell; py=(i//cols)*(cell+24)
        sheet.paste(im2,(px+(cell-im2.width)//2,py+10))
        d.rectangle([px,py,px+cell-1,py+cell+23],outline=(200,200,200))
        d.text((px+8,py+cell+4),f"xref {x}",fill=(0,0,0))
    fn=f"logo_detail_{si//per_sheet+1}.png"; sheet.save(fn); print(fn,sheet.size)
