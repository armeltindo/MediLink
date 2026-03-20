"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { CalendarDays, Plus, Loader2, Clock, User, AlertTriangle, CheckCircle, X, ChevronRight, Building2, FileText, Timer } from "lucide-react";
import Link from "next/link";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface RDV {
  id: string;
  patient_id: string;
  medecin_id: string;
  etablissement_id?: string;
  date_rdv: string;
  duree_minutes: number;
  type_rdv: string;
  motif: string;
  statut: string;
  notes?: string;
  patients?: { nom: string; prenom: string; npi: string } | null;
  users_profiles?: { nom: string; prenom: string } | null;
}

const typeLabels: Record<string, string> = {
  consultation: "Consultation",
  suivi: "Suivi",
  urgence: "Urgence",
  vaccination: "Vaccination",
  analyse: "Analyse",
  chirurgie: "Chirurgie",
  autre: "Autre",
};

const statutConfig: Record<string, { label: string; variant: "success" | "warning" | "danger" | "info" | "secondary"; icon: React.ElementType }> = {
  planifie: { label: "Planifié", variant: "info", icon: Clock },
  confirme: { label: "Confirmé", variant: "success", icon: CheckCircle },
  annule: { label: "Annulé", variant: "danger", icon: X },
  effectue: { label: "Effectué", variant: "secondary", icon: CheckCircle },
  absent: { label: "Absent", variant: "warning", icon: AlertTriangle },
};

