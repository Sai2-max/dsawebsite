import pymupdf
doc=pymupdf.open(r"D:\mid 2\CN\DSA+CHEAT+SHEET-compressed.pdf")
for pi in [22,23,24]:
    page=doc[pi]
    print("="*20,"PAGE",pi+1)
    lines=[]
    for b in page.get_text("dict")["blocks"]:
        if b["type"]!=0: continue
        for l in b["lines"]:
            t="".join(s["text"] for s in l["spans"]).strip()
            if t: lines.append((round(l["bbox"][1],1),round(l["bbox"][0],1),round(l["bbox"][3],1),[round(s["size"],1) for s in l["spans"]],t))
    for ln in sorted(lines): print(ln)
    print("IMAGES")
    for info in sorted(page.get_image_info(xrefs=True), key=lambda i:(i["bbox"][1],i["bbox"][0])):
        print(info["xref"],[round(v,1) for v in info["bbox"]])
