import { Routes, Route, Navigate } from "react-router-dom";
import { SchoolProvider, useSchool } from "./contexts/SchoolContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Spinner } from "./components/ui";
import Layout from "./components/Layout";
import PromotionPage from "./pages/promotion/PromotionPage";

// Main tenant pages
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

// Parent result checker (public)
import CheckResultPage from "./pages/public/CheckResultPage";

import TermsOfServicePage from "./pages/public/TermsOfServicePage";
import PrivacyPolicyPage from "./pages/public/PrivacyPolicyPage";

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

  const profileLoading = user && !profile;
  const isPending = profile?.status === "pending";

  return (
    <Routes>
      {/* Root — parents land straight on result checker */}
      <Route path="/" element={<Navigate to="/check-result" replace />} />

      {/* Public parent result checker */}
      <Route path="/check-result" element={<CheckResultPage />} />

      <Route path="/terms-of-service" element={<TermsOfServicePage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />

      {/* Staff signup */}
      <Route
        path="/staff-join"
        element={
          user ? <Navigate to="/dashboard" replace /> : <StaffJoinPage />
        }
      />

      {/* Login */}
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

      {/* Pending */}
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

      {/* Admin */}
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
        path="/promotion"
        element={
          <AdminRoute
            user={user}
            profile={profile}
            profileLoading={profileLoading}
            school={school}
          >
            <PromotionPage />
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

      <Route path="*" element={<Navigate to="/check-result" replace />} />
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
