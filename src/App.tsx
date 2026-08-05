import { useBootstrap } from '@/hooks/useBootstrap';
import {
  cancelDailyNotifications,
  scheduleDailyNotifications,
} from '@/services/localNotifications';
import { supabase } from '@/services/supabaseClient';
import { useAppStore } from '@/store/useAppStore';
import { DEV_EMAIL, DEV_USER_ID, hasLocalDevSession } from '@/utils/localDevSession';
import { type ReactNode, Suspense, lazy, useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';

import ErrorBoundary from '@/components/common/ErrorBoundary';
import AppShell from '@/components/layout/AppShell';
import PwaInstallPrompt from '@/components/pwa/PwaInstallPrompt';
import HomeScreen from '@/pages/HomeScreen';
import ImproveScreen from '@/pages/ImproveScreen';
import ProgressScreen from '@/pages/ProgressScreen';
// Critical path: in the main bundle
import SplashScreen from '@/pages/SplashScreen';
import YouScreen from '@/pages/YouScreen';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import OnboardingFlow from '@/pages/onboarding/OnboardingFlow';

// Non-critical: lazy loaded
const DetailScreen = lazy(() => import('@/pages/DetailScreen'));
const PrivacyPolicyPage = lazy(() => import('@/pages/PrivacyPolicyPage'));
const TermsServicePage = lazy(() => import('@/pages/TermsServicePage'));
const HelpFAQPage = lazy(() => import('@/pages/HelpFAQPage'));
const AdminMetricsPage = lazy(() => import('@/pages/AdminMetricsPage'));
const NewCycleScreen = lazy(() => import('@/pages/NewCycleScreen'));

function PageFallback() {
  return <div className="px-4 pt-10 text-base-subtext text-sm">Loading...</div>;
}

function withInstallPrompt(content: ReactNode) {
  return (
    <>
      {content}
      <PwaInstallPrompt />
    </>
  );
}

export default function App() {
  const {
    authUser,
    profile,
    onboardingComplete,
    setAuthUser,
    isAuthLoading,
    isBootstrapLoading,
    bootstrapError,
    currentCycle,
    celebrationPending,
    notificationPreferences,
    refreshOfflineSyncState,
    flushPendingSync,
  } = useAppStore();

  useBootstrap();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (hasLocalDevSession()) {
        setAuthUser({ id: DEV_USER_ID, email: DEV_EMAIL });
        return;
      }

      const user = data.session?.user;
      setAuthUser(user ? { id: user.id, email: user.email ?? '' } : null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && hasLocalDevSession()) {
        setAuthUser({ id: DEV_USER_ID, email: DEV_EMAIL });
        return;
      }

      const user = session?.user;
      setAuthUser(user ? { id: user.id, email: user.email ?? '' } : null);
    });

    return () => listener.subscription.unsubscribe();
  }, [setAuthUser]);

  useEffect(() => {
    if (!authUser) return;
    refreshOfflineSyncState().catch(() => {});
    flushPendingSync().catch(() => {});

    window.addEventListener('online', flushPendingSync);
    return () => window.removeEventListener('online', flushPendingSync);
  }, [authUser, refreshOfflineSyncState, flushPendingSync]);

  // Schedule native notifications once the user is authenticated
  useEffect(() => {
    if (!authUser || !notificationPreferences.enabled) {
      cancelDailyNotifications().catch(() => {});
      return;
    }

    scheduleDailyNotifications(notificationPreferences).catch(() => {});
  }, [authUser, notificationPreferences]);

  if (isAuthLoading || isBootstrapLoading || bootstrapError) {
    return <SplashScreen errorMessage={bootstrapError} onRetry={() => window.location.reload()} />;
  }

  if (!authUser) {
    return (
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </HashRouter>
    );
  }

  if (!onboardingComplete || !profile) {
    return (
      <HashRouter>
        <Routes>
          <Route path="/onboarding/*" element={<OnboardingFlow />} />
          <Route path="*" element={<Navigate to="/onboarding" replace />} />
        </Routes>
      </HashRouter>
    );
  }

  return withInstallPrompt(
    <HashRouter>
      <AppShell>
        <ErrorBoundary>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route
                path="/"
                element={
                  currentCycle && currentCycle.status !== 'active' && !celebrationPending ? (
                    <Navigate to="/new-cycle" replace />
                  ) : (
                    <HomeScreen />
                  )
                }
              />
              <Route path="/progress" element={<ProgressScreen />} />
              <Route path="/detail/:domain" element={<DetailScreen />} />
              <Route path="/improve" element={<ImproveScreen />} />
              <Route path="/you" element={<YouScreen />} />
              <Route path="/subscription" element={<Navigate to="/you" replace />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsServicePage />} />
              <Route path="/help" element={<HelpFAQPage />} />
              <Route path="/admin/metrics" element={<AdminMetricsPage />} />
              <Route path="/new-cycle" element={<NewCycleScreen />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </AppShell>
    </HashRouter>,
  );
}
