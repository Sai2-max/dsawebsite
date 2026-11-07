import pypdf, os, hashlib
p = r"D:\mid 2\CN\DSA+CHEAT+SHEET-compressed.pdf"
r = pypdf.PdfReader(p)
os.makedirs("pdf_images", exist_ok=True)
seen = {}
count = 0
for pi, page in enumerate(r.pages):
    try:
        imgs = list(page.images)
    except Exception as e:
        print("err page", pi+1, e); continue
    print("page", pi+1, "images", len(imgs))
    for ii, img in enumerate(imgs):
        data = img.data
        h = hashlib.md5(data).hexdigest()[:10]
        ext = os.path.splitext(img.name)[1] or ".bin"
        if h not in seen:
            fn = f"pdf_images/p{pi+1:02d}_{ii:02d}_{h}{ext}"
            with open(fn,"wb") as f: f.write(data)
            seen[h]=fn
            count += 1
print("unique saved", count)
