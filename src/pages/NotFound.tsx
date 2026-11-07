import { Link } from 'react-router-dom';
import { ArrowLeft, Compass, Library } from 'lucide-react';
import { buttonClasses } from '../components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="card w-full max-w-lg p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-brand/25 bg-brand/10 text-brand">
          <Compass className="h-7 w-7" />
        </div>
        <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.2em] text-faint">404 · off the sheet</p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">That page does not exist</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">
          The route may have changed, or the link may be incomplete. Your local study state is untouched.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Link to="/" className={buttonClasses('primary', 'md')}>
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <Link to="/library" className={buttonClasses('secondary', 'md')}>
            <Library className="h-4 w-4" /> Problem library
          </Link>
        </div>
      </div>
    </div>
  );
}
