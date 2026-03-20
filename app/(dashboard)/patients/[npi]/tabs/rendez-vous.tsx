"use client";
import { useState, useEffect, useCallback } from "react";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CalendarClock, Plus, Loader2, Calendar, Clock, RefreshCw,
  Stethoscope, Syringe, FlaskConical, Scissors, AlertCircle,
  CheckCircle2, XCircle, UserX, CalendarCheck, Hourglass,
  MapPin, Bell, ChevronDown, ChevronUp,
} from "lucide-react";

// ─── Config ────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  consultation:  { label: "Consultation",  icon: Stethoscope,   color: "text-blue-500" },
  suivi:         { label: "Suivi",         icon: CalendarCheck, color: "text-teal-500" },
  urgence:       { label: "Urgence",       icon: AlertCircle,   color: "text-red-500" },
  vaccination:   { label: "Vaccination",   icon: Syringe,       color: "text-green-500" },
  analyse:       { label: "Analyse",       icon: FlaskConical,  color: "text-purple-500" },
  chirurgie:     { label: "Chirurgie",     icon: Scissors,      color: "text-orange-500" },
  autre:         { label: "Autre",         icon: CalendarClock, color: "text-slate-500" },
};

const STATUT_CONFIG: Record<string, { label: string; badge: string; border: string; icon: React.ElementType }> = {
  planifie:  { label: "Planifié",  badge: "bg-blue-50 text-blue-700 border-blue-200",    border: "border-l-blue-400",    icon: Hourglass     },
  confirme:  { label: "Confirmé",  badge: "bg-green-50 text-green-700 border-green-200", border: "border-l-green-500",   icon: CheckCircle2  },
  annule:    { label: "Annulé",    badge: "bg-red-50 text-red-700 border-red-200",       border: "border-l-red-400",     icon: XCircle       },
  effectue:  { label: "Effectué",  badge: "bg-slate-100 text-slate-600 border-slate-200",border: "border-l-slate-300",   icon: CheckCircle2  },
  absent:    { label: "Absent",    badge: "bg-orange-50 text-orange-700 border-orange-200", border: "border-l-orange-400", icon: UserX        },
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function getRelativeTime(dateStr: string): { text: string; urgent: boolean } {
  const diff = new Date(dateStr).getTime() - Date.now();
  const abs = Math.abs(diff);
  const mins  = Math.floor(abs / 60000);
  const hours = Math.floor(abs / 3600000);
  const days  = Math.floor(abs / 86400000);

  if (diff < 0) {
    if (mins < 60)  return { text: `Il y a ${mins} min`,   urgent: false };
    if (hours < 24) return { text: `Il y a ${hours}h`,     urgent: false };
    if (days === 1) return { text: "Hier",                  urgent: false };
    return { text: `Il y a ${days} jours`,                  urgent: false };
  }
  if (mins < 60)  return { text: `Dans ${mins} min`,   urgent: mins < 30 };
  if (hours < 24) return { text: `Dans ${hours}h`,     urgent: hours < 3 };
  if (days === 1) return { text: "Demain",              urgent: true };
  if (days <= 3)  return { text: `Dans ${days} jours`, urgent: true };
  return { text: `Dans ${days} jours`, urgent: false };
}

function isToday(dateStr: string) {
  const d = new Date(dateStr);
  const t = new Date();
  return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
}

// ─── RDV Card ──────────────────────────────────────────────────────────────

function RDVCard({ rdv, canUpdate, onConfirmAction }: {
  rdv: RendezVous;
  canUpdate: boolean;
  onConfirmAction: (action: { id: string; statut: string; label: string }) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const statut = STATUT_CONFIG[rdv.statut] ?? { label: rdv.statut, badge: "bg-slate-100 text-slate-600 border-slate-200", border: "border-l-slate-300", icon: CalendarClock };
  const type   = TYPE_CONFIG[rdv.type_rdv]  ?? TYPE_CONFIG.autre;
  const TypeIcon   = type.icon;
  const StatutIcon = statut.icon;

  const isPast    = new Date(rdv.date_rdv) < new Date();
  const today     = isToday(rdv.date_rdv);
  const isActive  = rdv.statut === "planifie" || rdv.statut === "confirme";
  const relative  = isActive ? getRelativeTime(rdv.date_rdv) : null;

  return (
    <Card className={`overflow-hidden border-l-4 ${statut.border} transition-shadow hover:shadow-md ${
      isPast && rdv.statut === "planifie" ? "opacity-60" : ""
    }`}>
      <CardContent className="p-0">
        {/* Today banner */}
        {today && isActive && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 flex items-center gap-1.5">
            <Bell className="h-3 w-3 text-amber-500" />
            <span className="text-xs font-semibold text-amber-700">Aujourd&apos;hui</span>
          </div>
        )}

        <div
          className="flex items-start gap-4 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          {/* Type icon */}
          <div className={`mt-0.5 p-2 rounded-lg bg-muted flex-shrink-0`}>
            <TypeIcon className={`h-4 w-4 ${type.color}`} />
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{type.label}</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${statut.badge}`}>
                <StatutIcon className="h-3 w-3" />
                {statut.label}
              </span>
              {relative && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  relative.urgent
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "text-muted-foreground"
                }`}>
                  {relative.text}
                </span>
              )}
            </div>

            <p className="text-sm mt-1 font-medium">{rdv.motif}</p>

            <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDateTime(rdv.date_rdv)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {rdv.duree_minutes} min
              </span>
              {rdv.rappel_envoye && (
                <span className="flex items-center gap-1 text-green-600">
                  <Bell className="h-3 w-3" />
                  Rappel envoyé
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          {canUpdate && (
            <div className="flex flex-col gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              {rdv.statut === "planifie" && !isPast && (
                <>
                  <Button size="sm" variant="outline" className="h-7 text-xs text-green-600 border-green-300 hover:bg-green-50"
                    onClick={() => onConfirmAction({ id: rdv.id, statut: "confirme", label: "confirmer ce rendez-vous" })}>
                    Confirmer
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500 hover:bg-red-50"
                    onClick={() => onConfirmAction({ id: rdv.id, statut: "annule", label: "annuler ce rendez-vous" })}>
                    Annuler
                  </Button>
                </>
              )}
              {rdv.statut === "confirme" && !isPast && (
                <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500 hover:bg-red-50"
                  onClick={() => onConfirmAction({ id: rdv.id, statut: "annule", label: "annuler ce rendez-vous" })}>
                  Annuler
                </Button>
              )}
              {(rdv.statut === "planifie" || rdv.statut === "confirme") && isPast && (
                <>
                  <Button size="sm" variant="outline" className="h-7 text-xs text-green-600 border-green-300 hover:bg-green-50"
                    onClick={() => onConfirmAction({ id: rdv.id, statut: "effectue", label: "marquer ce rendez-vous comme effectué" })}>
                    Effectué
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-yellow-600 hover:bg-yellow-50"
                    onClick={() => onConfirmAction({ id: rdv.id, statut: "absent", label: "marquer le patient comme absent" })}>
                    Absent
                  </Button>
                </>
              )}
            </div>
          )}

          <Button variant="ghost" size="icon-sm" className="shrink-0 mt-0.5">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {/* Expanded — notes + détails supplémentaires */}
        {expanded && rdv.notes && (
          <div className="border-t bg-muted/20 px-4 py-3">
            <p className="text-xs text-muted-foreground flex items-start gap-1.5">
              <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
              {rdv.notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Stats Bar ─────────────────────────────────────────────────────────────

function StatsBar({ rdvList }: { rdvList: RendezVous[] }) {
  const now = new Date();
  const upcoming  = rdvList.filter((r) => (r.statut === "planifie" || r.statut === "confirme") && new Date(r.date_rdv) >= now).length;
  const todayCount = rdvList.filter((r) => isToday(r.date_rdv) && (r.statut === "planifie" || r.statut === "confirme")).length;
  const effectue  = rdvList.filter((r) => r.statut === "effectue").length;
  const annule    = rdvList.filter((r) => r.statut === "annule" || r.statut === "absent").length;

  const stats = [
    { label: "À venir",      value: upcoming,    color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-200" },
    { label: "Aujourd'hui",  value: todayCount,  color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-200" },
    { label: "Effectués",    value: effectue,    color: "text-green-600",  bg: "bg-green-50",  border: "border-green-200" },
    { label: "Annulés",      value: annule,      color: "text-red-500",    bg: "bg-red-50",    border: "border-red-200" },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {stats.map(({ label, value, color, bg, border }) => (
        <div key={label} className={`rounded-lg border ${border} ${bg} px-3 py-2 text-center`}>
          <p className={`text-xl font-bold ${color}`}>{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Loading Skeleton ──────────────────────────────────────────────────────

function RDVSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        {[1,2,3,4].map((i) => (
          <div key={i} className="h-14 rounded-lg border bg-muted animate-pulse" />
        ))}
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-24 rounded-lg border bg-card animate-pulse border-l-4 border-l-muted" />
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

interface RendezVousTabProps {
  patient: Patient;
  onRefresh: () => void;
}

export function RendezVousTab({ patient, onRefresh }: RendezVousTabProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ id: string; statut: string; label: string } | null>(null);
  const { user } = useUser();
  const canCreate = user?.role === "medecin" || user?.role === "super_admin" || user?.role === "admin_etablissement" || user?.role === "infirmier";
  const canUpdateStatut = canCreate;

  const [rdvList, setRdvList] = useState<RendezVous[]>([]);
  const [rdvLoading, setRdvLoading] = useState(true);
  const [rdvError, setRdvError] = useState<string | null>(null);
  const [filterStatut, setFilterStatut] = useState<string>("all");

  const loadRdv = useCallback(async () => {
    setRdvLoading(true);
    setRdvError(null);
    const { data, error } = await supabase
      .from("rendez_vous")
      .select("*")
      .eq("patient_id", patient.id)
      .is("deleted_at", null)
      .order("date_rdv", { ascending: false });
    if (error) setRdvError(error.message);
    else setRdvList(data || []);
    setRdvLoading(false);
  }, [patient.id]);

  useEffect(() => { loadRdv(); }, [loadRdv]);

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
      loadRdv();
      onRefresh();
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Erreur", description: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatut(id: string, statut: string) {
    const { error } = await supabase.from("rendez_vous").update({ statut }).eq("id", id);
    if (!error) {
      toast({ title: "Statut mis à jour" });
      loadRdv();
      onRefresh();
    } else {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    }
    setConfirmAction(null);
  }

  const now = new Date();
  const upcoming = rdvList.filter((r) =>
    (r.statut === "planifie" || r.statut === "confirme") && new Date(r.date_rdv) >= now
  );
  const past = rdvList.filter((r) =>
    new Date(r.date_rdv) < now ||
    r.statut === "annule" ||
    r.statut === "effectue" ||
    r.statut === "absent"
  );

  // Apply filter
  const filterFn = (r: RendezVous) => filterStatut === "all" || r.statut === filterStatut;
  const filteredUpcoming = upcoming.filter(filterFn);
  const filteredPast     = past.filter(filterFn);

  if (rdvLoading) return <RDVSkeleton />;

  if (rdvError) {
    return (
      <div className="text-center py-12 text-sm text-red-500">
        <XCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Erreur de chargement : {rdvError}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={loadRdv}>Réessayer</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-base">
          Rendez-vous
          {rdvList.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">({rdvList.length})</span>
          )}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter */}
          {rdvList.length > 0 && (
            <Select value={filterStatut} onValueChange={setFilterStatut}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Statut..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="planifie">Planifié</SelectItem>
                <SelectItem value="confirme">Confirmé</SelectItem>
                <SelectItem value="effectue">Effectué</SelectItem>
                <SelectItem value="annule">Annulé</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Button variant="ghost" size="sm" onClick={loadRdv} title="Rafraîchir" disabled={rdvLoading}>
            <RefreshCw className={`h-4 w-4 ${rdvLoading ? "animate-spin" : ""}`} />
          </Button>
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
                  <DialogTitle>Nouveau rendez-vous — {patient.prenom} {patient.nom}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Type *</Label>
                      <Select value={form.type_rdv} onValueChange={(v) => setForm({ ...form, type_rdv: v })}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(TYPE_CONFIG).map(([v, { label, icon: Icon, color }]) => (
                            <SelectItem key={v} value={v}>
                              <span className="flex items-center gap-2">
                                <Icon className={`h-3.5 w-3.5 ${color}`} />
                                {label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Statut initial</Label>
                      <Select value={form.statut} onValueChange={(v) => setForm({ ...form, statut: v })}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="planifie">Planifié</SelectItem>
                          <SelectItem value="confirme">Confirmé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Date et heure *</Label>
                      <Input type="datetime-local" value={form.date_rdv} onChange={(e) => setForm({ ...form, date_rdv: e.target.value })} required className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Durée (minutes)</Label>
                      <Select value={form.duree_minutes} onValueChange={(v) => setForm({ ...form, duree_minutes: v })}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[15, 20, 30, 45, 60, 90, 120].map((d) => (
                            <SelectItem key={d} value={d.toString()}>{d} min</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Motif *</Label>
                    <Input value={form.motif} onChange={(e) => setForm({ ...form, motif: e.target.value })} required placeholder="Raison du rendez-vous" className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Établissement</Label>
                    <Select value={form.etablissement_id} onValueChange={(v) => setForm({ ...form, etablissement_id: v })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                      <SelectContent>
                        {etablissements.map((e) => <SelectItem key={e.id} value={e.id}>{e.nom}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Notes / Instructions</Label>
                    <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Instructions particulières, préparation requise..." />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
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
      </div>

      {/* Empty state */}
      {rdvList.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <CalendarClock className="h-8 w-8 opacity-40" />
          </div>
          <p className="font-medium">Aucun rendez-vous enregistré</p>
          <p className="text-sm mt-1">Planifiez le premier rendez-vous pour ce patient.</p>
          {canCreate && (
            <Button variant="medical" size="sm" className="mt-4" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Planifier un RDV
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Stats */}
          <StatsBar rdvList={rdvList} />

          {/* À venir */}
          {filteredUpcoming.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">À venir</p>
                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">{filteredUpcoming.length}</span>
              </div>
              {filteredUpcoming.map((r) => (
                <RDVCard key={r.id} rdv={r} canUpdate={canUpdateStatut} onConfirmAction={setConfirmAction} />
              ))}
            </div>
          )}

          {/* Passés */}
          {filteredPast.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Historique</p>
                <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">{filteredPast.length}</span>
              </div>
              {filteredPast.map((r) => (
                <RDVCard key={r.id} rdv={r} canUpdate={canUpdateStatut} onConfirmAction={setConfirmAction} />
              ))}
            </div>
          )}

          {/* No results after filter */}
          {filteredUpcoming.length === 0 && filteredPast.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">Aucun rendez-vous pour ce filtre.</p>
          )}
        </div>
      )}

      {/* Confirmation dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l&apos;action</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment {confirmAction?.label} ?
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
