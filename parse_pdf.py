import pymupdf, json, re, os, collections
from datetime import datetime

PDF = r"D:\mid 2\CN\DSA+CHEAT+SHEET-compressed.pdf"
doc = pymupdf.open(PDF)

# manual topic heading map keyed by page (physical 1-based) -> (source number, source name)
TOPIC_BY_PAGE = {
 4:"01|ARRAYS", 9:"02|Binary Search", 10:"03|Sorting", 11:"04|Hashing",
 13:"05|Linked Lists", 15:"06|Stack and Queue", 17:"07|Heap",
 18:"07|Recursion & Backtracking", 20:"08|Trees", 23:"09|Trees II",
 26:"10|GRAPHS", 30:"10|Greedy", 31:"10|Dynamic Programming",
 37:"11|MATH", 39:"11|Miscellaneous",
}

def clean(s):
    s = s.replace('\u2019', "'").replace('\u2018', "'")
    s = s.replace('\u201c','"').replace('\u201d','"')
    s = s.replace('\ufffd','')
    s = re.sub(r'\s+', ' ', s).strip()
    return s

problems=[]
topics=[]
cur_topic=None
cur_sub=None
seq=0
for pi in range(3, 40):  # pages 4-40
    page=doc[pi]
    lines=[]
    for b in page.get_text("dict")["blocks"]:
        if b["type"]!=0: continue
        for l in b["lines"]:
            text=clean("".join(s["text"] for s in l["spans"]))
            if not text: continue
            sizes=[round(s["size"],1) for s in l["spans"]]
            lines.append({"text":text,"bbox":l["bbox"],"size":max(sizes)})
    lines.sort(key=lambda x:(round(x["bbox"][1],1), x["bbox"][0]))
    # topic heading detection
    if (pi+1) in TOPIC_BY_PAGE:
        num,name=TOPIC_BY_PAGE[pi+1].split("|",1)
        cur_topic={"sourceNumber":num,"name":name,"pdfPage":pi+1,"order":len(topics)+1}
        topics.append(cur_topic)
        cur_sub=None
    # subtopics before rows
    for l in lines:
        if l["size"] >= 27.5 and l["bbox"][0] < 80 and l["bbox"][1] < 1200 and "#" not in l["text"] and "BOSSCODER" not in l["text"]:
            # exclude topic headings (they are size 40 and at x>=220, so x<80 only subtopics)
            if l["text"] not in ("A C A D E M Y",) and not re.fullmatch(r'\d{1,3}', l["text"]):
                cur_sub=l["text"]
    # image logos by page
    imgs=[]
    for info in page.get_image_info(xrefs=True):
        bb=info["bbox"]
        if bb[0] >= 800 and info["xref"] > 0:
            imgs.append({"xref":info["xref"],"bbox":bb})
    links=[]
    for lk in page.get_links():
        if lk.get("uri"):
            r=lk["from"]
            links.append({"uri":lk["uri"],"rect":r,"cy":(r.y0+r.y1)/2})
    links.sort(key=lambda x:x["cy"])
    for lk in links:
        cy=lk["cy"]
        # number line
        num_cands=[l for l in lines if l["size"]>=23 and 90<=l["bbox"][0]<=160 and re.fullmatch(r'\d{1,3}', l["text"]) and abs((l["bbox"][1]+l["bbox"][3])/2-cy)<70]
        if not num_cands:
            print("NO NUMBER page",pi+1,"cy",cy,lk["uri"]); continue
        num_line=min(num_cands, key=lambda l:abs((l['bbox'][1]+l['bbox'][3])/2-cy))
        # title lines
        tl=[l for l in lines if 225<=l["bbox"][0]<=570 and l["size"]>=23 and abs((l["bbox"][1]+l["bbox"][3])/2-cy)<70]
        tl.sort(key=lambda l:l["bbox"][1])
        title=clean(" ".join(l["text"] for l in tl))
        # logo imgs
        rowimgs=[im for im in imgs if abs(((im["bbox"][1]+im["bbox"][3])/2)-cy)<70]
        rowimgs.sort(key=lambda im:im["bbox"][0])
        seq+=1
        problems.append({
            "seq":seq,
            "number":int(num_line["text"]),
            "numberText":num_line["text"],
            "title":title,
            "topic":cur_topic["name"] if cur_topic else "UNKNOWN",
            "topicSourceNumber":cur_topic["sourceNumber"] if cur_topic else "",
            "subtopic":cur_sub or "General",
            "pdfPage":pi+1,
            "printedPage":pi,  # footer shows page index (0-based for physical page 4 => 3)
            "platform":"LeetCode" if "leetcode.com" in lk["uri"] else ("GeeksforGeeks" if "geeksforgeeks.org" in lk["uri"] else "Other"),
            "url":lk["uri"],
            "logoXrefs":[im["xref"] for im in rowimgs],
        })

print("problems",len(problems))
print("numbers unique",len(set(p['number'] for p in problems)))
print("first",problems[0]['number'],problems[0]['title'],"last",problems[-1]['number'],problems[-1]['title'])
missing_nums=[n for n in range(1,212) if n not in set(p['number'] for p in problems)]
print("missing numbers",missing_nums)
print("duplicate numbers",[k for k,v in collections.Counter(p['number'] for p in problems).items() if v>1])
print("titles empty",[p['seq'] for p in problems if not p['title']])
print("platforms",collections.Counter(p['platform'] for p in problems))
print("topics",[(t['order'],t['sourceNumber'],t['name']) for t in topics])
print("subtopics",collections.Counter((p['topic'],p['subtopic']) for p in problems))
print("unassigned",[p for p in problems if p['topic']=='UNKNOWN'])
# duplicate title/url
for key in ['title','url']:
    c=collections.Counter((p[key].lower() if key=='title' else p[key]) for p in problems)
    print("dupe",key,[(k,v) for k,v in c.items() if v>1])
json.dump({"problems":problems,"topics":topics},open("parsed_raw.json","w",encoding="utf-8"),ensure_ascii=False,indent=2)
print("wrote parsed_raw.json")
