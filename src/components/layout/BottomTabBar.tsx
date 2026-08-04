import { Home, TrendingUp, User, Zap } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/progress', icon: TrendingUp, label: 'Progress' },
  { to: '/improve', icon: Zap, label: 'Improve' },
  { to: '/you', icon: User, label: 'You' },
] as const;

export default function BottomTabBar() {
  return (
    <nav aria-label="Main navigation" className="app-tabbar pb-safe">
      <div className="grid grid-cols-4 gap-1">
        {TABS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `tab-item px-2 pb-2 pt-4 ${isActive ? 'active' : ''}`}
          >
            <Icon size={20} strokeWidth={1.5} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
