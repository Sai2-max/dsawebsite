import json, collections, hashlib, re, datetime

raw = json.load(open('parsed_raw.json', encoding='utf-8'))
val = json.load(open('link_validation.json', encoding='utf-8'))['slugs']

with open(r'D:\mid 2\CN\DSA+CHEAT+SHEET-compressed.pdf', 'rb') as f:
    sha = hashlib.sha256(f.read()).hexdigest()

COMPANY = {
    710: 'Deloitte', 712: 'Yahoo', 901: 'Lyft', 1078: 'Myntra', 1563: 'Spotify',
    1567: 'Atlassian', 2134: 'Bloomberg', 2316: 'Swiggy', 2318: 'Nike', 3253: 'Alteryx',
    3979: 'Slice', 3981: 'Reddit', 4175: 'Snowflake', 4335: 'Stripe', 4485: 'Blinkit',
    4677: 'Accenture', 5073: 'Bolt', 5238: 'DE Shaw', 5240: 'Pinterest', 5596: 'Zeta',
    5874: 'Capital One', 5877: 'Quora', 6276: 'Yahoo', 6803: 'Adobe', 6805: 'Salesforce',
    6807: 'Microsoft', 6809: 'Amazon', 6811: 'Meta', 6813: 'Google', 6819: 'Facebook',
    6823: 'Apple', 6825: 'Uber', 6827: 'LinkedIn', 6829: 'Goldman Sachs', 6831: 'Nvidia',
    6833: 'PayPal', 6837: 'Oracle', 6839: 'TikTok', 6841: 'Netflix', 6843: 'Visa',
    6846: 'Zomato', 6848: 'Zoho', 6854: 'PayPal', 6856: 'Agoda', 6858: 'Wix',
    6860: 'JPMorgan', 6863: 'Morgan Stanley', 6865: 'X', 6870: 'Intuit', 6874: 'Alteryx',
    6876: 'Paytm', 6879: 'Grammarly', 6882: 'Bloomberg', 6884: 'Walmart Labs',
    6886: 'Pinterest', 6888: 'Atlassian', 6896: 'PhonePe', 6899: 'Flipkart',
    6902: 'Samsung', 6911: 'Airbnb', 6913: 'DE Shaw',
}
UNVERIFIED = {1076, 3554, 4846}
MEDIUM = {6909: 'Myntra'}  # app-icon variant, visually identified

TITLE_FIX = {
    22: 'Number of Sub-arrays of Size K and Average Greater than or Equal to Threshold',
    145: 'Find the City With the Smallest Number of Neighbors at a Threshold Distance',
    166: 'Partition Equal Subset Sum',
    195: 'Excel Sheet Column Title',
}

def company_for(xref):
    if xref in UNVERIFIED:
        return None
    if xref in MEDIUM:
        return {'name': MEDIUM[xref], 'confidence': 'medium', 'xref': xref}
    if xref in COMPANY:
        return {'name': COMPANY[xref], 'confidence': 'high', 'xref': xref}
    raise SystemExit(f'UNMAPPED XREF {xref}')

def canonical_url(url):
    return re.sub(r'/description/?$', '', url.rstrip('/')).lower()

problems = []
title_groups = collections.defaultdict(list)
url_groups = collections.defaultdict(list)
for p in raw['problems']:
    title_groups[p['title'].lower()].append(p['number'])
    url_groups[canonical_url(p['url'])].append(p['number'])

canonical = {}
for key, nums in url_groups.items():
    for n in nums:
        canonical[n] = min(nums)

for p in raw['problems']:
    source_title = p['title']
    title = TITLE_FIX.get(p['number'], source_title)
    slug = None
    m = re.search(r'leetcode\.com/problems/([^/]+)', p['url'])
    if m:
        slug = m.group(1)
        assert val[slug]['status'] == 'verified'
    else:
        assert val[p['url']]['status'] == 'verified'
    companies = []
    seen = set()
    unverified_count = 0
    for x in p['logoXrefs']:
        c = company_for(x)
        if not c:
            unverified_count += 1
            continue
        key = c['name'].lower()
        if key not in seen:
            seen.add(key)
            companies.append({'name': c['name'], 'confidence': c['confidence']})
    dup_titles = [n for n in title_groups[p['title'].lower()] if n != p['number']]
    dup_urls = [n for n in url_groups[canonical_url(p['url'])] if n != p['number']]
    q = p['title'].replace(' ', '+')
    problems.append({
        'id': f'p{p["number"]:03d}',
        'number': p['number'],
        'numberText': p['numberText'],
        'title': title,
        'sourceTitle': source_title,
        'titleCorrected': title != source_title,
        'topicId': f't{p["topicOrder"]:02d}',
        'topic': p['topic'],
        'topicSourceNumber': p['topicSourceNumber'],
        'topicOrder': p['topicOrder'],
        'subtopic': p['subtopic'],
        'pdfPage': p['pdfPage'],
        'printedPage': p['printedPage'],
        'platform': p['platform'],
        'url': p['url'],
        'canonicalId': f'p{canonical[p["number"]]:03d}',
        'canonicalNumber': canonical[p['number']],
        'duplicateNumbers': [n for n in url_groups[canonical_url(p['url'])] if n != p['number']],
        'linkStatus': 'verified',
        'linkCheckedAt': '2026-10-27',
        'searchUrl': 'https://www.google.com/search?q=' + '{}+{}'.format(p['platform'], q.replace('#', '')),
        'companies': companies,
        'unverifiedLogoCount': unverified_count,
        'duplicateTitleNumbers': dup_titles,
        'duplicateUrlNumbers': dup_urls,
    })