export default function RendezVousPage() {
  const { user } = useUser();
  const [rdvs, setRdvs] = useState<RDV[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [patients, setPatients] = useState<{ id: string; nom: string; prenom: string; npi: string }[]>([]);
  const [medecins, setMedecins] = useState<{ id: string; nom: string; prenom: string }[]>([]);
  const [etablissements, setEtablissements] = useState<{ id: string; nom: string }[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const searchSeqRef = useRef(0);
  const [confirmAction, setConfirmAction] = useState<{ id: string; statut: string; label: string } | null>(null);
  const [detailRdv, setDetailRdv] = useState<RDV | null>(null);
  const [form, setForm] = useState({
    patient_id: "", medecin_id: "", etablissement_id: "",
    date_rdv: new Date().toISOString().slice(0, 16),
    duree_minutes: "30", type_rdv: "consultation", motif: "", notes: "",
  });

  const loadRDVs = useCallback(async (date?: string) => {
    setLoading(true);
    const targetDate = date || dateFilter;
    const start = `${targetDate}T00:00:00`;
    const end = `${targetDate}T23:59:59`;

    const { data } = await supabase
      .from("rendez_vous")
      .select("*, patients(nom, prenom, npi)")
      .gte("date_rdv", start)
      .lte("date_rdv", end)
      .is("deleted_at", null)
      .order("date_rdv");

    const rows = (data as RDV[]) || [];

    // Fetch doctor profiles separately (rendez_vous.medecin_id → auth.users, not users_profiles)
    const medecinIds = Array.from(new Set(rows.map((r) => r.medecin_id).filter(Boolean)));
    let profileMap: Record<string, { nom: string; prenom: string }> = {};
    if (medecinIds.length > 0) {
      const { data: profiles } = await supabase
        .from("users_profiles")
        .select("id, nom, prenom")
        .in("id", medecinIds);
      if (profiles) {
        profileMap = Object.fromEntries(profiles.map((p) => [p.id, { nom: p.nom, prenom: p.prenom }]));
      }
    }

    setRdvs(rows.map((r) => ({ ...r, users_profiles: profileMap[r.medecin_id] ?? null })));
    setLoading(false);
  }, [dateFilter]);

  useEffect(() => {
    loadRDVs();
    // Load supporting data
    supabase.from("users_profiles").select("id, nom, prenom").eq("role", "medecin").is("deleted_at", null).then(({ data }) => setMedecins(data || []));
    supabase.from("etablissements").select("id, nom").is("deleted_at", null).then(({ data }) => setEtablissements(data || []));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (patientSearch.length < 2) { setPatients([]); return; }
    // Increment sequence number — only the latest response will update state
    const seq = ++searchSeqRef.current;
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("patients")
        .select("id, nom, prenom, npi")
        .or(`nom.ilike.%${patientSearch}%,prenom.ilike.%${patientSearch}%,npi.ilike.%${patientSearch}%`)
        .is("deleted_at", null)
        .limit(10);
      // Discard stale responses from previous keystrokes
      if (seq === searchSeqRef.current) {
        setPatients(data || []);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("rendez_vous").insert({
        patient_id: form.patient_id,
        medecin_id: form.medecin_id || user.id,
        etablissement_id: form.etablissement_id || null,
        date_rdv: new Date(form.date_rdv).toISOString(),
        duree_minutes: parseInt(form.duree_minutes),
        type_rdv: form.type_rdv,
        motif: form.motif,
        notes: form.notes || null,
        statut: "planifie",
        cree_par: user.id,
      });
      if (error) throw error;
      toast({ title: "Rendez-vous créé", description: `${form.motif} — ${new Date(form.date_rdv).toLocaleString("fr-FR")}` });
      setOpen(false);
      setForm({ patient_id: "", medecin_id: "", etablissement_id: "", date_rdv: new Date().toISOString().slice(0, 16), duree_minutes: "30", type_rdv: "consultation", motif: "", notes: "" });
      loadRDVs();
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Erreur", description: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateStatut(id: string, statut: string) {
    const { error } = await supabase.from("rendez_vous").update({ statut }).eq("id", id);
    if (!error) {
      toast({ title: "Statut mis à jour" });
      loadRDVs();
    }
    setConfirmAction(null);
  }

  const canCreate = user && ["super_admin", "admin_etablissement", "medecin", "infirmier"].includes(user.role);

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Rendez-vous" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-medical-green" />
            <h2 className="text-xl font-serif font-bold">Agenda des rendez-vous</h2>
          </div>
          {canCreate && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="medical">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau rendez-vous
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Planifier un rendez-vous</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  {/* Patient search */}
                  <div className="space-y-2">
                    <Label>Patient *</Label>
                    <Input
                      placeholder="Rechercher par nom, prénom ou NPI..."
                      value={patientSearch}
                      onChange={(e) => { setPatientSearch(e.target.value); setForm({ ...form, patient_id: "" }); }}
                    />
                    {patients.length > 0 && !form.patient_id && (
                      <div className="border rounded-lg overflow-hidden max-h-36 overflow-y-auto">
                        {patients.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => { setForm({ ...form, patient_id: p.id }); setPatientSearch(`${p.prenom} ${p.nom} (${p.npi})`); setPatients([]); }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors border-b last:border-b-0"
                          >
                            <span className="font-medium">{p.prenom} {p.nom}</span>
                            <span className="text-muted-foreground ml-2 font-mono text-xs">{p.npi}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {form.patient_id && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Patient sélectionné
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Médecin</Label>
                      <Select value={form.medecin_id} onValueChange={(v) => setForm({ ...form, medecin_id: v })}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                        <SelectContent>
                          {medecins.map((m) => <SelectItem key={m.id} value={m.id}>Dr. {m.prenom} {m.nom}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Type de RDV *</Label>
                      <Select value={form.type_rdv} onValueChange={(v) => setForm({ ...form, type_rdv: v })}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(typeLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Date et heure *</Label>
                      <Input
                        type="datetime-local"
                        value={form.date_rdv}
                        onChange={(e) => setForm({ ...form, date_rdv: e.target.value })}
                        required
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Durée (minutes)</Label>
                      <Select value={form.duree_minutes} onValueChange={(v) => setForm({ ...form, duree_minutes: v })}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[15, 20, 30, 45, 60, 90, 120].map((d) => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 col-span-2">
                      <Label>Établissement</Label>
                      <Select value={form.etablissement_id} onValueChange={(v) => setForm({ ...form, etablissement_id: v })}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                        <SelectContent>
                          {etablissements.map((e) => <SelectItem key={e.id} value={e.id}>{e.nom}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label>Motif *</Label>
                    <Input
                      value={form.motif}
                      onChange={(e) => setForm({ ...form, motif: e.target.value })}
                      required
                      placeholder="Ex: Consultation de suivi, Renouvellement ordonnance..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Notes</Label>
                    <Textarea
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      rows={2}
                      placeholder="Instructions particulières, préparation requise..."
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                    <Button type="submit" variant="medical" disabled={submitting || !form.patient_id || !form.motif}>
                      {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Créer le RDV
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Date filter */}
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); loadRDVs(e.target.value); }}
            className="w-40"
          />
          <Button variant="outline" size="sm" onClick={() => { setDateFilter(new Date().toISOString().split("T")[0]); loadRDVs(new Date().toISOString().split("T")[0]); }}>
            Aujourd&apos;hui
          </Button>
          <span className="text-sm text-muted-foreground">
            {new Date(dateFilter + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </span>
        </div>

        {/* RDV list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : rdvs.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <h3 className="font-semibold">Aucun rendez-vous ce jour</h3>
            <p className="text-sm mt-1">Planifiez un rendez-vous en cliquant sur le bouton ci-dessus.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rdvs.map((rdv) => {
              const statut = statutConfig[rdv.statut] || statutConfig.planifie;
              const Icon = statut.icon;
              const heure = new Date(rdv.date_rdv).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
              const patient = rdv.patients as { nom: string; prenom: string; npi: string } | null;
              const medecin = rdv.users_profiles as { nom: string; prenom: string } | null;

              return (
                <button
                  key={rdv.id}
                  type="button"
                  className={`w-full text-left group ${rdv.statut === "annule" ? "opacity-60" : ""}`}
                  onClick={() => setDetailRdv(rdv)}
                >
                  <Card className="hover:shadow-md hover:border-medical-green/30 transition-all group-hover:translate-x-0.5">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="text-center min-w-[60px]">
                          <p className="text-2xl font-bold text-medical-green">{heure}</p>
                          <p className="text-xs text-muted-foreground">{rdv.duree_minutes} min</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold group-hover:text-medical-green transition-colors">
                              {patient ? `${patient.prenom} ${patient.nom}` : "Patient inconnu"}
                            </span>
                            <Badge variant="outline" className="text-xs">{typeLabels[rdv.type_rdv] || rdv.type_rdv}</Badge>
                            <Badge variant={statut.variant} className="text-xs flex items-center gap-1">
                              <Icon className="h-3 w-3" />
                              {statut.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">{rdv.motif}</p>
                          {medecin && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <User className="h-3 w-3" />
                              Dr. {medecin.prenom} {medecin.nom}
                            </p>
                          )}
                          {rdv.notes && <p className="text-xs text-muted-foreground mt-1 italic">{rdv.notes}</p>}
                        </div>
                        {/* Status actions — stop propagation so clicking buttons doesn't open dialog */}
                        <div className="shrink-0 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {rdv.statut === "planifie" && (
                            <div className="flex flex-col gap-1.5">
                              <Button size="sm" variant="outline" className="h-7 text-xs text-green-600 border-green-300" onClick={() => handleUpdateStatut(rdv.id, "confirme")}>
                                Confirmer
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500" onClick={() => setConfirmAction({ id: rdv.id, statut: "annule", label: "annuler ce rendez-vous" })}>
                                Annuler
                              </Button>
                            </div>
                          )}
                          {rdv.statut === "confirme" && (
                            <div className="flex flex-col gap-1.5">
                              <Button size="sm" variant="outline" className="h-7 text-xs text-green-600 border-green-300" onClick={() => handleUpdateStatut(rdv.id, "effectue")}>
                                Effectué
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-yellow-600" onClick={() => setConfirmAction({ id: rdv.id, statut: "absent", label: "marquer le patient comme absent" })}>
                                Absent
                              </Button>
                            </div>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail dialog */}
      {detailRdv && (() => {
        const rdv = detailRdv;
        const statut = statutConfig[rdv.statut] || statutConfig.planifie;
        const StatutIcon = statut.icon;
        const patient = rdv.patients as { nom: string; prenom: string; npi: string } | null;
        const medecin = rdv.users_profiles as { nom: string; prenom: string } | null;
        const heure = new Date(rdv.date_rdv).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
        const dateLabel = new Date(rdv.date_rdv).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
        return (
          <Dialog open onOpenChange={(o) => { if (!o) setDetailRdv(null); }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-medical-green" />
                  Détails du rendez-vous
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                {/* Patient */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border">
                  <div className="p-1.5 rounded-md bg-white border shrink-0"><User className="h-4 w-4 text-slate-500" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Patient</p>
                    {patient ? (
                      <Link
                        href={`/patients/${patient.npi}`}
                        className="text-sm font-semibold text-medical-green hover:underline underline-offset-2"
                        onClick={() => setDetailRdv(null)}
                      >
                        {patient.prenom} {patient.nom}
                      </Link>
                    ) : <p className="text-sm text-muted-foreground">Inconnu</p>}
                  </div>
                </div>
                {/* Date & heure */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border">
                  <div className="p-1.5 rounded-md bg-white border shrink-0"><CalendarDays className="h-4 w-4 text-slate-500" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Date &amp; heure</p>
                    <p className="text-sm font-semibold capitalize">{dateLabel} à {heure}</p>
                  </div>
                </div>
                {/* Durée & type */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border">
                    <div className="p-1.5 rounded-md bg-white border shrink-0"><Timer className="h-4 w-4 text-slate-500" /></div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Durée</p>
                      <p className="text-sm font-semibold">{rdv.duree_minutes} min</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border">
                    <div className="p-1.5 rounded-md bg-white border shrink-0"><Building2 className="h-4 w-4 text-slate-500" /></div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Type</p>
                      <p className="text-sm font-semibold">{typeLabels[rdv.type_rdv] || rdv.type_rdv}</p>
                    </div>
                  </div>
                </div>
                {/* Statut */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border">
                  <div className="p-1.5 rounded-md bg-white border shrink-0"><StatutIcon className="h-4 w-4 text-slate-500" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Statut</p>
                    <Badge variant={statut.variant} className="mt-0.5 text-xs flex items-center gap-1 w-fit">
                      <StatutIcon className="h-3 w-3" />
                      {statut.label}
                    </Badge>
                  </div>
                </div>
                {/* Motif */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border">
                  <div className="p-1.5 rounded-md bg-white border shrink-0"><FileText className="h-4 w-4 text-slate-500" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Motif</p>
                    <p className="text-sm font-medium mt-0.5">{rdv.motif}</p>
                  </div>
                </div>
                {/* Médecin */}
                {medecin && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border">
                    <div className="p-1.5 rounded-md bg-white border shrink-0"><User className="h-4 w-4 text-slate-500" /></div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Médecin</p>
                      <p className="text-sm font-medium mt-0.5">Dr. {medecin.prenom} {medecin.nom}</p>
                    </div>
                  </div>
                )}
                {/* Notes */}
                {rdv.notes && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border">
                    <div className="p-1.5 rounded-md bg-white border shrink-0"><FileText className="h-4 w-4 text-slate-500" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Notes</p>
                      <p className="text-sm mt-0.5 text-foreground whitespace-pre-wrap">{rdv.notes}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                {patient && (
                  <Button variant="medical" size="sm" className="flex-1 gap-2" asChild>
                    <Link href={`/patients/${patient.npi}`} onClick={() => setDetailRdv(null)}>
                      <User className="h-4 w-4" />
                      Dossier patient
                    </Link>
                  </Button>
                )}
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setDetailRdv(null)}>
                  <X className="h-4 w-4" />
                  Fermer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Confirmation dialog for destructive status changes */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l&apos;action</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment {confirmAction?.label} ? Cette action ne peut pas être annulée facilement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmAction && handleUpdateStatut(confirmAction.id, confirmAction.statut)}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
