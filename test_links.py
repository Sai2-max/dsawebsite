import requests
urls=[
'https://leetcode.com/problems/two-sum/description/',
'https://leetcode.com/problems/richest-customer-wealth/',
'https://www.geeksforgeeks.org/problems/inversion-of-array-1587115620/1',
]
h={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36'}
for u in urls:
    try:
        r=requests.get(u,headers=h,timeout=15,allow_redirects=True)
        print(r.status_code, len(r.content), r.url)
    except Exception as e:
        print('ERR',e,u)
