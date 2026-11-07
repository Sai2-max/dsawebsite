from PIL import Image, ImageDraw
import os, math
files=sorted([f for f in os.listdir("logo_clean") if f.endswith(".png")], key=lambda x:int(x[:-4]))
items=[(int(f[:-4]),Image.open("logo_clean/"+f).convert("RGB")) for f in files]
cell=280; cols=4; per=16
for si in range(0,len(items),per):
    chunk=items[si:si+per]; rows=math.ceil(len(chunk)/cols)
    sheet=Image.new("RGB",(cols*cell,rows*(cell+26)),(245,245,245)); d=ImageDraw.Draw(sheet)
    for i,(x,im) in enumerate(chunk):
        im2=im.copy(); im2.thumbnail((cell-30,cell-30),Image.LANCZOS)
        px=(i%cols)*cell; py=(i//cols)*(cell+26)
        sheet.paste(im2,(px+(cell-im2.width)//2,py+10))
        d.rectangle([px,py,px+cell-1,py+cell+25],outline=(200,200,200))
        d.text((px+8,py+cell+6),f"xref {x}",fill=(0,0,0))
    fn=f"logo_clean_sheet_{si//per+1}.png"; sheet.save(fn); print(fn,sheet.size)
