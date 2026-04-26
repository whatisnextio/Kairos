import type { ReactNode } from 'react';
import BottomTabBar from './BottomTabBar';

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-full max-w-md mx-auto bg-base-black">
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>
      <BottomTabBar />
    </div>
  );
}
