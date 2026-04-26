import { NavLink } from 'react-router-dom';
import { Home, TrendingUp, Zap, User } from 'lucide-react';

const TABS = [
  { to: '/',         icon: Home,        label: 'Home' },
  { to: '/progress', icon: TrendingUp,  label: 'Progress' },
  { to: '/improve',  icon: Zap,         label: 'Improve' },
  { to: '/you',      icon: User,        label: 'You' },
] as const;

export default function BottomTabBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-base-surface border-t border-base-border pb-safe">
      <div className="flex items-stretch">
        {TABS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `tab-item flex-1 py-3 ${isActive ? 'active' : ''}`
            }
          >
            <Icon size={20} strokeWidth={1.5} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
