import json
d=json.load(open('parsed_raw.json',encoding='utf-8'))
bad=[p for p in d['problems'] if '..' in p['title'] or '#' in p['title'] or len(p['title'])<3]
print('suspect',len(bad))
for p in bad: print(p['number'],'|',p['title'],'|',p['url'])
