"use client";
import { useState, useEffect } from "react";
import { Patient, RendezVous } from "@/types";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarClock, Plus, Loader2, Calendar, Clock } from "lucide-react";

const TYPE_RDV_LABELS: Record<string, string> = {
  consultation: "Consultation",
  suivi: "Suivi",
  urgence: "Urgence",
  vaccination: "Vaccination",
  analyse: "Analyse",
  chirurgie: "Chirurgie",
  autre: "Autre",
};

const STATUT_CONFIG: Record<string, { label: string; className: string }> = {
  planifie:  { label: "Planifié",  className: "bg-blue-50 text-blue-700 border-blue-200" },
  confirme:  { label: "Confirmé",  className: "bg-green-50 text-green-700 border-green-200" },
  annule:    { label: "Annulé",    className: "bg-red-50 text-red-700 border-red-200" },
  effectue:  { label: "Effectué",  className: "bg-slate-50 text-slate-600 border-slate-200" },
  absent:    { label: "Absent",    className: "bg-orange-50 text-orange-700 border-orange-200" },
};

interface RendezVousTabProps {
  patient: Patient;
  rendezVous: RendezVous[];
  onRefresh: () => void;
}

export function RendezVousTab({ patient, rendezVous, onRefresh }: RendezVousTabProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  const canCreate = user?.role === "medecin" || user?.role === "super_admin" || user?.role === "admin_etablissement" || user?.role === "infirmier";

  const [etablissements, setEtablissements] = useState<{ id: string; nom: string }[]>([]);
  const [form, setForm] = useState({
    type_rdv: "consultation",
    motif: "",
    date_rdv: new Date().toISOString().slice(0, 16),
    duree_minutes: "30",
    statut: "planifie",
    notes: "",
    etablissement_id: "",
  });

  useEffect(() => {
    supabase.from("etablissements").select("id, nom").then(({ data }) => setEtablissements(data || []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("rendez_vous").insert({
        patient_id: patient.id,
        medecin_id: user.id,
        etablissement_id: form.etablissement_id || etablissements[0]?.id || null,
        date_rdv: new Date(form.date_rdv).toISOString(),
        duree_minutes: parseInt(form.duree_minutes) || 30,
        type_rdv: form.type_rdv as RendezVous["type_rdv"],
        motif: form.motif,
        statut: form.statut as RendezVous["statut"],
        notes: form.notes || null,
        cree_par: user.id,
      });
      if (error) throw error;
      toast({ title: "Rendez-vous enregistré" });
      setOpen(false);
      setForm({ type_rdv: "consultation", motif: "", date_rdv: new Date().toISOString().slice(0, 16), duree_minutes: "30", statut: "planifie", notes: "", etablissement_id: "" });
      onRefresh();
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Erreur", description: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setLoading(false);
    }
  }

  // Upcoming first, then past
  const now = new Date();
  const upcoming = rendezVous.filter((r) => new Date(r.date_rdv) >= now && r.statut !== "annule");
  const past = rendezVous.filter((r) => new Date(r.date_rdv) < now || r.statut === "annule" || r.statut === "effectue" || r.statut === "absent");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Rendez-vous ({rendezVous.length})</h3>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="medical" size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Planifier un RDV
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Rendez-vous — {patient.prenom} {patient.nom}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Type *</Label>
                    <Select value={form.type_rdv} onValueChange={(v) => setForm({ ...form, type_rdv: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(TYPE_RDV_LABELS).map(([v, l]) => (
                          <SelectItem key={v} value={v}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Statut</Label>
                    <Select value={form.statut} onValueChange={(v) => setForm({ ...form, statut: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planifie">Planifié</SelectItem>
                        <SelectItem value="confirme">Confirmé</SelectItem>
                        <SelectItem value="annule">Annulé</SelectItem>
                        <SelectItem value="effectue">Effectué</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date et heure *</Label>
                    <Input type="datetime-local" value={form.date_rdv} onChange={(e) => setForm({ ...form, date_rdv: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Durée (minutes)</Label>
                    <Input type="number" min={5} max={480} value={form.duree_minutes} onChange={(e) => setForm({ ...form, duree_minutes: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Motif *</Label>
                  <Input value={form.motif} onChange={(e) => setForm({ ...form, motif: e.target.value })} required placeholder="Raison du rendez-vous" />
                </div>
                <div className="space-y-2">
                  <Label>Établissement</Label>
                  <Select onValueChange={(v) => setForm({ ...form, etablissement_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent>
                      {etablissements.map((e) => <SelectItem key={e.id} value={e.id}>{e.nom}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Instructions particulières, préparation requise..." />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                  <Button type="submit" variant="medical" disabled={loading || !form.motif}>
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Enregistrer
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {rendezVous.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CalendarClock className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Aucun rendez-vous enregistré</p>
        </div>
      ) : (
        <div className="space-y-4">
          {upcoming.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">À venir</p>
              {upcoming.map((r) => <RDVCard key={r.id} rdv={r} />)}
            </div>
          )}
          {past.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Passés</p>
              {past.map((r) => <RDVCard key={r.id} rdv={r} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RDVCard({ rdv }: { rdv: RendezVous }) {
  const statut = STATUT_CONFIG[rdv.statut] ?? { label: rdv.statut, className: "bg-slate-50 text-slate-600 border-slate-200" };
  const isPast = new Date(rdv.date_rdv) < new Date();

  return (
    <Card className={isPast && rdv.statut === "planifie" ? "opacity-60" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <CalendarClock className={`h-5 w-5 flex-shrink-0 mt-0.5 ${isPast ? "text-muted-foreground" : "text-medical-green"}`} />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{TYPE_RDV_LABELS[rdv.type_rdv] ?? rdv.type_rdv}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${statut.className}`}>
                {statut.label}
              </span>
            </div>
            <p className="text-sm mt-1">{rdv.motif}</p>
            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDateTime(rdv.date_rdv)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {rdv.duree_minutes} min
              </span>
            </div>
            {rdv.notes && (
              <p className="text-xs text-muted-foreground mt-2 border-t pt-2">{rdv.notes}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
