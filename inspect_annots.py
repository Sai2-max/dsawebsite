import pypdf, json
p = r"D:\mid 2\CN\DSA+CHEAT+SHEET-compressed.pdf"
r = pypdf.PdfReader(p)
for i in [3,4,8]:
    page = r.pages[i]
    annots = page.get("/Annots", [])
    print("PAGE", i+1, "annots", len(annots))
    for a in annots[:12]:
        obj = a.get_object()
        print({k: obj.get(k) for k in ["/Subtype","/Rect","/A","/Contents"]})
    print()
