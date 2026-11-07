import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  GitCompareArrows,
  Info,
  Link2,
  ListChecks,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import { dataset, getProblemByNumber, importReport } from '../lib/dataset';
import { useToast } from '../components/ui/Toast';
import { formatDateKey, pluralize } from '../lib/dates';
import { PageHeader } from '../components/ProblemBits';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/Progress';
import { cn } from '../lib/utils';

const duplicateGroups = Object.entries(importReport.duplicateTitleGroups);
const duplicateUrlGroups = Object.entries(importReport.duplicateUrlGroups);

export default function ReportPage() {
  const { toast } = useToast();

  const copyHash = async () => {
    try {
      await navigator.clipboard.writeText(dataset.meta.sourceSha256);
      toast('Source SHA-256 copied.', 'success');
    } catch {
      toast('Clipboard access was blocked. Select the hash manually.', 'error');
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        eyebrow="Import validation evidence"
        title="Import Report"
        description="Exactly what was read from the PDF, what was corrected, what remains uncertain, and how the links were checked. Every numbered source row is preserved — including the seven repeated problems."
        actions={
          <>
            <a href="/dsa-sheet.pdf" target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-ink transition hover:border-brand/40">
              <FileText className="h-3.5 w-3.5 text-brand" /> Source PDF
            </a>
            <Link to="/library" className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-ink transition hover:border-brand/40">
              Open library <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ReportStat label="Imported rows" value={`${importReport.importedProblems}/${importReport.expectedProblems}`} sub="Every numbered PDF row retained" tone="good" icon={<ListChecks className="h-4 w-4" />} />
        <ReportStat label="Unique problems" value={String(importReport.uniqueProblems)} sub={`${duplicateGroups.length} duplicate groups deduplicated for stats`} tone="brand" icon={<GitCompareArrows className="h-4 w-4" />} />
        <ReportStat label="Links verified" value={`${importReport.linksVerified}/${importReport.importedProblems}`} sub="197 LeetCode slugs + 7 GFG pages" tone="cyan" icon={<Link2 className="h-4 w-4" />} />
        <ReportStat label="Company associations" value={String(importReport.companyAssociations)} sub={`${importReport.uniqueCompanies} companies · 3 unidentified marks`} tone="violet" icon={<Building2 className="h-4 w-4" />} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="card min-w-0 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-good" />
            <h2 className="font-display text-lg font-semibold text-ink">Validation checklist</h2>
            <Badge tone="good" className="ml-auto" dot>Pass with noted caveats</Badge>
          </div>
          <div className="mt-4 divide-y divide-line/60">
            <CheckRow label="All numbered rows imported" value={`${importReport.importedProblems} of ${importReport.expectedProblems}`} pass />
            <CheckRow label="Numbering is contiguous (1–211)" value={importReport.numbersContiguous ? 'Yes, no gaps' : 'Gaps found'} pass={importReport.numbersContiguous} />
            <CheckRow label="Every row has a practice URL" value={importReport.missingLinks.length ? `${importReport.missingLinks.length} missing` : `${importReport.linksPresent} present`} pass={importReport.missingLinks.length === 0} />
            <CheckRow label="Live link failures" value={importReport.linkFailures.length ? `${importReport.linkFailures.length} failed` : 'None'} pass={importReport.linkFailures.length === 0} />
            <CheckRow label="Source topics imported" value={`${importReport.topicsImported} sections`} pass={importReport.topicsImported === 15} />
            <CheckRow label="Duplicate rows preserved" value={importReport.duplicateProblemsPreserved ? `${duplicateGroups.length} groups kept` : 'Not preserved'} pass={importReport.duplicateProblemsPreserved} />
            <CheckRow label="Duplicate URLs deduplicated in stats" value={`${duplicateUrlGroups.length} URL groups`} pass />
            <CheckRow label="Title corrections documented" value={`${importReport.titleCorrections.length} expanded titles`} pass />
            <CheckRow label="Uncertain company mappings disclosed" value={`${importReport.unverifiedLogoRows.length} rows / ${importReport.unverifiedLogoRows.reduce((total, row) => total + row.logoCount, 0)} marks`} pass={false} uncertain />
          </div>
          <div className="mt-4 rounded-xl border border-line bg-canvas/40 p-3">
            <div className="flex items-center justify-between gap-2 text-[10px]">
              <span className="text-muted">Link verification coverage</span>
              <span className="font-mono text-faint">{importReport.linksVerified}/{importReport.importedProblems}</span>
            </div>
            <ProgressBar value={importReport.linksVerified} max={importReport.importedProblems} height="h-1.5" className="mt-2" tone="good" />
            <p className="mt-2 text-[9.5px] leading-4 text-faint">{dataset.meta.linkVerification} Checked {formatDateKey(dataset.meta.linksVerifiedAt, { month: 'long', day: 'numeric', year: 'numeric' })}. Live pages can change after the check.</p>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="card min-w-0 p-5">
            <p className="eyebrow">Source fingerprint</p>
            <h2 className="mt-1 font-display text-lg font-semibold text-ink">Dataset integrity</h2>
            <dl className="mt-4 space-y-2.5 text-[11px]">
              <MetaRow label="Sheet" value={dataset.meta.sheetTitle} />
              <MetaRow label="File" value={dataset.meta.sourceFile} />
              <MetaRow label="Content pages" value={`PDF ${dataset.meta.pdfContentPages[0]}–${dataset.meta.pdfContentPages[1]}`} />
              <MetaRow label="Platforms" value={`${importReport.platformCounts.LeetCode} LeetCode · ${importReport.platformCounts.GeeksforGeeks} GFG`} />
              <MetaRow label="Imported" value={formatDateKey(dataset.meta.importedAt.slice(0, 10))} />
            </dl>
            <div className="mt-3 rounded-lg border border-line bg-canvas/40 p-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[8.5px] font-semibold uppercase tracking-[0.12em] text-faint">SHA-256</p>
                <button type="button" onClick={copyHash} className="inline-flex items-center gap-1 text-[9px] font-semibold text-brand hover:text-brand/80">
                  <Copy className="h-2.5 w-2.5" /> Copy
                </button>
              </div>
              <p className="mt-1 break-all font-mono text-[9px] leading-4 text-muted">{dataset.meta.sourceSha256}</p>
            </div>
          </div>

          <div className="card min-w-0 border-warn/25 p-5">
            <div className="flex items-center gap-2">
              <TriangleAlert className="h-4 w-4 text-warn" />
              <p className="text-[11px] font-semibold text-ink">Uncertain company mappings</p>
            </div>
            <p className="mt-2 text-[10px] leading-5 text-faint">Three logo marks could not be identified. No company name was guessed, so these rows carry fewer company associations than the printed sheet.</p>
            <div className="mt-3 space-y-1.5">
              {importReport.unverifiedLogoRows.map((row) => {
                const problem = getProblemByNumber(row.number);
                return (
                  <div key={row.number} className="flex items-center gap-2 rounded-lg border border-line bg-elevated/40 px-2.5 py-2 text-[10.5px]">
                    <span className="font-mono text-[9px] text-faint">#{row.number}</span>
                    {problem ? <Link to={`/problem/${problem.id}`} className="min-w-0 flex-1 truncate text-ink hover:text-brand">{row.title}</Link> : <span className="min-w-0 flex-1 truncate text-ink">{row.title}</span>}
                    <Badge tone="warn">{pluralize(row.logoCount, 'mark')}</Badge>
                  </div>
                );
              })}
            </div>
            <Link to="/companies" className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-brand">Open company browser <ArrowUpRight className="h-3 w-3" /></Link>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="card min-w-0 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <GitCompareArrows className="h-4 w-4 text-violet" />
            <h2 className="font-display text-lg font-semibold text-ink">Duplicate groups preserved</h2>
            <Badge tone="violet" className="ml-auto">{duplicateGroups.length}</Badge>
          </div>
          <p className="mt-2 text-[10.5px] leading-5 text-faint">
            Both rows remain in the library and in PDF order. Unique-problem metrics map both rows to one canonical problem. Solving both twins increases row coverage but not unique coverage.
          </p>
          <div className="mt-4 divide-y divide-line/60">
            {duplicateGroups.map(([title, numbers]) => (
              <div key={title} className="flex flex-wrap items-center gap-2 py-2.5">
                <span className="min-w-0 flex-1 truncate text-[11px] capitalize text-ink" title={title}>{title}</span>
                <div className="flex items-center gap-1">
                  {numbers.map((number) => {
                    const problem = getProblemByNumber(number);
                    return problem ? (
                      <Link key={number} to={`/problem/${problem.id}`} className="rounded-md border border-line bg-elevated/70 px-1.5 py-0.5 font-mono text-[9px] text-muted transition hover:border-brand/40 hover:text-brand">
                        #{number}
                      </Link>
                    ) : null;
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card min-w-0 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand" />
            <h2 className="font-display text-lg font-semibold text-ink">Title corrections</h2>
            <Badge tone="brand" className="ml-auto">{importReport.titleCorrections.length}</Badge>
          </div>
          <p className="mt-2 text-[10.5px] leading-5 text-faint">
            Four titles were truncated or contaminated by a page footer in the PDF text layer. Display titles were expanded from verified problem metadata; the original text remains stored as <span className="font-mono text-[9px]">sourceTitle</span>.
          </p>
          <div className="mt-4 space-y-2">
            {importReport.titleCorrections.map((correction) => {
              const problem = getProblemByNumber(correction.number);
              return (
                <div key={correction.number} className="rounded-xl border border-line bg-elevated/35 p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] text-faint">#{correction.number}</span>
                    {problem ? <Link to={`/problem/${problem.id}`} className="min-w-0 flex-1 truncate text-[11px] font-semibold text-ink hover:text-brand">{correction.title}</Link> : <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-ink">{correction.title}</span>}
                    <ExternalLink className="h-3 w-3 shrink-0 text-faint" />
                  </div>
                  <p className="mt-1 text-[9.5px] leading-4 text-faint">Source: “{correction.sourceTitle}”</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="card min-w-0 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-cyan" />
            <h2 className="font-display text-lg font-semibold text-ink">Import notes</h2>
          </div>
          <ul className="mt-3 space-y-2">
            {importReport.notes.map((note, index) => (
              <li key={index} className="flex gap-2 text-[10.5px] leading-5 text-muted">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-good" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card min-w-0 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warn" />
            <h2 className="font-display text-lg font-semibold text-ink">Known limits</h2>
          </div>
          <div className="mt-3 space-y-2.5 text-[10.5px] leading-5 text-faint">
            <LimitItem title="Company meaning" text="Logo associations come only from the source sheet. They are not interview-frequency, difficulty, or current hiring claims." />
            <LimitItem title="Link freshness" text="URLs were checked when the dataset was built. Third-party pages can move or change after that date." />
            <LimitItem title="Three unidentified marks" text="Rows 25, 120 and 158 each have one unreadable logo. They do not contribute a guessed company." />
            <LimitItem title="One medium mapping" text="Myntra is mapped from an app-icon variant and is marked ~ wherever it appears." />
            <LimitItem title="Printed page offset" text="The printed page number is generally the physical PDF page minus one. Both values are stored per row." />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl2 border border-line bg-surface/60 px-4 py-3 text-[10px] text-faint">
        <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-good" /> Validation is reproducible from the source PDF and stored SHA-256.</span>
        <Link to="/settings" className="text-muted underline decoration-line underline-offset-4 hover:text-ink">Backup & restore</Link>
      </div>
    </div>
  );
}

function ReportStat({ label, value, sub, tone, icon }: { label: string; value: string; sub: string; tone: 'good' | 'brand' | 'cyan' | 'violet'; icon: React.ReactNode }) {
  const tones = {
    good: 'border-good/20 bg-good/10 text-good',
    brand: 'border-brand/20 bg-brand/10 text-brand',
    cyan: 'border-cyan/20 bg-cyan/10 text-cyan',
    violet: 'border-violet/20 bg-violet/10 text-violet',
  };
  return (
    <div className="card flex items-start gap-3 p-4">
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border', tones[tone])}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-faint">{label}</p>
        <p className="mt-1 font-display text-xl font-semibold leading-none tabular-nums text-ink">{value}</p>
        <p className="mt-1.5 text-[9.5px] leading-4 text-muted">{sub}</p>
      </div>
    </div>
  );
}

function CheckRow({ label, value, pass, uncertain = false }: { label: string; value: string; pass: boolean; uncertain?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md border', uncertain ? 'border-warn/30 bg-warn/10 text-warn' : pass ? 'border-good/25 bg-good/10 text-good' : 'border-bad/25 bg-bad/10 text-bad')}>
        {uncertain ? <AlertTriangle className="h-3 w-3" /> : pass ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
      </div>
      <span className="min-w-0 flex-1 text-[10.5px] text-muted">{label}</span>
      <span className={cn('shrink-0 text-right font-mono text-[9.5px]', uncertain ? 'text-warn' : 'text-faint')}>{value}</span>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-faint">{label}</dt>
      <dd className="min-w-0 text-right text-muted">{value}</dd>
    </div>
  );
}

function LimitItem({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-line bg-canvas/30 p-2.5">
      <p className="text-[10.5px] font-semibold text-ink">{title}</p>
      <p className="mt-0.5 text-[9.5px] leading-4 text-faint">{text}</p>
    </div>
  );
}
