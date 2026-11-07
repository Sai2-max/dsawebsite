const query = `query { question(titleSlug: "two-sum") { title titleSlug difficulty } }`;
const r = await fetch('https://leetcode.com/graphql', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
    referer: 'https://leetcode.com/problems/two-sum/',
    origin: 'https://leetcode.com',
  },
  body: JSON.stringify({ query }),
});
console.log(r.status);
console.log(await r.text());
