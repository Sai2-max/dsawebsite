import pymupdf
doc = pymupdf.open(r"D:\mid 2\CN\DSA+CHEAT+SHEET-compressed.pdf")
for pi in [4,8,10,22,25,30]:
    page = doc[pi]
    print("="*20,"PAGE",pi+1,"="*20)
    for b in page.get_text("dict")["blocks"]:
        if b["type"]!=0: continue
        for l in b["lines"]:
            txt = "".join(s["text"] for s in l["spans"]).strip()
            if not txt: continue
            sizes = sorted({round(s["size"],1) for s in l["spans"]})
            fonts = sorted({s["font"] for s in l["spans"]})
            print([round(v,1) for v in l["bbox"]], sizes, fonts[:2], repr(txt[:80]))
