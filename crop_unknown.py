import pymupdf, json
D=json.load(open("parsed_raw.json",encoding="utf-8"))
doc=pymupdf.open(r"D:\mid 2\CN\DSA+CHEAT+SHEET-compressed.pdf")
xs=[1076,3554,4485,4677,4846,5238,6909,3253,6874]
for x in xs:
    p=next(pp for pp in D["problems"] if x in pp["logoXrefs"])
    page=doc[p["pdfPage"]-1]
    # crop asked in column around row: find image bbox
    infos=[i for i in page.get_image_info(xrefs=True) if i["xref"]==x]
    bb=infos[0]["bbox"]
    cy=(p["pdfPage"] and ((bb[1]+bb[3])/2))
    clip=pymupdf.Rect(760, cy-70, 1010, cy+70)
    pix=page.get_pixmap(matrix=pymupdf.Matrix(5,5), clip=clip, alpha=False)
    fn=f"crop_{x}.png"; pix.save(fn); print(fn, p["number"], p["title"], pix.width, pix.height)
