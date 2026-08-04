import type { ReactNode } from 'react';
import BottomTabBar from './BottomTabBar';

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <main
        className="app-main"
        style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
      >
        {children}
      </main>
      <BottomTabBar />
    </div>
  );
}
