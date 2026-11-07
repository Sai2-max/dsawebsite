import { useEffect, useState } from 'react';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { StoreProvider } from './store/StoreContext';
import { ToastProvider } from './components/ui/Toast';
import {
  AppFooter,
  DesktopSidebar,
  MobileBottomNav,
  MobileSidebar,
  Topbar,
} from './components/layout/Sidebar';
import { TimerBar } from './components/Timer';
import DashboardPage from './pages/Dashboard';
import TodayPage from './pages/Today';
import LibraryPage from './pages/Library';
import CalendarPage from './pages/Calendar';
import TopicsPage from './pages/Topics';
import CompaniesPage from './pages/Companies';
import AnalyticsPage from './pages/Analytics';
import SettingsPage from './pages/Settings';
import ReportPage from './pages/Report';
import ProblemDetailPage from './pages/ProblemDetail';
import NotFoundPage from './pages/NotFound';

function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    const titles: Array<[string, string]> = [
      ['/today', "Today's Plan"],
      ['/library', 'Problem Library'],
      ['/problem/', 'Problem Detail'],
      ['/calendar', 'Revision Calendar'],
      ['/topics', 'Topics'],
      ['/companies', 'Companies'],
      ['/analytics', 'Analytics'],
      ['/settings', 'Settings'],
      ['/report', 'Import Report'],
    ];
    const match = titles.find(([path]) => location.pathname.startsWith(path));
    document.title = `${match?.[1] ?? 'Dashboard'} · DSA Command Center`;
  }, [location.pathname]);

  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:text-ink focus:shadow-card"
      >
        Skip to content
      </a>
      <DesktopSidebar />
      <MobileSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex min-h-screen flex-col lg:pl-[264px]">
        <Topbar onOpenMenu={() => setMenuOpen(true)} />
        <main id="main-content" className="flex-1 px-4 py-5 pb-28 sm:px-6 sm:py-6 lg:px-8 lg:pb-8">
          <div className="mx-auto w-full max-w-[1480px]">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/today" element={<TodayPage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/topics" element={<TopicsPage />} />
              <Route path="/companies" element={<CompaniesPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/report" element={<ReportPage />} />
              <Route path="/problem/:id" element={<ProblemDetailPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </div>
        </main>
        <AppFooter />
      </div>

      <MobileBottomNav onOpenMenu={() => setMenuOpen(true)} />
      <TimerBar />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <HashRouter>
          <AppShell />
        </HashRouter>
      </ToastProvider>
    </StoreProvider>
  );
}
