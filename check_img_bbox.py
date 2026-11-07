import pymupdf
doc = pymupdf.open(r"D:\mid 2\CN\DSA+CHEAT+SHEET-compressed.pdf")
for pi in [36]:
    page=doc[pi]
    print("page rect", page.rect, "rotation", page.rotation)
    for info in page.get_image_info(xrefs=True):
        print(info["xref"], [round(v,1) for v in info["bbox"]], info["width"], info["height"])
