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
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useSchool } from "../contexts/SchoolContext";

const NAV_ITEMS = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: Home,
    roles: ["director", "admin", "teacher", "parent"],
  },
  {
    to: "/school",
    label: "School",
    icon: Building2,
    roles: ["director", "admin"],
  },
  {
    to: "/terms",
    label: "Terms",
    icon: Calendar,
    roles: ["director", "admin", "teacher"],
  },
  {
    to: "/reports",
    label: "Reports",
    icon: BookOpen,
    roles: ["director", "admin", "teacher", "parent"],
  },
  {
    to: "/settings",
    label: "Settings",
    icon: Settings,
    roles: ["director", "admin"],
  },
];

export default function Layout({ children }) {
  const { profile, logout } = useAuth();
  const { school } = useSchool();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = NAV_ITEMS.filter((item) => item.roles.includes(profile?.role));

  const isActive = (to) =>
    location.pathname === to || location.pathname.startsWith(to + "/");

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Mobile top bar */}
      <div className="md:hidden bg-white border-b border-slate-200 flex items-center justify-between p-3">
        <div className="flex items-center gap-2 min-w-0">
          <GraduationCap className="w-5 h-5 text-brand-600 flex-shrink-0" />
          <span className="font-semibold truncate">
            {school?.shortName || school?.name || "Portal"}
          </span>
        </div>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="p-1.5 rounded hover:bg-slate-100"
          aria-label="Menu"
        >
          {mobileOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Sidebar (desktop) / drawer (mobile) */}
      <aside
        className={`
        bg-white border-slate-200 md:w-60 md:flex-shrink-0
        md:border-r md:block md:h-screen md:sticky md:top-0
        ${mobileOpen ? "block border-b" : "hidden"}
      `}
      >
        <div className="p-4 border-b border-slate-100 hidden md:flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-brand-600" />
          <span className="font-semibold truncate">
            {school?.shortName || school?.name || "Portal"}
          </span>
        </div>
        <nav className="p-2 flex-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-0.5 ${
                  active
                    ? "bg-brand-50 text-brand-700 font-medium"
                    : "text-ink hover:bg-slate-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-100">
          <div className="text-xs text-ink-soft mb-2">
            <div className="font-medium text-ink truncate">
              {profile?.fullName}
            </div>
            <div className="capitalize">{profile?.role}</div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-ink-soft hover:text-ink"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
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
