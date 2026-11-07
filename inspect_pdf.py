import pypdf, os, json
p = r"D:\mid 2\CN\DSA+CHEAT+SHEET-compressed.pdf"
r = pypdf.PdfReader(p)
print("pages", len(r.pages))
print("metadata", r.metadata)
for i, page in enumerate(r.pages[:3]):
    t = page.extract_text() or ""
    print("="*30, "PAGE", i+1, "="*30)
    print(t[:3000])
    print("ANNOTS", len(page.get("/Annots", [])))
