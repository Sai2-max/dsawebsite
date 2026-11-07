import pymupdf, json
p = r"D:\mid 2\CN\DSA+CHEAT+SHEET-compressed.pdf"
doc = pymupdf.open(p)
page = doc[3]
print("rect", page.rect)
print("TEXT")
for b in page.get_text("dict")["blocks"]:
    if b["type"]==0:
        for l in b["lines"]:
            txt = "".join(s["text"] for s in l["spans"]).strip()
            if txt:
                print([round(x,1) for x in l["bbox"]], repr(txt))
print("\nIMAGES")
for info in page.get_image_info(xrefs=True):
    print(info["xref"], [round(x,1) for x in info["bbox"]], info["width"], info["height"])
print("\nLINKS")
for l in page.get_links():
    print(l.get("from"), l.get("uri"))
