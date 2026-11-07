import pymupdf, json, re, collections
PDF = r"D:\mid 2\CN\DSA+CHEAT+SHEET-compressed.pdf"
doc = pymupdf.open(PDF)
TOPIC_BY_PAGE = {
 4:"01|ARRAYS", 9:"02|Binary Search", 10:"03|Sorting", 11:"04|Hashing",
 13:"05|Linked Lists", 15:"06|Stack and Queue", 17:"07|Heap",
 18:"07|Recursion & Backtracking", 20:"08|Trees", 23:"09|Trees II",
 26:"10|GRAPHS", 30:"10|Greedy", 31:"10|Dynamic Programming",
 37:"11|MATH", 39:"11|Miscellaneous",
}
def clean(s):
    s=s.replace('\u2019',"'").replace('\u2018',"'").replace('\u201c','"').replace('\u201d','"').replace('\ufffd','')
    return re.sub(r'\s+',' ',s).strip()

problems=[]; topics=[]; cur_topic=None; cur_sub=None; seq=0
for pi in range(3,40):
    page=doc[pi]
    lines=[]
    for b in page.get_text("dict")["blocks"]:
        if b["type"]!=0: continue
        for l in b["lines"]:
            text=clean("".join(s["text"] for s in l["spans"]))
            if not text: continue
            sizes=[round(s["size"],1) for s in l["spans"]]
            lines.append({"text":text,"bbox":l["bbox"],"size":max(sizes)})
    lines.sort(key=lambda x:(round(x["bbox"][1],1),x["bbox"][0]))
    if (pi+1) in TOPIC_BY_PAGE:
        num,name=TOPIC_BY_PAGE[pi+1].split("|",1)
        cur_topic={"sourceNumber":num,"name":name,"pdfPage":pi+1,"order":len(topics)+1}
        topics.append(cur_topic); cur_sub=None
    printed=None
    for l in lines:
        if l["size"]>=38 and l["bbox"][0]>950 and l["bbox"][1]>1200 and re.fullmatch(r'\d{1,3}', l["text"]):
            printed=int(l["text"])
    # all subtopic headings with y
    subheads=[l for l in lines if 27.5<=l["size"]<=28.5 and l["bbox"][0]<80 and l["bbox"][1]<1200 and not re.fullmatch(r'\d{1,3}',l["text"]) and l["text"] not in ("BOSSCODER","#BeTheBoss","A C A D E M Y")]
    imgs=[{"xref":info["xref"],"bbox":info["bbox"]} for info in page.get_image_info(xrefs=True) if info["bbox"][0]>=800 and info["xref"]>0]
    links=[]
    for lk in page.get_links():
        if lk.get("uri"):
            r=lk["from"]; links.append({"uri":lk["uri"],"rect":r,"cy":(r.y0+r.y1)/2})
    links.sort(key=lambda x:x["cy"])
    active_sub=cur_sub
    for lk in links:
        cy=lk["cy"]
        # apply headings above this row
        for h in subheads:
            if h["bbox"][1] < cy:
                active_sub=h["text"]
        cur_sub=active_sub
        num_cands=[l for l in lines if l["size"]>=23 and 90<=l["bbox"][0]<=160 and re.fullmatch(r'\d{1,3}',l["text"]) and abs((l["bbox"][1]+l["bbox"][3])/2-cy)<70]
        if not num_cands:
            print("NO NUMBER",pi+1,cy,lk["uri"]); continue
        num_line=min(num_cands,key=lambda l:abs((l["bbox"][1]+l["bbox"][3])/2-cy))
        tl=[l for l in lines if 225<=l["bbox"][0]<=570 and l["size"]>=23 and abs((l["bbox"][1]+l["bbox"][3])/2-cy)<70]
        tl.sort(key=lambda l:l["bbox"][1])
        title=clean(" ".join(l["text"] for l in tl))
        rowimgs=[im for im in imgs if abs(((im["bbox"][1]+im["bbox"][3])/2)-cy)<70]
        rowimgs.sort(key=lambda im:im["bbox"][0])
        seq+=1
        problems.append({
          "seq":seq,"number":int(num_line["text"]),"numberText":num_line["text"],"title":title,
          "topic":cur_topic["name"],"topicSourceNumber":cur_topic["sourceNumber"],
          "topicOrder":cur_topic["order"],"subtopic":cur_sub or "General",
          "pdfPage":pi+1,"printedPage":printed,"platform":"LeetCode" if "leetcode.com" in lk["uri"] else ("GeeksforGeeks" if "geeksforgeeks.org" in lk["uri"] else "Other"),
          "url":lk["uri"],"logoXrefs":[im["xref"] for im in rowimgs]
        })
print("problems",len(problems),"topics",len(topics))
print(collections.Counter((p['topic'],p['subtopic']) for p in problems))
print("empty titles",[p['seq'] for p in problems if not p['title']])
json.dump({"problems":problems,"topics":topics},open("parsed_raw.json","w",encoding="utf-8"),ensure_ascii=False,indent=2)
# rows with xrefs
for p in problems:
    if p['logoXrefs']:
        pass
print("unique xrefs",len(set(x for p in problems for x in p['logoXrefs'])))
print("missing logos rows",[p['number'] for p in problems if not p['logoXrefs']])
