import json
D=json.load(open("parsed_raw.json",encoding="utf-8"))
unknown=[1076,1567,2316,3253,3554,3981,4485,4677,4846,5238,6833,6848,6874,6876,6896,6899,6909]
for x in unknown:
    rows=[p for p in D["problems"] if x in p["logoXrefs"]]
    print("="*20,x,"count",len(rows))
    for p in rows[:8]:
        print(p["number"],p["title"],"|",p["topic"],"/",p["subtopic"],"| page",p["pdfPage"],"| alllogos",p["logoXrefs"])
