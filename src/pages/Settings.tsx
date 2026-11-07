import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  AlertTriangle,
  Check,
  Database,
  Download,
  FileJson,
  FileSpreadsheet,
  HardDrive,
  Info,
  Monitor,
  Moon,
  RotateCcw,
  Save,
  ShieldCheck,
  Sun,
  Target,
  Upload,
  User,
} from 'lucide-react';
import { useStore } from '../store/StoreContext';
import { useToast } from '../components/ui/Toast';
import { dataset, importReport } from '../lib/dataset';
import { downloadAttemptsCsv, downloadBackup, downloadProblemsCsv, downloadReviewsCsv } from '../lib/export';
import { parseImportBundle, type ParsedImport } from '../lib/storage';
import { formatDateKey } from '../lib/dates';
import { PageHeader } from '../components/ProblemBits';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Modal } from '../components/ui/Modal';
import { cn, percent } from '../lib/utils';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function exportDateLabel(iso?: string): string {
  if (!iso) return 'Unknown export date';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

export default function SettingsPage() {
  const { state, dispatch, persistence } = useStore();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(state.settings.studyName);
  const [target, setTarget] = useState(state.settings.dailyTarget);
  const [candidate, setCandidate] = useState<ParsedImport | null>(null);
  const [importError, setImportError] = useState('');
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    setName(state.settings.studyName);
  }, [state.settings.studyName]);

  useEffect(() => {
    setTarget(state.settings.dailyTarget);
  }, [state.settings.dailyTarget]);

  const stateBytes = useMemo(() => new TextEncoder().encode(JSON.stringify(state)).length, [state]);
  const progressCount = Object.keys(state.progress).length;
  const totalAttempts = Object.values(state.progress).reduce((total, item) => total + item.attempts.length, 0);
  const totalCycles = Object.values(state.progress).reduce((total, item) => total + item.cycles.length, 0);
  const totalCompleted = Object.values(state.progress).reduce(
    (total, item) => total + item.cycles.reduce((sum, cycle) => sum + cycle.stages.filter((stage) => stage.completedOn).length, 0),
    0,
  );
  const nameDirty = name.trim() !== state.settings.studyName;

  const saveName = () => {
    dispatch({ type: 'UPDATE_SETTINGS', patch: { studyName: name.trim() } });
    toast(name.trim() ? 'Study name saved.' : 'Study name cleared.', 'success');
  };

  const commitTarget = (value: number) => {
    const next = Math.min(15, Math.max(1, Math.round(Number.isFinite(value) ? value : state.settings.dailyTarget)));
    setTarget(next);
    if (next !== state.settings.dailyTarget) {
      dispatch({ type: 'UPDATE_SETTINGS', patch: { dailyTarget: next } });
      toast(`Daily new-problem target set to ${next}.`, 'success');
    }
  };

  const setTheme = (theme: 'dark' | 'light' | 'system') => {
    dispatch({ type: 'UPDATE_SETTINGS', patch: { theme } });
    toast(`Theme set to ${theme}.`, 'success');
  };

  const setWeekStart = (weekStartsOn: 0 | 1) => {
    dispatch({ type: 'UPDATE_SETTINGS', patch: { weekStartsOn } });
    toast(`Week starts on ${weekStartsOn === 1 ? 'Monday' : 'Sunday'}.`, 'success');
  };

  const onChooseFile = () => {
    setImportError('');
    fileRef.current?.click();
  };

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setImportError('');
    if (file.size > 8 * 1024 * 1024) {
      setImportError('That backup is larger than 8 MB. Choose the JSON export produced by this app.');
      return;
    }
    try {
      const text = await file.text();
      const parsed = parseImportBundle(text);
      setCandidate(parsed);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'The backup could not be read.');
    }
  };

  const confirmImport = () => {
    if (!candidate) return;
    dispatch({ type: 'IMPORT', state: candidate.state });
    toast(`Backup restored: ${candidate.summary.problemsTouched} problems, ${candidate.summary.attempts} attempts.`, 'success');
    setCandidate(null);
  };

  const confirmReset = () => {
    dispatch({ type: 'RESET_DATA' });
    setResetOpen(false);
    toast('All progress cleared. Settings were kept; your import report is still available.', 'info');
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        eyebrow="Local preferences & data ownership"
        title="Settings"
        description="Everything here is stored in this browser only. Export a JSON backup before clearing site data or moving to another machine."
        actions={
          <Badge tone={persistence.status === 'error' ? 'bad' : 'good'} dot>
            {persistence.status === 'error' ? 'Storage error' : 'Saved locally'}
          </Badge>
        }
      />

      {/* The single hidden input powers the visible import button. */}
      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} aria-hidden="true" tabIndex={-1} />

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <section className="card p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand/20 bg-brand/10 text-brand"><User className="h-4 w-4" /></div>
              <div>
                <p className="eyebrow">Profile</p>
                <h2 className="font-display text-lg font-semibold text-ink">Study workspace</h2>
              </div>
            </div>
            <div className="mt-4">
              <label htmlFor="study-name" className="label">Display name</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="study-name"
                  value={name}
                  maxLength={60}
                  onChange={(event) => setName(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') saveName(); }}
                  placeholder="Optional — shown on the dashboard"
                  className="input"
                />
                <Button variant="primary" onClick={saveName} disabled={!nameDirty} icon={<Save className="h-4 w-4" />} className="shrink-0">Save</Button>
              </div>
              <p className="mt-1.5 text-[10px] text-faint">Only used for the dashboard greeting. Keep it local or leave it blank.</p>
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-warn/20 bg-warn/10 text-warn"><Target className="h-4 w-4" /></div>
              <div>
                <p className="eyebrow">Planning</p>
                <h2 className="font-display text-lg font-semibold text-ink">Daily new-problem target</h2>
              </div>
              <Badge tone="brand" className="ml-auto">{state.settings.dailyTarget}/day</Badge>
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div className="w-28">
                <label htmlFor="daily-target" className="label">Target</label>
                <input
                  id="daily-target"
                  type="number"
                  min={1}
                  max={15}
                  value={target}
                  onChange={(event) => setTarget(Number(event.target.value))}
                  onBlur={() => commitTarget(target)}
                  className="input font-mono"
                />
              </div>
              <div className="flex items-center gap-1 pb-0.5">
                {[1, 2, 3, 5, 7, 10].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => commitTarget(value)}
                    className={cn(
                      'h-8 min-w-8 rounded-lg border px-2 text-[11px] font-semibold transition',
                      state.settings.dailyTarget === value ? 'border-brand/50 bg-brand/15 text-brand' : 'border-line bg-elevated/60 text-muted hover:text-ink',
                    )}
                    aria-pressed={state.settings.dailyTarget === value}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-3 text-[10.5px] leading-5 text-faint">
              The target determines how many new unique problems Today's Plan surfaces. It is a floor, not a cap: you can always open the library and start more. Duplicate PDF rows never consume two target slots.
            </p>
          </section>

          <section className="card p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet/20 bg-violet/10 text-violet"><Moon className="h-4 w-4" /></div>
              <div>
                <p className="eyebrow">Appearance</p>
                <h2 className="font-display text-lg font-semibold text-ink">Theme</h2>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {([
                ['dark', 'Dark', <Moon key="dark" className="h-4 w-4" />],
                ['light', 'Light', <Sun key="light" className="h-4 w-4" />],
                ['system', 'System', <Monitor key="system" className="h-4 w-4" />],
              ] as const).map(([value, label, icon]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border p-3 text-[11px] font-semibold transition',
                    state.settings.theme === value ? 'border-brand/50 bg-brand/10 text-brand' : 'border-line bg-elevated/40 text-muted hover:border-brand/30 hover:text-ink',
                  )}
                  aria-pressed={state.settings.theme === value}
                >
                  {icon}
                  {label}
                  {state.settings.theme === value ? <span className="text-[8px] uppercase tracking-wider">active</span> : <span className="h-2.5" />}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[10px] leading-5 text-faint">System follows your operating-system colour preference. The topbar toggle switches between explicit dark and light.</p>
          </section>

          <section className="card p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan/20 bg-cyan/10 text-cyan"><FileSpreadsheet className="h-4 w-4" /></div>
              <div>
                <p className="eyebrow">Calendar</p>
                <h2 className="font-display text-lg font-semibold text-ink">Week starts on</h2>
              </div>
            </div>
            <div className="mt-4 inline-flex rounded-xl border border-line bg-canvas/40 p-1">
              {([[1, 'Monday'], [0, 'Sunday']] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setWeekStart(value)}
                  className={cn('rounded-lg px-4 py-1.5 text-xs font-semibold transition', state.settings.weekStartsOn === value ? 'bg-elevated text-ink shadow-sm' : 'text-muted hover:text-ink')}
                  aria-pressed={state.settings.weekStartsOn === value}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[10px] leading-5 text-faint">Affects month grids and heatmap labels only. Review due dates use local calendar dates and never depend on the week setting.</p>
          </section>
        </div>

        <div className="space-y-5">
          <section className="card p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-good/20 bg-good/10 text-good"><Download className="h-4 w-4" /></div>
              <div>
                <p className="eyebrow">Backup & export</p>
                <h2 className="font-display text-lg font-semibold text-ink">Own your data</h2>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Button variant="primary" className="w-full justify-start" onClick={() => { downloadBackup(state); toast('JSON backup downloaded.', 'success'); }} icon={<FileJson className="h-4 w-4" />}>
                Download JSON backup
              </Button>
              <p className="px-1 text-[9.5px] leading-4 text-faint">Complete restorable state: settings, progress, attempts, notes, review cycles, snoozes and activity events.</p>
              <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-3">
                <Button variant="secondary" size="sm" onClick={() => { downloadProblemsCsv(state); toast('Progress CSV exported.', 'success'); }} icon={<FileSpreadsheet className="h-3.5 w-3.5" />}>Progress CSV</Button>
                <Button variant="secondary" size="sm" onClick={() => { downloadAttemptsCsv(state); toast('Attempt history CSV exported.', 'success'); }} icon={<FileSpreadsheet className="h-3.5 w-3.5" />}>Attempts CSV</Button>
                <Button variant="secondary" size="sm" onClick={() => { downloadReviewsCsv(state); toast('Revision history CSV exported.', 'success'); }} icon={<FileSpreadsheet className="h-3.5 w-3.5" />}>Revisions CSV</Button>
              </div>
            </div>

            <div className="mt-5 border-t border-line/60 pt-4">
              <p className="text-[11px] font-semibold text-ink">Restore a backup</p>
              <p className="mt-1 text-[9.5px] leading-4 text-faint">Import replaces the current local state after validation. Unknown problem IDs are skipped and reported; a dataset hash mismatch produces a warning.</p>
              <Button variant="secondary" className="mt-3 w-full justify-start" onClick={onChooseFile} icon={<Upload className="h-4 w-4" />}>
                Choose JSON backup…
              </Button>
              {importError ? (
                <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-bad/25 bg-bad/5 p-2.5 text-[10px] leading-5 text-bad">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {importError}
                </p>
              ) : null}
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand/20 bg-brand/10 text-brand"><Database className="h-4 w-4" /></div>
              <div>
                <p className="eyebrow">Dataset</p>
                <h2 className="font-display text-lg font-semibold text-ink">Source evidence</h2>
              </div>
            </div>
            <dl className="mt-4 space-y-2.5 text-[11px]">
              <Row label="Sheet" value={dataset.meta.sheetTitle} />
              <Row label="Rows / unique" value={`${dataset.meta.totalProblems} / ${dataset.meta.uniqueProblems}`} />
              <Row label="Topics" value={String(dataset.meta.topicCount)} />
              <Row label="Links verified" value={`${importReport.linksVerified}/${importReport.importedProblems}`} />
              <Row label="Duplicate groups" value={String(dataset.meta.duplicateUrlGroups)} />
              <Row label="Companies" value={`${importReport.uniqueCompanies} (${importReport.companyAssociations} associations)`} />
              <Row label="Imported" value={formatDateKey(dataset.meta.importedAt.slice(0, 10))} />
            </dl>
            <div className="mt-3 rounded-lg border border-line bg-canvas/40 p-2.5">
              <p className="text-[8.5px] font-semibold uppercase tracking-[0.12em] text-faint">Source SHA-256</p>
              <p className="mt-1 break-all font-mono text-[9px] leading-4 text-muted">{dataset.meta.sourceSha256}</p>
            </div>
            <a href="/dsa-sheet.pdf" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-[10.5px] font-semibold text-brand hover:text-brand/80">
              <FileJson className="h-3 w-3" /> Open source PDF
            </a>
          </section>

          <section className="card p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan/20 bg-cyan/10 text-cyan"><HardDrive className="h-4 w-4" /></div>
              <div>
                <p className="eyebrow">Local storage</p>
                <h2 className="font-display text-lg font-semibold text-ink">This browser</h2>
              </div>
              <Badge tone={persistence.status === 'error' ? 'bad' : 'good'} dot className="ml-auto">
                {persistence.status === 'error' ? 'Error' : 'OK'}
              </Badge>
            </div>
            <dl className="mt-4 space-y-2.5 text-[11px]">
              <Row label="Saved state size" value={formatBytes(stateBytes)} />
              <Row label="Problems touched" value={`${progressCount} (${percent(progressCount, 211)}%)`} />
              <Row label="Attempts" value={String(totalAttempts)} />
              <Row label="Review cycles" value={String(totalCycles)} />
              <Row label="Reviews completed" value={String(totalCompleted)} />
              <Row label="Activity events" value={String(state.events.length)} />
            </dl>
            <p className="mt-3 flex items-start gap-1.5 text-[9.5px] leading-4 text-faint">
              <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-good" />
              Persisted to localStorage under “dsa-command-center:v1”. Clearing browser site data deletes progress unless you have a JSON backup.
            </p>
            {persistence.status === 'error' ? <p className="mt-2 text-[10px] text-bad">{persistence.error}</p> : null}
          </section>
        </div>
      </div>

      <section className="rounded-xl2 border border-bad/25 bg-bad/[0.04] p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-bad/25 bg-bad/10 text-bad"><AlertTriangle className="h-4 w-4" /></div>
            <div>
              <p className="text-sm font-semibold text-ink">Reset all progress</p>
              <p className="mt-0.5 max-w-2xl text-[10.5px] leading-5 text-muted">
                Permanently clears statuses, attempts, notes, timers, review cycles, snoozes and activity history from this browser. Settings are retained. Download a JSON backup first if you might want this data back.
              </p>
            </div>
          </div>
          <Button variant="danger" className="shrink-0" onClick={() => setResetOpen(true)} icon={<RotateCcw className="h-4 w-4" />}>
            Reset local progress
          </Button>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-faint">
        <span className="flex items-center gap-1"><Info className="h-3 w-3" /> Settings apply immediately and are included in the JSON backup.</span>
        <a href="/dsa-sheet.pdf" target="_blank" rel="noreferrer" className="text-muted underline decoration-line underline-offset-4 hover:text-ink">Open source PDF</a>
      </div>

      <Modal
        open={Boolean(candidate)}
        onClose={() => setCandidate(null)}
        title="Restore this backup?"
        description="Review the contents before replacing the progress currently stored in this browser."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCandidate(null)}>Cancel</Button>
            <Button variant="primary" onClick={confirmImport} icon={<Check className="h-4 w-4" />}>Replace local progress</Button>
          </>
        }
      >
        {candidate ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <SummaryTile label="Problems" value={candidate.summary.problemsTouched} />
              <SummaryTile label="Attempts" value={candidate.summary.attempts} />
              <SummaryTile label="Reviews" value={candidate.summary.reviewsCompleted} />
              <SummaryTile label="Events" value={candidate.summary.events} />
            </div>
            <div className="rounded-xl border border-line bg-elevated/40 p-3 text-[10.5px] leading-5 text-muted">
              <p><span className="text-faint">Exported:</span> {exportDateLabel(candidate.summary.exportedAt)}</p>
              <p><span className="text-faint">Dataset hash:</span> <span className="font-mono text-[9px]">{dataset.meta.sourceSha256.slice(0, 16)}…</span></p>
            </div>
            {candidate.summary.datasetMismatch ? (
              <p className="flex items-start gap-2 rounded-lg border border-warn/30 bg-warn/5 p-3 text-[10.5px] leading-5 text-warn">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                This backup came from a different dataset build. Known problem IDs will still restore; records for unknown IDs are skipped.
              </p>
            ) : null}
            {candidate.summary.unknownProblems.length ? (
              <div className="rounded-lg border border-warn/25 bg-warn/5 p-3">
                <p className="text-[10.5px] font-semibold text-warn">{candidate.summary.unknownProblems.length} unknown problem record{candidate.summary.unknownProblems.length === 1 ? '' : 's'} will be skipped</p>
                <p className="mt-1 break-all font-mono text-[9px] leading-4 text-faint">{candidate.summary.unknownProblems.slice(0, 12).join(', ')}{candidate.summary.unknownProblems.length > 12 ? '…' : ''}</p>
              </div>
            ) : null}
            <p className="text-[10px] leading-5 text-faint">Current settings, notes, attempts and revision history will be replaced. This action cannot be undone unless you export the current state first.</p>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={confirmReset}
        title="Reset all local progress?"
        description="This removes every study record but keeps your theme, name, daily target and week preference. Type RESET to confirm."
        confirmLabel="Reset progress"
        tone="danger"
        requireText="RESET"
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-faint">{label}</dt>
      <dd className="min-w-0 text-right text-muted">{value}</dd>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-canvas/40 p-2.5 text-center">
      <p className="font-display text-lg font-semibold tabular-nums text-ink">{value}</p>
      <p className="text-[8.5px] uppercase tracking-[0.1em] text-faint">{label}</p>
    </div>
  );
}