topics = []
for t in raw['topics']:
    count = sum(1 for p in problems if p['topicOrder'] == t['order'])
    topics.append({
        'id': f't{t["order"]:02d}',
        'sourceNumber': t['sourceNumber'],
        'name': t['name'],
        'order': t['order'],
        'pdfPage': t['pdfPage'],
        'problemCount': count,
    })

corrections = [{'number': p['number'], 'sourceTitle': p['sourceTitle'], 'title': p['title']}
               for p in problems if p['titleCorrected']]
unverified_rows = [{'number': p['number'], 'title': p['title'], 'logoCount': p['unverifiedLogoCount']}
                   for p in problems if p['unverifiedLogoCount']]
assert len(problems) == 211
assert [p['number'] for p in problems] == list(range(1, 212))
assert len(topics) == 15
assert sum(p['unverifiedLogoCount'] for p in problems) == 3
assert not any('BeTheBoss' in p['title'] for p in problems)
unique_ids = {p['canonicalId'] for p in problems}
assert len(unique_ids) == 204

payload = {
    'meta': {
        'sourceFile': 'DSA+CHEAT+SHEET-compressed.pdf',
        'sourceSha256': sha,
        'sheetTitle': 'Bosscoder DSA Sheet',
        'totalProblems': len(problems),
        'uniqueProblems': len(unique_ids),
        'topicCount': len(topics),
        'pdfContentPages': [4, 40],
        'importedAt': datetime.datetime.now().isoformat(timespec='seconds'),
        'linksVerifiedAt': '2026-10-27',
        'linkVerification': '197 unique LeetCode slugs resolved via LeetCode GraphQL; 7 GeeksforGeeks URLs returned HTTP 200.',
        'duplicateTitleGroups': 7,
        'duplicateUrlGroups': 7,
    },
    'topics': topics,
    'problems': problems,
}
json.dump(payload, open('final_dataset.json', 'w', encoding='utf-8'), indent=2, ensure_ascii=False)

report = {
    'expectedProblems': 211,
    'importedProblems': len(problems),
    'uniqueProblems': len(unique_ids),
    'numbersContiguous': True,
    'topicsImported': len(topics),
    'platformCounts': dict(collections.Counter(p['platform'] for p in problems)),
    'linksPresent': sum(1 for p in problems if p['url']),
    'missingLinks': [],
    'linksVerified': sum(1 for p in problems if p['linkStatus'] == 'verified'),
    'linkFailures': [],
    'titleCorrections': corrections,
    'unverifiedLogoRows': unverified_rows,
    'companyAssociations': sum(len(p['companies']) for p in problems),
    'uniqueCompanies': len({c['name'] for p in problems for c in p['companies']}),
    'duplicateTitleGroups': {k: v for k, v in title_groups.items() if len(v) > 1},
    'duplicateUrlGroups': {k: v for k, v in url_groups.items() if len(v) > 1},
    'duplicateProblemsPreserved': True,
    'notes': [
        'All 211 numbered rows are retained, including duplicate titles and duplicate URLs.',
        'Seven rows point to an already-listed problem (after normalising /description/); unique-problem stats count those once.',
        'Company associations come only from logo images placed on each PDF row.',
        'Three logo marks could not be identified; they are counted as unverified and no company name was guessed.',
        'Four truncated/footer-contaminated PDF titles were expanded using the verified LeetCode title; sourceTitle retains the PDF text.',
        'Revision dates and all app dates use local calendar dates.',
    ],
}
json.dump(report, open('import_report.json', 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
print('problems', len(problems), 'unique', len(unique_ids), 'companies', report['companyAssociations'], 'unique companies', report['uniqueCompanies'])
print('topics', [(t['name'], t['problemCount']) for t in topics])
print('unverified', unverified_rows)
print('dups', {k: v for k, v in title_groups.items() if len(v) > 1})
print('url dups', {k: v for k, v in url_groups.items() if len(v) > 1})
print('sha', sha)
