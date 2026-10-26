import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Admin Login · SME Break Tracker" },
      { name: "description", content: "Team lead sign-in for managing SMEs, breaks and settings." },
      { property: "og:title", content: "Admin Login · SME Break Tracker" },
      { property: "og:description", content: "Team lead sign-in for managing SMEs, breaks and settings." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!email.includes("@")) return setError("Enter a valid email address.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return setError(error.message);
      toast.success("Signed in");
      navigate({ to: "/admin" });
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/admin` },
      });
      setBusy(false);
      if (error) return setError(error.message);
      setInfo("Check your email to confirm your account, then sign in.");
      setMode("in");
    }
  }

  return (
    <AppShell>
      <Card className="mx-auto max-w-md shadow-card">
        <CardHeader>
          <CardTitle className="text-2xl">{mode === "in" ? "Admin login" : "Create admin account"}</CardTitle>
          <CardDescription>
            {mode === "in"
              ? "For team leads only."
              : "The first account created becomes the admin. Later accounts need no access."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" className="h-11" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" className="h-11" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} />
            </div>
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            {info && <Alert><AlertDescription>{info}</AlertDescription></Alert>}
            <Button type="submit" size="xl" className="w-full" disabled={busy}>
              {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}
            </Button>
            <Button type="button" variant="link" className="w-full" onClick={() => setMode(mode === "in" ? "up" : "in")}>
              {mode === "in" ? "First time? Create the admin account" : "Already have an account? Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AppShell>
  );
}
