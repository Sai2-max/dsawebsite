from pathlib import Path
p=Path('src/pages/Today.tsx')
s=p.read_text(encoding='utf-8')
s=s.replace("  Flame,\n","").replace("import { formatDateLong, formatMinutes, relativeDueLabel } from '../lib/dates';","import { formatDateLong, formatMinutes } from '../lib/dates';").replace("import { Button } from '../components/ui/Button';\n","")
p.write_text(s,encoding='utf-8')
print('done')
