import type { ReactNode } from 'react';
import BottomTabBar from './BottomTabBar';

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex flex-col h-full max-w-md mx-auto bg-base-black"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <main
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      >
        {children}
      </main>
      <BottomTabBar />
    </div>
  );
}
