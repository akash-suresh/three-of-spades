/*
 * Layout — Dark Casino / Art Deco Design System
 * Persistent sidebar navigation with ♠ branding
 * Gold accents, dark green felt background
 */
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Trophy, BarChart3, Swords, LayoutDashboard, Menu, X, Medal } from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/rankings", label: "Rankings", icon: BarChart3 },
  { href: "/tournaments", label: "Tournaments", icon: Trophy },
  { href: "/head-to-head", label: "Head to Head", icon: Swords },
  { href: "/career-stats", label: "Career Stats", icon: Medal },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex" style={{ background: "oklch(0.10 0.012 155)" }}>
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300",
          "lg:translate-x-0 lg:static lg:z-auto",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          background: "oklch(0.11 0.014 155)",
          borderRight: "1px solid oklch(0.22 0.03 155)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6" style={{ borderBottom: "1px solid oklch(0.22 0.03 155)" }}>
          <div
            className="w-10 h-10 flex items-center justify-center text-2xl font-bold rounded"
            style={{
              background: "oklch(0.18 0.02 155)",
              border: "1px solid oklch(0.78 0.15 85 / 0.4)",
              color: "oklch(0.78 0.15 85)",
              fontFamily: "serif",
            }}
          >
            ♠
          </div>
          <div>
            <div
              className="text-sm font-semibold tracking-wider uppercase"
              style={{ color: "oklch(0.78 0.15 85)", fontFamily: "'Playfair Display', serif" }}
            >
              3 of Spades
            </div>
            <div className="text-xs" style={{ color: "oklch(0.55 0.02 85)" }}>
              Championship Tracker
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = location === href || (href === "/career-stats" && location.startsWith("/players/"));
            return (
              <Link key={href} href={href}>
                <div
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-all duration-150 cursor-pointer",
                    isActive
                      ? "text-[oklch(0.10_0.012_155)]"
                      : "hover:bg-[oklch(0.16_0.02_155)]"
                  )}
                  style={
                    isActive
                      ? {
                          background: "oklch(0.78 0.15 85)",
                          color: "oklch(0.10 0.012 155)",
                        }
                      : { color: "oklch(0.75 0.015 85)" }
                  }
                >
                  <Icon size={16} />
                  {label}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4" style={{ borderTop: "1px solid oklch(0.22 0.03 155)" }}>
          <div className="text-xs" style={{ color: "oklch(0.40 0.02 85)" }}>
            28 Tournaments · 5 Players
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: "oklch(0 0 0 / 0.6)" }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header
          className="lg:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-30"
          style={{
            background: "oklch(0.11 0.014 155)",
            borderBottom: "1px solid oklch(0.22 0.03 155)",
          }}
        >
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded"
            style={{ color: "oklch(0.75 0.015 85)" }}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div
            className="text-sm font-semibold tracking-wider"
            style={{ color: "oklch(0.78 0.15 85)", fontFamily: "'Playfair Display', serif" }}
          >
            ♠ 3 of Spades
          </div>
          <div className="w-9" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
