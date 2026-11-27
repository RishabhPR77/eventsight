import { lazy, Suspense, useEffect } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import AppShell from "@/components/layout/AppShell";
import WakeBanner from "@/components/layout/WakeBanner";
import { AiWakeOverlay, ServerGate, ServerWaitScreen } from "@/components/layout/WakeScreen";
import { PageSpinner } from "@/components/ui/Primitives";
import { useAuth } from "@/context/AuthContext";
import { useServerStatus } from "@/hooks/useServerStatus";
import { wasSignedIn } from "@/lib/session";
import { wakeServer } from "@/lib/wake";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const RoleLandingPage = lazy(() => import("./pages/RoleLandingPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const VerifyOtpPage = lazy(() => import("./pages/VerifyOtpPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const OrganizerDashboard = lazy(() => import("./pages/OrganizerDashboard"));
const OrganizerEventPage = lazy(() => import("./pages/OrganizerEventPage"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const OrganizerOffersPage = lazy(() => import("./pages/OrganizerOffersPage"));
const SponsorDashboard = lazy(() => import("./pages/SponsorDashboard"));
const SponsorshipsPage = lazy(() => import("./pages/SponsorshipsPage"));
const BrandProfilePage = lazy(() => import("./pages/BrandProfilePage"));
const SponsorEventPage = lazy(() => import("./pages/SponsorEventPage"));
const SponsorAnalysisPage = lazy(() => import("./pages/SponsorAnalysisPage"));
const SponsorWisePage = lazy(() => import("./pages/SponsorWisePage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const MessagesPage = lazy(() => import("./pages/MessagesPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const LegalPage = lazy(() => import("./pages/LegalPage"));

// While the session check waits on a sleeping server, say so instead of spinning silently
function SessionCheck() {
  const { status, retry } = useServerStatus();
  if (status === "awake") return <PageSpinner label="Getting things ready…" />;
  return <ServerWaitScreen failed={status === "failed"} onRetry={retry} />;
}

function Home() {
  const { user, ready } = useAuth();
  if (!ready && wasSignedIn()) return <SessionCheck />;
  if (!user) return <LandingPage />;
  return (
    <AppShell>
      <Suspense fallback={<PageSpinner />}>
        {user.role === "sponsor" ? <SponsorDashboard /> : <OrganizerDashboard />}
      </Suspense>
    </AppShell>
  );
}

function RequireAuth({ role }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) return <SessionCheck />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (role && user.role !== role) return <Navigate to="/" replace />;

  return (
    <AppShell>
      <Suspense fallback={<PageSpinner />}>
        <Outlet />
      </Suspense>
    </AppShell>
  );
}

function PublicOnly() {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (ready && user) return <Navigate to={location.state?.from || "/"} replace />;
  return <Outlet />;
}

export default function App() {
  // Start waking the server the moment anyone opens the site, so it's usually
  // up by the time they click "Sign in" or "Get started"
  useEffect(() => {
    wakeServer();
  }, []);

  return (
    <>
      <WakeBanner />
      <AiWakeOverlay />
      <Toaster
        position="top-center"
        toastOptions={{
          style: { borderRadius: "12px", background: "#132B2C", color: "#fff", fontSize: "14px" },
          success: { iconTheme: { primary: "#F2A31B", secondary: "#132B2C" } },
        }}
      />
      <Suspense fallback={<PageSpinner />}>
        <Routes>
          <Route path="/" element={<Home />} />

          <Route element={<PublicOnly />}>
            <Route path="/for-organizers" element={<RoleLandingPage role="organizer" />} />
            <Route path="/for-sponsors" element={<RoleLandingPage role="sponsor" />} />
            {/* These forms talk to the server, so they open once it's awake */}
            <Route element={<ServerGate />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Route>
          </Route>
          <Route element={<ServerGate />}>
            <Route path="/verify-otp" element={<VerifyOtpPage />} />
          </Route>
          <Route path="/privacy" element={<LegalPage document="privacy" />} />
          <Route path="/terms" element={<LegalPage document="terms" />} />

          <Route element={<RequireAuth />}>
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/messages/:id" element={<MessagesPage />} />
          </Route>
          <Route element={<RequireAuth role="organizer" />}>
            <Route path="/organizer/event/:id" element={<OrganizerEventPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/offers" element={<OrganizerOffersPage />} />
          </Route>
          <Route element={<RequireAuth role="sponsor" />}>
            <Route path="/sponsorships" element={<SponsorshipsPage />} />
            <Route path="/brand" element={<BrandProfilePage />} />
            <Route path="/sponsor-wise" element={<SponsorWisePage />} />
            <Route path="/sponsor/event/:id" element={<SponsorEventPage />} />
            <Route path="/sponsor/analysis/:id" element={<SponsorAnalysisPage />} />
          </Route>

          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}
