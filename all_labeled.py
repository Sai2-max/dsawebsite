from PIL import Image, ImageDraw, ImageFont
import os, math
files=sorted([f for f in os.listdir("logo_clean") if f.endswith(".png")], key=lambda x:int(x[:-4]))
cellw=600; cellh=360; cols=2; per=6
font=ImageFont.truetype("C:/Windows/Fonts/arial.ttf",28)
try: small=ImageFont.truetype("C:/Windows/Fonts/arial.ttf",20)
except: small=font
for si in range(0,len(files),per):
    chunk=files[si:si+per]; rows=math.ceil(len(chunk)/cols)
    sheet=Image.new("RGB",(cols*cellw,rows*cellh),(248,248,248)); d=ImageDraw.Draw(sheet)
    for i,f in enumerate(chunk):
        x=int(f[:-4]); im=Image.open("logo_clean/"+f).convert("RGB")
        im=im.resize((im.width*6,im.height*6),Image.NEAREST); im.thumbnail((cellw-80,cellh-120),Image.LANCZOS)
        px=(i%cols)*cellw; py=(i//cols)*cellh
        d.rectangle([px,py,px+cellw-1,py+cellh-1],outline=(190,190,190))
        d.text((px+14,py+14),f"xref {x}",font=font,fill=(0,0,0))
        sheet.paste(im,(px+(cellw-im.width)//2,py+70))
    fn=f"all_labeled_{si//per+1}.png"; sheet.save(fn); print(fn)
