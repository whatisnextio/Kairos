import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/services/supabaseClient';

// Pages
import SplashScreen from '@/pages/SplashScreen';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import OnboardingFlow from '@/pages/onboarding/OnboardingFlow';
import HomeScreen from '@/pages/HomeScreen';
import ProgressScreen from '@/pages/ProgressScreen';
import DetailScreen from '@/pages/DetailScreen';
import ImproveScreen from '@/pages/ImproveScreen';
import YouScreen from '@/pages/YouScreen';
import SubscriptionScreen from '@/pages/SubscriptionScreen';
import PrivacyPolicyPage from '@/pages/PrivacyPolicyPage';
import TermsServicePage from '@/pages/TermsServicePage';
import HelpFAQPage from '@/pages/HelpFAQPage';
import AdminMetricsPage from '@/pages/AdminMetricsPage';
import AppShell from '@/components/layout/AppShell';

export default function App() {
  const { authUser, profile, onboardingComplete, setAuthUser, isAuthLoading } =
    useAppStore();

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

  if (isAuthLoading) return <SplashScreen />;

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
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/progress" element={<ProgressScreen />} />
          <Route path="/detail/:domain" element={<DetailScreen />} />
          <Route path="/improve" element={<ImproveScreen />} />
          <Route path="/you" element={<YouScreen />} />
          <Route path="/subscription" element={<SubscriptionScreen />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsServicePage />} />
          <Route path="/help" element={<HelpFAQPage />} />
          <Route path="/admin/metrics" element={<AdminMetricsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </HashRouter>
  );
}
