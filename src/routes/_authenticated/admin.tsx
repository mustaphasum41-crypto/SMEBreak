import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsAdmin } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin · SME Break Tracker" },
      { name: "description", content: "Manage breaks, SMEs and settings." },
      { property: "og:title", content: "Admin · SME Break Tracker" },
      { property: "og:description", content: "Manage breaks, SMEs and settings." },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const { data, isLoading } = useIsAdmin();
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  if (isLoading) return <AppShell><Skeleton className="h-64" /></AppShell>;
  if (!data?.isAdmin)
    return (
      <AppShell>
        <div className="mx-auto max-w-md rounded-xl border bg-card p-8 text-center shadow-card">
          <h1 className="text-xl font-bold">No admin access</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {data?.user?.email} is signed in but isn't an admin.
          </p>
          <Button className="mt-6" variant="outline" onClick={signOut}><LogOut /> Sign out</Button>
        </div>
      </AppShell>
    );

  const tabs = [
    { to: "/admin", label: "Overview" },
    { to: "/admin/smes", label: "SME Management" },
    { to: "/admin/settings", label: "Settings" },
  ] as const;

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
          <p className="text-sm text-muted-foreground">{data.user?.email}</p>
        </div>
        <Button variant="outline" onClick={signOut}><LogOut /> Sign out</Button>
      </div>
      <div className="mb-6 flex flex-wrap gap-2 border-b pb-3">
        {tabs.map((t) => (
          <Button key={t.to} asChild variant="choice" size="sm" className="border">
            <Link to={t.to} activeOptions={{ exact: true }}>
              {t.label}
            </Link>
          </Button>
        ))}
      </div>
      <Outlet />
    </AppShell>
  );
}
