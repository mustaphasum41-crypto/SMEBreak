import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Coffee, History, LayoutDashboard, Shield, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsAdmin, useLiveSync } from "@/lib/data";

export function AppShell({ children }: { children: ReactNode }) {
  useLiveSync();
  const { data } = useIsAdmin();
  const links = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/start", label: "Start Break", icon: PlusCircle },
    { to: "/history", label: "History", icon: History },
  ] as const;
  return (
    <div className="min-h-screen">
      <header className="bg-header text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <span className="grid size-9 place-items-center rounded-lg bg-primary-foreground/15">
              <Coffee className="size-5" />
            </span>
            SME Break Tracker
          </Link>
          <nav className="flex flex-wrap items-center gap-1">
            {links.map((l) => (
              <Button key={l.to} asChild variant="nav" size="sm">
                <Link to={l.to} activeOptions={{ exact: true }}>
                  <l.icon /> {l.label}
                </Link>
              </Button>
            ))}
            <Button asChild variant="nav" size="sm">
              <Link to={data?.isAdmin ? "/admin" : "/auth"}>
                <Shield /> {data?.isAdmin ? "Admin" : "Admin login"}
              </Link>
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
