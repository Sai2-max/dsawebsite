from PIL import Image, ImageDraw
import glob, os, math
files = sorted(glob.glob("pdf_images_png/*.png"))
thumb = 140
cols = 7
rows = math.ceil(len(files)/cols)
W = cols*thumb; H = rows*(thumb+22)
sheet = Image.new("RGB",(W,H),(250,250,250))
d = ImageDraw.Draw(sheet)
for idx,f in enumerate(files):
    im = Image.open(f).convert("RGB")
    im.thumbnail((thumb-10, thumb-10), Image.LANCZOS)
    x = (idx%cols)*thumb; y=(idx//cols)*(thumb+22)
    sheet.paste(im,(x+5,y+5))
    d.rectangle([x,y,x+thumb-1,y+thumb+21], outline=(220,220,220))
    label = os.path.basename(f).replace(".png","")[:22]
    d.text((x+4,y+thumb+4), label, fill=(0,0,0))
sheet.save("logo_sheet.png")
print("saved", sheet.size, len(files))
