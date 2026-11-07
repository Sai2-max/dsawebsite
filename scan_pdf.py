import re
data = open(r"D:\mid 2\CN\DSA+CHEAT+SHEET-compressed.pdf","rb").read()
for pat in [rb"/URI", rb"leetcode", rb"geeksforgeeks", rb"http", rb"/Annots", rb"/Link"]:
    print(pat, data.lower().count(pat.lower()))
