import pymupdf
doc = pymupdf.open(r"D:\mid 2\CN\DSA+CHEAT+SHEET-compressed.pdf")
for p in [4,5,24,41]:
    page = doc[p-1]
    pix = page.get_pixmap(matrix=pymupdf.Matrix(2,2), alpha=False)
    pix.save(f"page_{p:02d}.png")
    print("saved", p, pix.width, pix.height)
