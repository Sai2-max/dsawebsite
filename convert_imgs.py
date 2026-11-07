from PIL import Image
import glob, os
files = sorted(glob.glob("pdf_images/*.jp2"))
print(len(files))
os.makedirs("pdf_images_png", exist_ok=True)
for f in files:
    try:
        im = Image.open(f)
        print(f, im.size, im.mode)
        im.convert("RGBA").save("pdf_images_png/" + os.path.basename(f).replace(".jp2",".png"))
    except Exception as e:
        print("ERR", f, e)
