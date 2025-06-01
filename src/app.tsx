import React, { useState, useEffect } from &#39;react&#39;;
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from &#39;react-router-dom&#39;;
import BottomTabBar from &#39;./components/layout/BottomTabBar&#39;;
import SplashScreen from &#39;./pages/SplashScreen&#39;;
import WelcomeStep from &#39;./pages/onboarding/WelcomeStep&#39;;
import AnchorStep from &#39;./pages/onboarding/AnchorStep&#39;;
import FocusSetupStep from &#39;./pages/onboarding/FocusSetupStep&#39;;
import HomeScreen from &#39;./pages/HomeScreen&#39;;
import ProgressScreen from &#39;./pages/ProgressScreen&#39;;
import DetailScreen from &#39;./pages/DetailScreen&#39;;
import ImproveScreen from &#39;./pages/ImproveScreen&#39;;
import YouScreen from &#39;./pages/YouScreen&#39;;
import SubscriptionScreen from &#39;./pages/SubscriptionScreen&#39;;
import PrivacyPolicyPage from &#39;./pages/PrivacyPolicyPage&#39;;
import TermsServicePage from &#39;./pages/TermsServicePage&#39;;
import HelpFAQPage from &#39;./pages/HelpFAQPage&#39;;
import LoginPage from &#39;./pages/auth/LoginPage&#39;;
import RegisterPage from &#39;./pages/auth/RegisterPage&#39;;
import { useAppStore } from &#39;./store/useAppStore&#39;;
import { supabase } from &#39;./services/supabaseClient&#39;;

// Define KAIROS Phases
export const KAIROS\_PHASES = {
KICKOFF: "KICKOFF",
ANCHOR: "ANCHOR",
INCREASE: "INCREASE",
RHYTHM: "RHYTHM",
OWN: "OWN",
SUSTAIN: "SUSTAIN",
PREP: "PREP",
COMPLETE: "CYCLE COMPLETE"
};

// Helper to get current KAIROS phase
export const getCurrentKairosPhase = (dayInCycle: number) =\> {
if (dayInCycle \<= 0) return KAIROS\_PHASES.PREP; // [cite: 25]
if (dayInCycle \>= 1 && dayInCycle \<= 14) return KAIROS\_PHASES.KICKOFF; // [cite: 26]
if (dayInCycle \>= 15 && dayInCycle \<= 28) return KAIROS\_PHASES.ANCHOR; // [cite: 26]
if (dayInCycle \>= 29 && dayInCycle \<= 42) return KAIROS\_PHASES.INCREASE; // [cite: 27]
if (dayInCycle \>= 43 && dayInCycle \<= 56) return KAIROS\_PHASES.RHYTHM; // [cite: 27]
if (dayInCycle \>= 57 && dayInCycle \<= 70) return KAIROS\_PHASES.OWN; // [cite: 28]
if (dayInCycle \>= 71 && dayInCycle \<= 84) return KAIROS\_PHASES.SUSTAIN; // [cite: 28]
return KAIROS\_PHASES.COMPLETE; // [cite: 29]
};

// Helper to get current day in cycle
export const getDayInCycle = (startDate: string | null | undefined): number =\> {
if (\!startDate) return 0; // [cite: 29]
const today = new Date(); // [cite: 30]
const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()); // [cite: 31]
const cycleStart = new Date(startDate); // [cite: 31]
const cycleStartUTC = Date.UTC(cycleStart.getUTCFullYear(), cycleStart.getUTCMonth(), cycleStart.getUTCDate()); // [cite: 31]
return Math.floor((todayUTC - cycleStartUTC) / (1000 \* 60 \* 60 \* 24)) + 1; // [cite: 32]
};

const AppRoutes: React.FC = () =\> {
const { isOnboarded, userSession, profile } = useAppStore(); // [cite: 33]
const location = useLocation(); // [cite: 33]
const showTabBarRoutes = ['/home', '/progress', '/detail', '/improve', '/you']; // [cite: 34]
const shouldShowTabBar = userSession && isOnboarded && profile?.display\_name && showTabBarRoutes.includes(location.pathname); // [cite: 34]

return (
\<\>
\<main className={`flex-grow ${shouldShowTabBar ? 'pb-16 md:pb-0' : ''}`}\>
&lt;Routes&gt;
\<Route path="/" element={
userSession ? (isOnboarded && profile?.display\_name ? &lt;Navigate to=&quot;/home&quot; /&gt; : &lt;Navigate to=&quot;/onboarding/welcome&quot; /&gt;)
: &lt;Navigate to=&quot;/login&quot; /&gt;
} /\>
\<Route path="/login" element={userSession ? &lt;Navigate to=&quot;/home&quot; /&gt; : &lt;LoginPage /&gt;} /\>
\<Route path="/register" element={userSession ? &lt;Navigate to=&quot;/home&quot; /&gt; : &lt;RegisterPage /&gt;} /\>
\<Route path="/splash" element={&lt;SplashScreen /&gt;} /\>
\<Route path="/onboarding/welcome" element={\!userSession ? &lt;Navigate to=&quot;/login&quot;/&gt; : (isOnboarded && profile?.display\_name ? &lt;Navigate to=&quot;/home&quot; /&gt; : &lt;WelcomeStep /&gt;)} /\>
\<Route path="/onboarding/anchor" element={\!userSession ? &lt;Navigate to=&quot;/login&quot;/&gt; : &lt;AnchorStep /&gt;} /\>
\<Route path="/onboarding/focus-setup" element={\!userSession ? &lt;Navigate to=&quot;/login&quot;/&gt; : &lt;FocusSetupStep /&gt;} /\>
\<Route path="/home" element={userSession && isOnboarded ? &lt;HomeScreen /&gt; : &lt;Navigate to=&quot;/&quot; /&gt;} /\>
\<Route path="/progress" element={userSession && isOnboarded ? &lt;ProgressScreen /&gt; : &lt;Navigate to=&quot;/&quot; /&gt;} /\>
\<Route path="/detail" element={userSession && isOnboarded ? &lt;DetailScreen /&gt; : &lt;Navigate to=&quot;/&quot; /&gt;} /\>
\<Route path="/improve" element={userSession && isOnboarded ? &lt;ImproveScreen /&gt; : &lt;Navigate to=&quot;/&quot; /&gt;} /\>
\<Route path="/you" element={userSession && isOnboarded ? &lt;YouScreen /&gt; : &lt;Navigate to=&quot;/&quot; /&gt;} /\>
\<Route path="/subscription" element={userSession ? &lt;SubscriptionScreen /&gt; : &lt;Navigate to=&quot;/login&quot; /&gt;} /\>
\<Route path="/privacy-policy" element={&lt;PrivacyPolicyPage /&gt;} /\>
\<Route path="/terms-of-service" element={&lt;TermsServicePage /&gt;} /\>
\<Route path="/help-faq" element={&lt;HelpFAQPage /&gt;} /\>
\<Route path="\*" element={&lt;Navigate to=&quot;/&quot; /&gt;} /\>
&lt;/Routes&gt;
&lt;/main&gt;
{shouldShowTabBar && &lt;BottomTabBar /&gt;}
\</\>
);
}

const App: React.FC = () =\> {
const { setUserSession, loadInitialData, userSession } = useAppStore(); // [cite: 44]
const [loadingAuth, setLoadingAuth] = useState(true); // [cite: 45]

useEffect(() =\> {
const initializeApp = async () =\> {
setLoadingAuth(true); // [cite: 45]
const { data: { session } } = await supabase.auth.getSession(); // [cite: 45]
setUserSession(session); // [cite: 45]
