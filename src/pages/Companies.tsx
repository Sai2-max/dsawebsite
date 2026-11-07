import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useStore, useToday } from '../store/StoreContext';
import { getCompanyStats } from '../lib/stats';
import { getCompany } from '../lib/dataset';
import { importReport } from '../lib/dataset';
import { PageHeader } from '../components/ProblemBits';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ProgressBar } from '../components/ui/Progress';
import { cn, percent } from '../lib/utils';

type CompanySort = 'problems' | 'progress' | 'solved' | 'name';

export default function CompaniesPage() {
  const { state } = useStore();
  const today = useToday();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<CompanySort>('problems');

  const stats = useMemo(() => getCompanyStats(state, today), [state, today]);
  const enriched = useMemo(
    () =>
      stats.map((company) => {
        const source = getCompany(company.name);
        return {
          ...company,
          highConfidence: source?.highConfidenceCount ?? 0,
          associations: source?.problemCount ?? company.rows,
        };
      }),
    [stats],
  );

  const totalAssociations = enriched.reduce((total, company) => total + company.associations, 0);
  const solvedCompanies = enriched.filter((company) => company.solvedUnique > 0).length;
  const mediumAssociations = enriched.reduce((total, company) => total + Math.max(0, company.associations - company.highConfidence), 0);
  const top = [...enriched].sort((a, b) => b.solvedUnique - a.solvedUnique || b.progressPercent - a.progressPercent)[0];

  const filtered = enriched
    .filter((company) => company.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'progress') return b.progressPercent - a.progressPercent || b.solvedUnique - a.solvedUnique || a.name.localeCompare(b.name);
      if (sort === 'solved') return b.solvedUnique - a.solvedUnique || b.progressPercent - a.progressPercent || a.name.localeCompare(b.name);
      return b.uniqueRows - a.uniqueRows || b.solvedUnique - a.solvedUnique || a.name.localeCompare(b.name);
    });

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        eyebrow="Logo associations printed in the source sheet"
        title="Companies"
        description="Browse the companies attached to each PDF row. These are source associations only — not claims about current interview frequency, difficulty or hiring priority."
        actions={
          <>
            <Badge tone="good" dot>{importReport.uniqueCompanies} companies</Badge>
            <Link to="/report" className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-ink transition hover:border-brand/40">
              <ShieldCheck className="h-3.5 w-3.5 text-good" /> Mapping report
            </Link>
          </>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card relative overflow-hidden p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-brand/25 bg-brand/10">
              <Building2 className="h-8 w-8 text-brand" />
            </div>
            <div className="min-w-0">
              <p className="eyebrow">Coverage</p>
              <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink">
                {solvedCompanies} of {enriched.length} companies touched
              </h2>
              <p className="mt-1.5 text-[11px] leading-5 text-muted">
                {totalAssociations} logo associations across 211 source rows. One row can carry several companies, and one problem can appear under several companies.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="brand">{importReport.companyAssociations} associations</Badge>
                <Badge tone="violet">{mediumAssociations} medium-confidence mark{mediumAssociations === 1 ? '' : 's'}</Badge>
                {top && top.solvedUnique > 0 ? <Badge tone="good">Most progress · {top.name}</Badge> : null}
              </div>
            </div>
          </div>
        </div>

        <div className="card p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-good" />
            <p className="text-[11px] font-semibold text-ink">Read this before using company counts</p>
          </div>
          <ul className="mt-3 space-y-2 text-[10.5px] leading-5 text-faint">
            <li className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand" /> Companies are the small logo marks printed beside rows in the source PDF.</li>
            <li className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-warn" /> Three marks could not be identified. No name was invented for them.</li>
            <li className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet" /> A medium-confidence mapping is marked with “~”. Myntra is the app-icon variant.</li>
          </ul>
          <Link to="/report" className="mt-3 inline-flex items-center gap-1 text-[10.5px] font-semibold text-brand hover:text-brand/80">
            See uncertain rows <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </section>

      <section className="card flex flex-col gap-3 p-4 sm:p-5 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1 lg:max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search companies…"
            className="input pl-10"
            aria-label="Search companies"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1 lg:ml-auto">
          {([
            ['problems', 'Most problems'],
            ['progress', 'Most progress'],
            ['solved', 'Most solved'],
            ['name', 'A–Z'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSort(value)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-[11px] font-semibold transition',
                sort === value ? 'bg-brand/15 text-brand' : 'text-muted hover:bg-elevated hover:text-ink',
              )}
              aria-pressed={sort === value}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {filtered.length ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((company) => {
            const initials = company.name
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part[0])
              .join('')
              .toUpperCase();
            return (
              <article key={company.name} className="card card-hover flex flex-col p-4">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-[11px] font-bold',
                    company.solvedUnique === company.uniqueRows && company.uniqueRows > 0
                      ? 'border-good/25 bg-good/10 text-good'
                      : company.solvedUnique > 0
                        ? 'border-brand/25 bg-brand/10 text-brand'
                        : 'border-line bg-elevated text-faint',
                  )}>
                    {initials || <Building2 className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/library?company=${encodeURIComponent(company.name)}`} className="truncate font-display text-sm font-semibold text-ink transition hover:text-brand">
                        {company.name}
                      </Link>
                      <Badge tone={company.progressPercent === 100 ? 'good' : company.overdueCount ? 'bad' : 'neutral'}>
                        {company.progressPercent}%
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-[10px] text-faint">
                      {company.uniqueRows} unique · {company.associations} source association{company.associations === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted">{company.solvedUnique}/{company.uniqueRows} solved</span>
                    <span className="text-faint">{company.rows} rows</span>
                  </div>
                  <ProgressBar value={company.solvedUnique} max={Math.max(1, company.uniqueRows)} height="h-1.5" className="mt-1.5" tone={company.progressPercent === 100 ? 'good' : company.overdueCount ? 'bad' : 'brand'} />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px]">
                  {company.dueCount ? <Badge tone={company.overdueCount ? 'bad' : 'warn'} dot>{company.dueCount} review{company.dueCount === 1 ? '' : 's'} due</Badge> : <span className="text-faint">No review due</span>}
                  {company.highConfidence < company.associations ? <Badge tone="violet">~ medium confidence</Badge> : null}
                </div>

                <div className="mt-auto flex items-center justify-between gap-2 border-t border-line/60 pt-3">
                  <div className="flex items-center gap-3 text-[9px] text-faint">
                    <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-good" /> {company.solvedUnique} solved</span>
                    <span className="flex items-center gap-1"><BriefcaseBusiness className="h-3 w-3" /> {company.attempts}</span>
                    <span className="flex items-center gap-1"><CalendarClock className="h-3 w-3" /> {percent(company.solvedUnique, Math.max(1, company.uniqueRows))}%</span>
                  </div>
                  <Link to={`/library?company=${encodeURIComponent(company.name)}`} className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-brand transition hover:text-brand/80">
                    Rows <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <div className="card">
          <EmptyState
            icon={<Search className="h-5 w-5" />}
            title="No companies match"
            description={`No company name contains “${query}”. Try a shorter search.`}
            action={<Button variant="secondary" onClick={() => setQuery('')}>Clear search</Button>}
            className="py-14"
          />
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-3">
        <CompanyFootnote icon={<Users className="h-4 w-4" />} title={`${importReport.uniqueCompanies} companies`} text="All names were read from the PDF's logo marks. No company list was added from outside the sheet." />
        <CompanyFootnote icon={<CalendarClock className="h-4 w-4" />} title="Source order preserved" text="Company cards sort by coverage or name for convenience; the PDF rows themselves are never reordered." />
        <CompanyFootnote icon={<ShieldCheck className="h-4 w-4" />} title="Unverified marks stay unverified" text="Rows 25, 120 and 158 each carry one unidentified logo. They contribute to no company count." />
      </section>
    </div>
  );
}

function CompanyFootnote({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-xl2 border border-line bg-surface/60 p-4">
      <div className="flex items-center gap-2 text-muted">{icon}<p className="text-[11px] font-semibold text-ink">{title}</p></div>
      <p className="mt-1.5 text-[10px] leading-5 text-faint">{text}</p>
    </div>
  );
}
