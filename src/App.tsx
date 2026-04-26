import { useBootstrap } from '@/hooks/useBootstrap';
import { supabase } from '@/services/supabaseClient';
import { useAppStore } from '@/store/useAppStore';
import { Suspense, lazy, useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';

import ErrorBoundary from '@/components/common/ErrorBoundary';
import AppShell from '@/components/layout/AppShell';
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
const SubscriptionScreen = lazy(() => import('@/pages/SubscriptionScreen'));
const PrivacyPolicyPage = lazy(() => import('@/pages/PrivacyPolicyPage'));
const TermsServicePage = lazy(() => import('@/pages/TermsServicePage'));
const HelpFAQPage = lazy(() => import('@/pages/HelpFAQPage'));
const AdminMetricsPage = lazy(() => import('@/pages/AdminMetricsPage'));
const NewCycleScreen = lazy(() => import('@/pages/NewCycleScreen'));

function PageFallback() {
  return <div className="px-4 pt-10 text-base-subtext text-sm">Loading...</div>;
}

export default function App() {
  const {
    authUser,
    profile,
    onboardingComplete,
    setAuthUser,
    isAuthLoading,
    isBootstrapLoading,
    currentCycle,
    celebrationPending,
  } = useAppStore();

  useBootstrap();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      setAuthUser(user ? { id: user.id, email: user.email ?? '' } : null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      setAuthUser(user ? { id: user.id, email: user.email ?? '' } : null);
    });

    return () => listener.subscription.unsubscribe();
  }, [setAuthUser]);

  if (isAuthLoading || isBootstrapLoading) return <SplashScreen />;

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

  return (
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
              <Route path="/subscription" element={<SubscriptionScreen />} />
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
    </HashRouter>
  );
}
