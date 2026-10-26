import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Pencil, Plus, RotateCcw, Trash2, UserX, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { errMsg, useSmes, type Sme } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/admin/smes")({
  component: SmeManagement,
});

function SmeManagement() {
  const qc = useQueryClient();
  const { data: smes } = useSmes();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleting, setDeleting] = useState<Sme | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["smes"] });

  const exists = (n: string, exceptId?: string) =>
    (smes ?? []).some((s) => s.id !== exceptId && s.name.toLowerCase() === n.trim().toLowerCase());

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) { toast.error("Enter a name."); return; }
    if (n.length > 80) { toast.error("Name must be 80 characters or fewer."); return; }
    if (exists(n)) { toast.error("An SME with that name already exists."); return; }
    const { error } = await supabase.from("smes").insert({ name: n });
    if (error) { toast.error(errMsg(error)); return; }
    toast.success(`${n} added`);
    setName("");
    refresh();
  }

  async function saveEdit(id: string) {
    const n = editName.trim();
    if (!n) { toast.error("Name can't be empty."); return; }
    if (exists(n, id)) { toast.error("An SME with that name already exists."); return; }
    const { error } = await supabase.from("smes").update({ name: n }).eq("id", id);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success("Name updated");
    setEditing(null);
    refresh();
  }

  async function setActive(s: Sme, active: boolean) {
    const { error } = await supabase.from("smes").update({ active }).eq("id", s.id);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success(active ? `${s.name} restored` : `${s.name} deactivated`);
    refresh();
  }

  async function remove() {
    if (!deleting) return;
    const { error } = await supabase.from("smes").delete().eq("id", deleting.id);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success(`${deleting.name} removed. Past breaks stay in history.`);
    setDeleting(null);
    refresh();
  }

  const active = (smes ?? []).filter((s) => s.active);
  const inactive = (smes ?? []).filter((s) => !s.active);

  const row = (s: Sme) => (
    <li key={s.id} className="flex items-center gap-2 px-4 py-3">
      {editing === s.id ? (
        <>
          <Input value={editName} maxLength={80} onChange={(e) => setEditName(e.target.value)} className="h-10" autoFocus />
          <Button size="icon" onClick={() => saveEdit(s.id)} aria-label="Save"><Check /></Button>
          <Button size="icon" variant="ghost" onClick={() => setEditing(null)} aria-label="Cancel"><X /></Button>
        </>
      ) : (
        <>
          <span className="flex-1 font-medium">{s.name}</span>
          <Button size="icon" variant="ghost" aria-label="Edit name" onClick={() => { setEditing(s.id); setEditName(s.name); }}><Pencil /></Button>
          {s.active ? (
            <Button size="sm" variant="outline" onClick={() => setActive(s, false)}><UserX /> Deactivate</Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setActive(s, true)}><RotateCcw /> Restore</Button>
          )}
          <Button size="icon" variant="ghost" aria-label="Remove" onClick={() => setDeleting(s)}><Trash2 /></Button>
        </>
      )}
    </li>
  );

  return (
    <div className="space-y-6">
      <Alert>
        <AlertDescription>
          The list starts with <strong>sample names</strong>. Replace them here with your real team: edit names, add new SMEs, and deactivate or remove the samples.
        </AlertDescription>
      </Alert>
      <form onSubmit={add} className="flex gap-2">
        <Input placeholder="New SME name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} className="h-12" />
        <Button type="submit" size="lg" className="h-12"><Plus /> Add SME</Button>
      </form>
      <section>
        <h2 className="mb-2 font-semibold">Active ({active.length})</h2>
        <ul className="divide-y rounded-xl border bg-card shadow-card">
          {active.length ? active.map(row) : <li className="p-6 text-center text-sm text-muted-foreground">No active SMEs.</li>}
        </ul>
      </section>
      <section>
        <h2 className="mb-2 font-semibold">Deactivated ({inactive.length})</h2>
        <ul className="divide-y rounded-xl border bg-card">
          {inactive.length ? inactive.map(row) : <li className="p-6 text-center text-sm text-muted-foreground">No deactivated SMEs.</li>}
        </ul>
      </section>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They'll be permanently removed from the list. Their past breaks stay in history. To keep the option to restore them, deactivate instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
