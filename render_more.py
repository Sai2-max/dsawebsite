import pymupdf
doc = pymupdf.open(r"D:\mid 2\CN\DSA+CHEAT+SHEET-compressed.pdf")
for p in [6,7,8,10,12,17,20,21,26,27,29,30,37,39,40]:
    page=doc[p-1]; pix=page.get_pixmap(matrix=pymupdf.Matrix(2,2), alpha=False); pix.save(f"page_{p:02d}.png")
print("done")
