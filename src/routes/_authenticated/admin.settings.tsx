import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { errMsg, useSettings } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: SettingsPage,
});

function zones(): string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (k: string) => string[] };
  return intl.supportedValuesOf?.("timeZone") ?? ["UTC", "Africa/Casablanca", "Europe/London", "Europe/Paris"];
}

function SettingsPage() {
  const qc = useQueryClient();
  const { data } = useSettings();
  const [tz, setTz] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (data) setTz(data.timezone);
  }, [data]);

  async function save() {
    setBusy(true);
    const { error } = await supabase.from("app_settings").update({ timezone: tz, updated_at: new Date().toISOString() }).eq("id", 1);
    setBusy(false);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success("Timezone saved");
    qc.invalidateQueries({ queryKey: ["settings"] });
  }

  return (
    <Card className="max-w-lg shadow-card">
      <CardHeader>
        <CardTitle>Business timezone</CardTitle>
        <CardDescription>The daily reset happens at 00:00 in this timezone. Past days are kept.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Timezone</Label>
          <Select value={tz} onValueChange={setTz}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Choose timezone" /></SelectTrigger>
            <SelectContent className="max-h-80">
              {zones().map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button size="lg" onClick={save} disabled={busy || !tz || tz === data?.timezone}>Save</Button>
      </CardContent>
    </Card>
  );
}
