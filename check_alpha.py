import pymupdf
doc=pymupdf.open(r"D:\mid 2\CN\DSA+CHEAT+SHEET-compressed.pdf")
for x in [2318,4335,4846,901,1076]:
    data=doc.extract_image(x)
    print(x, {k:v for k,v in data.items() if k!='image'})
    print("bytes",len(data["image"]))
