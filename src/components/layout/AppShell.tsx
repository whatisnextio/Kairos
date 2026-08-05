import type { ReactNode } from 'react';
import BottomTabBar from './BottomTabBar';

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <main className="app-main">{children}</main>
      <BottomTabBar />
    </div>
  );
}
