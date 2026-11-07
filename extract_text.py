import pypdf
p = r"D:\mid 2\CN\DSA+CHEAT+SHEET-compressed.pdf"
r = pypdf.PdfReader(p)
out = []
for i, page in enumerate(r.pages):
    t = page.extract_text() or ""
    out.append("\n\n" + "="*30 + f" PAGE {i+1} " + "="*30 + "\n" + t)
open("pdf_text.txt","w",encoding="utf-8").write("".join(out))
print("wrote", sum(len(x) for x in out))
