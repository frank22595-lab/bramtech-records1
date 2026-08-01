import { Link, useLocation } from "react-router-dom";
import {
  GraduationCap,
  Home,
  Building2,
  Calendar,
  BookOpen,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useSchool } from "../contexts/SchoolContext";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: Home,       roles: ["director", "admin", "teacher", "parent"] },
  { to: "/school",    label: "School",    icon: Building2,  roles: ["director", "admin", "teacher"] },
  { to: "/terms",     label: "Terms",     icon: Calendar,   roles: ["director", "admin", "teacher"] },
  { to: "/reports",   label: "Reports",   icon: BookOpen,   roles: ["director", "admin", "teacher", "parent"] },
  { to: "/settings",  label: "Settings",  icon: Settings,   roles: ["director", "admin"] },
];

export default function Layout({ children }) {
  const { profile, logout } = useAuth();
  const { school } = useSchool();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = NAV_ITEMS.filter((item) => item.roles.includes(profile?.role));

  // Close drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Close drawer on Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const isActive = (to) =>
    location.pathname === to || location.pathname.startsWith(to + "/");

  const roleLabel = profile?.role
    ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
    : "";

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      {/* Mobile top bar */}
      <div className="md:hidden bg-white border-b border-slate-200 flex items-center justify-between px-3 py-2.5 sticky top-0 z-20">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-4 h-4 text-brand-700" />
          </div>
          <span className="font-semibold truncate">
            {school?.shortName || school?.name || "Portal"}
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg hover:bg-slate-100 active:scale-95 transition-all"
          aria-label="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-30 animate-fade-in"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar (desktop) / drawer (mobile) */}
      <aside
        className={`
          bg-white border-slate-200
          fixed md:sticky md:top-0
          top-0 left-0
          w-64 h-screen z-40
          flex flex-col
          md:w-60 md:flex-shrink-0
          md:border-r md:h-screen
          transform transition-transform duration-200 ease-out
          ${mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Brand header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-4 h-4 text-brand-700" />
            </div>
            <span className="font-semibold truncate">
              {school?.shortName || school?.name || "Portal"}
            </span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 rounded hover:bg-slate-100 text-ink-soft"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="p-2 flex-1 overflow-y-auto">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`
                  relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-0.5
                  transition-all duration-150
                  ${active
                    ? "bg-brand-50 text-brand-700 font-medium"
                    : "text-ink hover:bg-slate-50 active:bg-slate-100"
                  }
                `}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-brand-600 rounded-r-full" />
                )}
                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-brand-600" : ""}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User + sign out */}
        <div className="p-3 border-t border-slate-100">
          <div className="px-2 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                {(profile?.fullName || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm text-ink truncate">
                  {profile?.fullName}
                </div>
                {roleLabel && (
                  <div className="text-xs text-ink-soft">{roleLabel}</div>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-2 py-2 text-sm text-ink-soft hover:text-ink hover:bg-slate-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        {children}
      </main>

      {/* Fade-in keyframes injected globally via style tag */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 180ms ease-out; }
      `}</style>
    </div>
  );
}

// Reusable tab bar component (used inside School page, Term workspace, Reports, Settings)
export function TabBar({ tabs, activeTab, onSelect }) {
  return (
    <div className="border-b border-slate-200 mb-6 -mx-4 md:-mx-8 px-4 md:px-8 overflow-x-auto">
      <div className="flex gap-1 min-w-max">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = t.id === activeTab;
          return (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              className={`px-3 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
                active
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              {Icon && <Icon className="w-4 h-4" />} {t.label}
              {t.badge != null && (
                <span
                  className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
                    active
                      ? "bg-brand-100 text-brand-700"
                      : "bg-slate-100 text-ink-soft"
                  }`}
                >
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
