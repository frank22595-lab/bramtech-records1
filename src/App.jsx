import { Routes, Route, Navigate } from "react-router-dom";
import { SchoolProvider, useSchool } from "./contexts/SchoolContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Spinner } from "./components/ui";
import Layout from "./components/Layout";

// Main tenant + existing admin pages
import Landing from "./pages/Landing";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import SetupWizard from "./pages/setup/SetupWizard";
import SchoolPage from "./pages/school/SchoolPage";
import TermsListPage from "./pages/terms/TermsListPage";
import TermWorkspace from "./pages/terms/TermWorkspace";
import ReportsBrowsePage from "./pages/reports/ReportsBrowsePage";
import ReportDesignPage from "./pages/reports/ReportDesignPage";
import SettingsPage from "./pages/settings/SettingsPage";

// Public school website
import HomePage from "./pages/site/HomePage";
import ProgramsPage from "./pages/site/ProgramsPage";
import AboutPage from "./pages/site/AboutPage";
import EventsPage from "./pages/site/EventsPage";
import ContactPage from "./pages/site/ContactPage";

// Parent result checker portal
import CheckResultPage from "./pages/public/CheckResultPage";

// Staff signup + pending
import StaffJoinPage from "./pages/staff/StaffJoinPage";
import StaffPendingPage from "./pages/staff/StaffPendingPage";

export default function App() {
  return (
    <SchoolProvider>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </SchoolProvider>
  );
}

function Router() {
  const { status } = useSchool();
  if (status === "loading") return <Spinner label="Loading school…" />;
  if (status === "main") {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }
  if (status === "notFound") return <NotFound />;
  return <SchoolApp />;
}

function SchoolApp() {
  const { user, profile, loading } = useAuth();
  const { school } = useSchool();

  if (loading) return <Spinner label="Signing you in…" />;

  // If a user is signed in but their profile hasn't loaded yet (e.g. a fresh
  // signup where the API is still writing the doc), show a spinner. Do not
  // treat "profile null" as "no permissions" — that leads to wrong redirects.
  const profileLoading = user && !profile;
  const isPending = profile?.status === "pending";

  return (
    <Routes>
      {/* ─── PUBLIC — no login required ─── */}
      <Route path="/" element={<HomePage />} />
      <Route path="/programs" element={<ProgramsPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/check-result" element={<CheckResultPage />} />

      {/* Staff signup — public but redirects if already signed in */}
      <Route
        path="/staff-join"
        element={
          user ? <Navigate to="/dashboard" replace /> : <StaffJoinPage />
        }
      />

      {/* Login — sends you to right place if already signed in */}
      <Route
        path="/login"
        element={
          !user ? (
            <Login />
          ) : profileLoading ? (
            <Spinner label="Loading your account…" />
          ) : isPending ? (
            <Navigate to="/staff-pending" replace />
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      {/* Pending — the pending page itself handles the "still loading profile"
          state internally, so we render it even if profile isn't loaded yet.
          Only redirect AWAY if profile is loaded and confirmed not pending. */}
      <Route
        path="/staff-pending"
        element={
          !user ? (
            <Navigate to="/login" replace />
          ) : profile && !isPending ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <StaffPendingPage />
          )
        }
      />

      {/* ─── ADMIN — login required + profile required ─── */}
      <Route
        path="/dashboard"
        element={
          <AdminRoute
            user={user}
            profile={profile}
            profileLoading={profileLoading}
            school={school}
          >
            <Dashboard />
          </AdminRoute>
        }
      />
      <Route
        path="/school"
        element={
          <AdminRoute
            user={user}
            profile={profile}
            profileLoading={profileLoading}
            school={school}
          >
            <SchoolPage />
          </AdminRoute>
        }
      />
      <Route
        path="/school/:tab"
        element={
          <AdminRoute
            user={user}
            profile={profile}
            profileLoading={profileLoading}
            school={school}
          >
            <SchoolPage />
          </AdminRoute>
        }
      />
      <Route
        path="/terms"
        element={
          <AdminRoute
            user={user}
            profile={profile}
            profileLoading={profileLoading}
            school={school}
          >
            <TermsListPage />
          </AdminRoute>
        }
      />
      <Route
        path="/terms/:termId"
        element={
          <AdminRoute
            user={user}
            profile={profile}
            profileLoading={profileLoading}
            school={school}
          >
            <TermWorkspace />
          </AdminRoute>
        }
      />
      <Route
        path="/terms/:termId/:tab"
        element={
          <AdminRoute
            user={user}
            profile={profile}
            profileLoading={profileLoading}
            school={school}
          >
            <TermWorkspace />
          </AdminRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <AdminRoute
            user={user}
            profile={profile}
            profileLoading={profileLoading}
            school={school}
          >
            <ReportsBrowsePage />
          </AdminRoute>
        }
      />
      <Route
        path="/reports/design"
        element={
          <AdminRoute
            user={user}
            profile={profile}
            profileLoading={profileLoading}
            school={school}
          >
            <ReportDesignPage />
          </AdminRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <AdminRoute
            user={user}
            profile={profile}
            profileLoading={profileLoading}
            school={school}
          >
            <SettingsPage />
          </AdminRoute>
        }
      />
      <Route
        path="/settings/:tab"
        element={
          <AdminRoute
            user={user}
            profile={profile}
            profileLoading={profileLoading}
            school={school}
          >
            <SettingsPage />
          </AdminRoute>
        }
      />
      <Route
        path="/setup/*"
        element={
          <SetupRoute
            user={user}
            profile={profile}
            profileLoading={profileLoading}
          />
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AdminRoute({ user, profile, profileLoading, school, children }) {
  if (!user) return <Navigate to="/login" replace />;
  if (profileLoading) return <Spinner label="Loading your account…" />;
  if (profile?.status === "pending")
    return <Navigate to="/staff-pending" replace />;
  const needsSetup = !school || !school.setupComplete;
  if (needsSetup) {
    if (profile?.role === "director") return <Navigate to="/setup" replace />;
    return <SetupInProgress />;
  }
  return <Layout>{children}</Layout>;
}

function SetupRoute({ user, profile, profileLoading }) {
  if (!user) return <Navigate to="/login" replace />;
  if (profileLoading) return <Spinner label="Loading your account…" />;
  if (profile?.status === "pending")
    return <Navigate to="/staff-pending" replace />;
  if (profile?.role !== "director") return <SetupInProgress />;
  return <SetupWizard />;
}

function SetupInProgress() {
  return (
    <div className="max-w-lg mx-auto mt-24 text-center px-4">
      <h2 className="text-xl font-semibold mb-2">Setup in progress</h2>
      <p className="text-ink-soft">
        Your school director is still setting up the portal. Please check back
        soon.
      </p>
    </div>
  );
}
