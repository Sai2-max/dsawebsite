import json
d=json.load(open('parsed_raw.json',encoding='utf-8'))
with open('problems_dump.txt','w',encoding='utf-8') as f:
    for p in d['problems']:
        f.write("%3d | %s | %s | %s | %s\n" % (p['number'],p['topic'],p['subtopic'],p['title'],p['url']))
print('ok')
