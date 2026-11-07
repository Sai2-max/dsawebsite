from pathlib import Path
p=Path('src/pages/Library.tsx')
s=p.read_text(encoding='utf-8')
s=s.replace("  ArrowUpDown,\n","").replace("  Check,\n","")
p.write_text(s,encoding='utf-8')
print('ok')
