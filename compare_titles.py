import json, re, difflib

data = json.load(open('parsed_raw.json', encoding='utf-8'))
val = json.load(open('link_validation.json', encoding='utf-8'))['slugs']

def norm(s):
    s = s.lower()
    s = s.replace('&', 'and')
    s = re.sub(r'[^a-z0-9 ]+', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()

flagged = []
for p in data['problems']:
    if p['platform'] != 'LeetCode':
        continue
    slug = re.search(r'problems/([^/]+)', p['url']).group(1)
    meta = val[slug]
    official = meta.get('officialTitle', '')
    a, b = norm(p['title'].replace('..', '')), norm(official)
    ratio = difflib.SequenceMatcher(None, a, b).ratio()
    if ratio < 0.86:
        flagged.append((p['number'], p['title'], official, round(ratio, 2), p['url']))

print('flagged', len(flagged))
for x in flagged:
    print(x)
