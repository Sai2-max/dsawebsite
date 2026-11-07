from PIL import Image, ImageDraw, ImageFont
import json, os
D=json.load(open("parsed_raw.json",encoding="utf-8"))
xs=[1076,1567,2316,3253,3554,3981,4485,4677,4846,5238,6833,6848,6874,6876,6896,6899,6909]
ctx={}
for x in xs:
    rows=[p for p in D["problems"] if x in p["logoXrefs"]]
    p=rows[0]
    ctx[x]=f"#{p['number']} {p['title'][:32]}"
cellw=760; cellh=380; cols=2; per=6
try:
    font=ImageFont.truetype("C:/Windows/Fonts/arial.ttf",22)
    small=ImageFont.truetype("C:/Windows/Fonts/arial.ttf",16)
except:
    font=ImageFont.load_default(); small=font
for si in range(0,len(xs),per):
    chunk=xs[si:si+per]; rows= (len(chunk)+cols-1)//cols
    sheet=Image.new("RGB",(cols*cellw,rows*cellh),(250,250,250)); d=ImageDraw.Draw(sheet)
    for i,x in enumerate(chunk):
        im=Image.open(f"logo_clean/{x}.png").convert("RGB")
        im=im.resize((im.width*8,im.height*8),Image.NEAREST); im.thumbnail((cellw-80,cellh-130),Image.LANCZOS)
        px=(i%cols)*cellw; py=(i//cols)*cellh
        d.rectangle([px,py,px+cellw-1,py+cellh-1],outline=(190,190,190))
        d.text((px+14,py+10),f"xref {x}",font=font,fill=(0,0,0))
        d.text((px+14,py+40),ctx[x],font=small,fill=(80,80,80))
        sheet.paste(im,(px+(cellw-im.width)//2,py+80))
    fn=f"unknown_labeled_{si//per+1}.png"; sheet.save(fn); print(fn,sheet.size)
