import fs from 'fs';

const data = JSON.parse(fs.readFileSync('parsed_raw.json', 'utf8'));
const problems = data.problems;
const leet = problems.filter((p) => p.platform === 'LeetCode');
const slugs = [...new Set(leet.map((p) => {
  const m = p.url.match(/leetcode\.com\/problems\/([^/]+)/);
  return m ? m[1] : null;
}).filter(Boolean))];

const results = {};
const chunkSize = 15;
for (let i = 0; i < slugs.length; i += chunkSize) {
  const chunk = slugs.slice(i, i + chunkSize);
  const parts = chunk.map((slug, j) => `q${j}: question(titleSlug: ${JSON.stringify(slug)}) { title titleSlug difficulty }`).join('\n');
  const query = `query {\n${parts}\n}`;
  let ok = false;
  for (let attempt = 0; attempt < 3 && !ok; attempt++) {
    try {
      const r = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
          referer: 'https://leetcode.com/problems/' + chunk[0] + '/',
          origin: 'https://leetcode.com',
        },
        body: JSON.stringify({ query }),
      });
      const body = await r.json();
      if (body.data) {
        for (let j = 0; j < chunk.length; j++) {
          const q = body.data[`q${j}`];
          results[chunk[j]] = q ? { status: 'verified', officialTitle: q.title, difficulty: q.difficulty } : { status: 'missing' };
        }
        ok = true;
        console.log(`checked ${i + chunk.length}/${slugs.length}`);
      } else {
        console.log('bad body', r.status, JSON.stringify(body).slice(0, 300));
      }
    } catch (e) {
      console.log('retry', attempt, e.message);
    }
    if (!ok) await new Promise((res) => setTimeout(res, 1000 * (attempt + 1)));
  }
  await new Promise((res) => setTimeout(res, 350));
}

// GeeksforGeeks live checks
const gfg = problems.filter((p) => p.platform === 'GeeksforGeeks');
for (const p of gfg) {
  try {
    const r = await fetch(p.url, {
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36' },
    });
    results[p.url] = { status: r.ok ? 'verified' : `http_${r.status}`, finalUrl: r.url, httpStatus: r.status };
    console.log('GFG', p.number, r.status);
  } catch (e) {
    results[p.url] = { status: 'error', error: e.message };
    console.log('GFG ERR', p.number, e.message);
  }
}

fs.writeFileSync('link_validation.json', JSON.stringify({ checkedAt: new Date().toISOString(), slugs: results }, null, 2));
console.log('done', Object.keys(results).length);
