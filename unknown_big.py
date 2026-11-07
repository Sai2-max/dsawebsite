from PIL import Image, ImageDraw
import os
xs=[1076,1567,2316,3253,3554,3981,4485,4677,4846,5238,6833,6848,6874,6876,6896,6899,6909]
cell=620; cols=3
rows=(len(xs)+cols-1)//cols
sheet=Image.new("RGB",(cols*cell,rows*(cell+30)),(245,245,245)); d=ImageDraw.Draw(sheet)
for i,x in enumerate(xs):
    im=Image.open(f"logo_clean/{x}.png").convert("RGB")
    im=im.resize((im.width*8,im.height*8),Image.NEAREST)
    im.thumbnail((cell-40,cell-40),Image.LANCZOS)
    px=(i%cols)*cell; py=(i//cols)*(cell+30)
    sheet.paste(im,(px+(cell-im.width)//2,py+15))
    d.rectangle([px,py,px+cell-1,py+cell+29],outline=(200,200,200))
    d.text((px+10,py+cell+8),f"xref {x}",fill=(0,0,0))
sheet.save("unknown_logos_big.png")
print(sheet.size)
