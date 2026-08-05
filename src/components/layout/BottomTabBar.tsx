import { Home, TrendingUp, User, Zap } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';

const TABS = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/progress', icon: TrendingUp, label: 'Progress' },
  { to: '/improve', icon: Zap, label: 'Improve' },
  { to: '/you', icon: User, label: 'You' },
] as const;

// Sub-pages that belong to a parent tab but don't share its path prefix
const SUB_PAGE_TAB: Record<string, string> = {
  '/detail': '/progress',
  '/privacy': '/you',
  '/terms': '/you',
  '/help': '/you',
  '/new-cycle': '/',
};

function resolveActiveTab(pathname: string): string {
  for (const [prefix, parent] of Object.entries(SUB_PAGE_TAB)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return parent;
  }
  return pathname;
}

export default function BottomTabBar() {
  const { pathname } = useLocation();
  const activeTab = resolveActiveTab(pathname);

  return (
    <nav aria-label="Main navigation" className="app-tabbar pb-safe">
      <div className="grid grid-cols-4 gap-1">
        {TABS.map(({ to, icon: Icon, label }) => {
          const isActive = to === '/' ? activeTab === '/' : activeTab.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={`tab-item px-2 pb-2 pt-4 ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} strokeWidth={1.5} />
              <span>{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
