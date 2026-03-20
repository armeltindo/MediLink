"use client";
import { useState, useEffect, useMemo } from "react";
import { Patient, Hospitalisation, SoinInfirmier } from "@/types";
import { supabase } from "@/lib/supabase";
import { formatDate, formatDateTime } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge, BadgeVariant } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BedDouble, Plus, Loader2, Calendar, ClipboardList,
  ChevronDown, ChevronUp, FileText, Stethoscope, Pill,
  Activity, CheckCircle2, Clock3, Timer,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICES = [
  "Médecine interne", "Chirurgie générale", "Maternité / Obstétrique",
  "Pédiatrie", "Cardiologie", "Pneumologie", "Neurologie", "Urologie",
  "Orthopédie / Traumatologie", "Oncologie", "Réanimation / USI",
  "Soins intensifs néonatals", "Psychiatrie", "Dermatologie",
  "ORL", "Ophtalmologie", "Urgences",
];

const MODE_SORTIE_CONFIG: Record<string, { label: string; variant: BadgeVariant; color: string }> = {
  domicile: { label: "Retour à domicile", variant: "success",  color: "text-green-700" },
  transfert: { label: "Transfert",         variant: "info",     color: "text-blue-700"  },
  deces:     { label: "Décès",             variant: "danger",   color: "text-red-700"   },
  fugue:     { label: "Fugue",             variant: "warning",  color: "text-amber-700" },
};

const SOIN_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pansement:               { label: "Pansement",             color: "text-orange-700",  bg: "bg-orange-100" },
  injection:               { label: "Injection",             color: "text-purple-700",  bg: "bg-purple-100" },
  perfusion:               { label: "Perfusion",             color: "text-blue-700",    bg: "bg-blue-100"   },
  prise_constantes:        { label: "Constantes",            color: "text-teal-700",    bg: "bg-teal-100"   },
  administration_medicament:{ label: "Médicament",           color: "text-red-700",     bg: "bg-red-100"    },
  nursing:                 { label: "Nursing",               color: "text-pink-700",    bg: "bg-pink-100"   },
  surveillance:            { label: "Surveillance",          color: "text-slate-700",   bg: "bg-slate-100"  },
  autre:                   { label: "Autre",                 color: "text-gray-700",    bg: "bg-gray-100"   },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function durationDays(start: string, end?: string | null): number {
  const from = new Date(start).getTime();
  const to   = end ? new Date(end).getTime() : Date.now();
  return Math.max(1, Math.round((to - from) / 86_400_000));
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ hospitalisations }: { hospitalisations: Hospitalisation[] }) {
  const enCours   = hospitalisations.filter((h) => !h.date_sortie).length;
  const terminees = hospitalisations.filter((h) => !!h.date_sortie).length;
  const totalJours = hospitalisations.reduce((acc, h) => acc + durationDays(h.date_entree, h.date_sortie), 0);

  return (
    <div className="grid grid-cols-4 gap-2">
      {[
        { label: "Séjours",      value: hospitalisations.length, color: "text-blue-600",  bg: "bg-blue-50",   border: "border-blue-200" },
        { label: "En cours",     value: enCours,                 color: "text-green-600", bg: "bg-green-50",  border: "border-green-200" },
        { label: "Terminées",    value: terminees,               color: "text-slate-600", bg: "bg-slate-50",  border: "border-slate-200" },
        { label: "Jours cumulés",value: totalJours,              color: "text-violet-600",bg: "bg-violet-50", border: "border-violet-200" },
      ].map(({ label, value, color, bg, border }) => (
        <div key={label} className={`rounded-lg border ${border} ${bg} px-3 py-2 text-center`}>
          <p className={`text-xl font-bold ${color}`}>{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── CR Opératoire Dialog ─────────────────────────────────────────────────────

function CROperatoireDialog({
  hospitalisation, patient, user, onSuccess,
}: {
  hospitalisation: { id: string; etablissement_id: string };
  patient: { id: string; nom: string; prenom: string };
  user: { id: string; role: string } | null;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    type_intervention: "", chirurgien: "", anesthesiste: "",
    duree_minutes: "", complications: "", notes: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await supabase.from("documents").insert({
        patient_id: patient.id,
        nom: `CR Opératoire — ${form.type_intervention}`,
        url: "",
        type: "compte_rendu",
        description: JSON.stringify({
          hospitalisation_id: hospitalisation.id,
          type_intervention: form.type_intervention,
          chirurgien: form.chirurgien,
          anesthesiste: form.anesthesiste,
          duree_minutes: form.duree_minutes ? parseInt(form.duree_minutes) : null,
          complications: form.complications || null,
          notes: form.notes || null,
        }),
        uploaded_by: user.id,
        etablissement_id: hospitalisation.etablissement_id,
      });
      toast({ title: "Compte rendu opératoire enregistré" });
      setOpen(false);
      setForm({ type_intervention: "", chirurgien: "", anesthesiste: "", duree_minutes: "", complications: "", notes: "" });
      onSuccess();
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Erreur", description: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-50">
          <Stethoscope className="h-3 w-3 mr-1" />CR Opératoire
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Compte rendu opératoire — {patient.prenom} {patient.nom}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label>Type d&apos;intervention *</Label>
            <Input value={form.type_intervention} onChange={(e) => setForm({ ...form, type_intervention: e.target.value })}
              placeholder="Ex: Appendicectomie, Césarienne…" required className="h-9" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Chirurgien *</Label>
              <Input value={form.chirurgien} onChange={(e) => setForm({ ...form, chirurgien: e.target.value })}
                placeholder="Dr. Nom Prénom" required className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label>Anesthésiste</Label>
              <Input value={form.anesthesiste} onChange={(e) => setForm({ ...form, anesthesiste: e.target.value })}
                placeholder="Dr. Nom Prénom" className="h-9" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Durée (minutes)</Label>
            <Input type="number" min={1} value={form.duree_minutes}
              onChange={(e) => setForm({ ...form, duree_minutes: e.target.value })} placeholder="Ex: 90" className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label>Complications per-opératoires</Label>
            <Textarea value={form.complications} onChange={(e) => setForm({ ...form, complications: e.target.value })}
              rows={2} placeholder="Aucune / Saignement / Plaie organe…" />
          </div>
          <div className="space-y-1.5">
            <Label>Notes et observations</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3} placeholder="Technique, constatations, suites prévues…" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" variant="medical" disabled={loading || !form.type_intervention || !form.chirurgien}>
              {loading && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Hospitalisation Card ─────────────────────────────────────────────────────

function HospitalisationCard({
  hospitalisation: h, patient, user,
}: {
  hospitalisation: Hospitalisation;
  patient: Patient;
  user: { id: string; role: string } | null;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showSoins, setShowSoins] = useState(false);
  const [soins, setSoins] = useState<SoinInfirmier[]>([]);
  const [loadingSoins, setLoadingSoins] = useState(false);
  const [openSoin, setOpenSoin] = useState(false);
  const [soinLoading, setSoinLoading] = useState(false);
  const [soinForm, setSoinForm] = useState({ type_soin: "", description: "", medicament_administre: "" });

  const canAddSoin = user?.role === "infirmier" || user?.role === "medecin" || user?.role === "super_admin";
  const isMedecin  = user?.role === "medecin" || user?.role === "super_admin";
  const canSortie  = isMedecin || user?.role === "admin_etablissement";

  const isOngoing  = !h.date_sortie;
  const modeSortie = h.mode_sortie ? MODE_SORTIE_CONFIG[h.mode_sortie] : null;
  const duree      = durationDays(h.date_entree, h.date_sortie);

  async function loadSoins() {
    if (soins.length > 0) { setShowSoins(!showSoins); return; }
    setLoadingSoins(true);
    const { data } = await supabase.from("soins_infirmiers").select("*")
      .eq("hospitalisation_id", h.id).order("created_at", { ascending: false });
    setSoins(data || []);
    setLoadingSoins(false);
    setShowSoins(true);
  }

  useEffect(() => {
    if (expanded) loadSoins();
  }, [expanded]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSoinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSoinLoading(true);
    try {
      await supabase.from("soins_infirmiers").insert({
        hospitalisation_id: h.id,
        patient_id: patient.id,
        infirmier_id: user.id,
        type_soin: soinForm.type_soin,
        description: soinForm.description,
        medicament_administre: soinForm.medicament_administre || null,
        heure_administration: new Date().toISOString(),
      });
      toast({ title: "Soin infirmier enregistré" });
      setOpenSoin(false);
      setSoinForm({ type_soin: "", description: "", medicament_administre: "" });
      setSoins([]);
      setShowSoins(false);
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Erreur", description: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setSoinLoading(false);
    }
  }

  return (
    <Card className={`overflow-hidden border-l-4 transition-shadow hover:shadow-md ${
      isOngoing ? "border-l-green-400 bg-green-50/20" : "border-l-slate-300"
    }`}>
      <CardContent className="p-0">
        {/* Header — cliquable pour expand */}
        <div
          className="flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          {/* Status icon */}
          <div className={`mt-0.5 p-1.5 rounded-md border shrink-0 ${
            isOngoing ? "bg-green-50 border-green-200" : "bg-muted border-border"
          }`}>
            {isOngoing
              ? <Activity className="h-4 w-4 text-green-600" />
              : <CheckCircle2 className="h-4 w-4 text-slate-400" />}
          </div>

          <div className="flex-1 min-w-0">
            {/* Top row: service + badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{h.service}</span>
              {isOngoing ? (
                <Badge className="bg-green-100 text-green-700 border-green-200">
                  <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  En cours
                </Badge>
              ) : (
                modeSortie && <Badge variant={modeSortie.variant}>{modeSortie.label}</Badge>
              )}
              <span className={`ml-auto flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${
                isOngoing ? "bg-green-50 border-green-200 text-green-700" : "bg-muted border-border text-muted-foreground"
              }`}>
                <Timer className="h-3 w-3" />
                {duree} jour{duree > 1 ? "s" : ""}
              </span>
            </div>

            {/* Motif */}
            <p className="text-sm mt-1 font-medium text-foreground/80">{h.motif}</p>

            {/* Dates */}
            <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Entrée : <strong className="text-foreground">{formatDate(h.date_entree)}</strong>
              </span>
              {h.date_sortie ? (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Sortie : <strong className="text-foreground">{formatDate(h.date_sortie)}</strong>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-green-600">
                  <Clock3 className="h-3 w-3" />
                  Hospitalisé depuis {duree} j
                </span>
              )}
            </div>
          </div>

          <Button variant="ghost" size="icon-sm" className="shrink-0 mt-0.5">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {/* Contenu expand : résumé + actions + soins */}
        {expanded && (
          <div className="border-t">
            {/* Résumé du séjour */}
            {h.resume_sejour && (
              <div className="px-4 pt-3 pb-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Résumé du séjour
                </p>
                <p className="text-xs text-muted-foreground p-2 rounded bg-muted/40 border leading-relaxed">
                  {h.resume_sejour}
                </p>
              </div>
            )}

            {/* Action buttons */}
            {(isMedecin || canSortie) && (
              <div className="px-4 pt-3 pb-0 flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                {isMedecin && (
                  <CROperatoireDialog
                    hospitalisation={{ id: h.id, etablissement_id: h.etablissement_id }}
                    patient={patient}
                    user={user}
                    onSuccess={() => {}}
                  />
                )}
                {!isOngoing && canSortie && (
                  <Button
                    variant="outline" size="sm"
                    className="h-7 text-xs border-green-300 text-green-700 hover:bg-green-50"
                    onClick={async () => {
                      const { data: medProfile } = await import("@/lib/supabase").then(({ supabase }) =>
                        supabase.from("users_profiles").select("nom, prenom, specialite, numero_ordre, titre").eq("id", h.medecin_referent_id).single()
                      );
                      const { data: etabData } = await import("@/lib/supabase").then(({ supabase }) =>
                        supabase.from("etablissements").select("nom, adresse, ville, telephone").eq("id", h.etablissement_id).single()
                      );
                      const res = await fetch("/api/lettre-sortie", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ patient, hospitalisation: h, medecin: medProfile, etablissement: etabData }),
                      });
                      const html = await res.text();
                      const win = window.open("", "_blank");
                      if (win) { win.document.write(html); win.document.close(); }
                    }}
                  >
                    <FileText className="h-3 w-3 mr-1" />Lettre de sortie
                  </Button>
                )}
              </div>
            )}

            {/* Soins infirmiers section */}
            <div className="bg-muted/20 mt-3">
              <div className="flex items-center justify-between px-4 py-2" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={loadSoins}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  Soins infirmiers
                  {soins.length > 0 && !showSoins && (
                    <span className="ml-1 bg-blue-100 text-blue-700 rounded-full px-1.5 text-xs font-medium">{soins.length}</span>
                  )}
                  {loadingSoins
                    ? <Loader2 className="h-3 w-3 animate-spin ml-1" />
                    : showSoins ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                {canAddSoin && (
                  <Dialog open={openSoin} onOpenChange={setOpenSoin}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 text-xs">
                        <Plus className="h-3 w-3 mr-1" />Soin
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Soin infirmier — {patient.prenom} {patient.nom}</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleSoinSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                          <Label>Type de soin *</Label>
                          <Select value={soinForm.type_soin} onValueChange={(v) => setSoinForm({ ...soinForm, type_soin: v })}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pansement">Pansement</SelectItem>
                              <SelectItem value="injection">Injection</SelectItem>
                              <SelectItem value="perfusion">Perfusion / Perf IV</SelectItem>
                              <SelectItem value="prise_constantes">Prise de constantes</SelectItem>
                              <SelectItem value="administration_medicament">Administration médicament</SelectItem>
                              <SelectItem value="nursing">Nursing (hygiène, mobilisation)</SelectItem>
                              <SelectItem value="surveillance">Surveillance</SelectItem>
                              <SelectItem value="autre">Autre</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Description *</Label>
                          <Textarea value={soinForm.description} onChange={(e) => setSoinForm({ ...soinForm, description: e.target.value })}
                            required rows={2} placeholder="Décrivez le soin effectué…" />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Médicament administré (si applicable)</Label>
                          <Input value={soinForm.medicament_administre} onChange={(e) => setSoinForm({ ...soinForm, medicament_administre: e.target.value })}
                            placeholder="Ex: Paracétamol 1g IV, Morphine 5mg SC…" className="h-9" />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setOpenSoin(false)}>Annuler</Button>
                          <Button type="submit" variant="medical" disabled={soinLoading || !soinForm.type_soin || !soinForm.description}>
                            {soinLoading && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}Enregistrer
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              {/* Soins list */}
              {showSoins && (
                <div className="px-4 pb-3 space-y-2">
                  {soins.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-1">Aucun soin enregistré pour cette hospitalisation.</p>
                  ) : (
                    soins.map((s) => {
                      const soinCfg = SOIN_TYPE_CONFIG[s.type_soin] ?? SOIN_TYPE_CONFIG.autre;
                      return (
                        <div key={s.id} className="rounded-lg border bg-background p-2.5 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${soinCfg.bg} ${soinCfg.color}`}>
                              {soinCfg.label}
                            </span>
                            <span className="ml-auto text-xs text-muted-foreground">
                              {formatDateTime(s.heure_administration || s.created_at)}
                            </span>
                          </div>
                          <p className="text-xs text-foreground/80">{s.description}</p>
                          {s.medicament_administre && (
                            <p className="flex items-center gap-1.5 text-xs text-blue-700">
                              <Pill className="h-3 w-3 shrink-0" />
                              {s.medicament_administre}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

interface HospitalisationsTabProps {
  patient: Patient;
  hospitalisations?: Hospitalisation[];
  onRefresh: () => void;
}

export function HospitalisationsTab({ patient, hospitalisations: initialHospitalisations, onRefresh }: HospitalisationsTabProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  const canCreate = user?.role === "medecin" || user?.role === "super_admin" || user?.role === "admin_etablissement";

  const [hospitalisations, setHospitalisations] = useState<Hospitalisation[]>(initialHospitalisations || []);
  const [tabLoading, setTabLoading] = useState(!initialHospitalisations);
  const [filterStatus, setFilterStatus] = useState<"all" | "en_cours" | "terminee">("all");
  const [etablissements, setEtablissements] = useState<{ id: string; nom: string }[]>([]);

  const [form, setForm] = useState({
    service: "", motif: "", date_entree: new Date().toISOString().split("T")[0],
    date_sortie: "", resume_sejour: "", mode_sortie: "", etablissement_id: "",
  });

  useEffect(() => {
    if (!initialHospitalisations) {
      supabase
        .from("hospitalisations")
        .select("*")
        .eq("patient_id", patient.id)
        .is("deleted_at", null)
        .order("date_entree", { ascending: false })
        .then(({ data }: { data: Hospitalisation[] | null }) => {
          setHospitalisations(data || []);
          setTabLoading(false);
        });
    }
    supabase.from("etablissements").select("id, nom")
      .then(({ data }: { data: { id: string; nom: string }[] | null }) => setEtablissements(data || []));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await supabase.from("hospitalisations").insert({
        patient_id: patient.id,
        medecin_referent_id: user.id,
        etablissement_id: form.etablissement_id || etablissements[0]?.id,
        service: form.service,
        motif: form.motif,
        date_entree: new Date(form.date_entree).toISOString(),
        date_sortie: form.date_sortie ? new Date(form.date_sortie).toISOString() : null,
        resume_sejour: form.resume_sejour || null,
        mode_sortie: form.mode_sortie || null,
      });
      toast({ title: "Hospitalisation enregistrée" });
      setOpen(false);
      setForm({ service: "", motif: "", date_entree: new Date().toISOString().split("T")[0], date_sortie: "", resume_sejour: "", mode_sortie: "", etablissement_id: "" });
      onRefresh();
    } catch (error: unknown) {
      toast({ variant: "destructive", title: "Erreur", description: error instanceof Error ? error.message : "Erreur" });
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() =>
    hospitalisations.filter((h) => {
      if (filterStatus === "en_cours") return !h.date_sortie;
      if (filterStatus === "terminee") return !!h.date_sortie;
      return true;
    }), [hospitalisations, filterStatus]
  );

  if (tabLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-2">
          {[1,2,3,4].map((i) => <div key={i} className="h-14 rounded-lg border bg-muted animate-pulse" />)}
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="h-36 rounded-lg border bg-card animate-pulse border-l-4 border-l-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      {hospitalisations.length > 0 && <StatsBar hospitalisations={hospitalisations} />}

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les séjours</SelectItem>
            <SelectItem value="en_cours">En cours</SelectItem>
            <SelectItem value="terminee">Terminées</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground flex-1">
          {filtered.length !== hospitalisations.length
            ? `${filtered.length} / ${hospitalisations.length} séjour${hospitalisations.length > 1 ? "s" : ""}`
            : `${hospitalisations.length} séjour${hospitalisations.length > 1 ? "s" : ""}`}
        </span>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="medical" size="sm">
                <Plus className="h-4 w-4 mr-1.5" />Enregistrer hospitalisation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Hospitalisation — {patient.prenom} {patient.nom}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Service *</Label>
                    <Input value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}
                      placeholder="Ex: Médecine interne" list="services-list" required className="h-9" />
                    <datalist id="services-list">
                      {SERVICES.map((s) => <option key={s} value={s} />)}
                    </datalist>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Établissement</Label>
                    <Select onValueChange={(v) => setForm({ ...form, etablissement_id: v })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                      <SelectContent>
                        {etablissements.map((e) => <SelectItem key={e.id} value={e.id}>{e.nom}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Date d&apos;entrée *</Label>
                    <Input type="date" value={form.date_entree} onChange={(e) => setForm({ ...form, date_entree: e.target.value })} required className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Date de sortie</Label>
                    <Input type="date" value={form.date_sortie} onChange={(e) => setForm({ ...form, date_sortie: e.target.value })} className="h-9" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Motif d&apos;hospitalisation *</Label>
                  <Input value={form.motif} onChange={(e) => setForm({ ...form, motif: e.target.value })}
                    required placeholder="Raison principale de l&apos;hospitalisation" className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label>Résumé du séjour</Label>
                  <Textarea value={form.resume_sejour} onChange={(e) => setForm({ ...form, resume_sejour: e.target.value })}
                    rows={3} placeholder="Évolution, traitements, actes…" />
                </div>
                {form.date_sortie && (
                  <div className="space-y-1.5">
                    <Label>Mode de sortie</Label>
                    <Select onValueChange={(v) => setForm({ ...form, mode_sortie: v })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="domicile">Retour à domicile</SelectItem>
                        <SelectItem value="transfert">Transfert inter-établissement</SelectItem>
                        <SelectItem value="deces">Décès</SelectItem>
                        <SelectItem value="fugue">Fugue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                  <Button type="submit" variant="medical" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Enregistrer
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* List */}
      {hospitalisations.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <BedDouble className="h-8 w-8 opacity-40" />
          </div>
          <p className="font-medium">Aucune hospitalisation enregistrée</p>
          <p className="text-sm mt-1">Enregistrez les séjours hospitaliers de ce patient.</p>
          {canCreate && (
            <Button variant="medical" size="sm" className="mt-4" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />Enregistrer hospitalisation
            </Button>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <p className="text-sm">Aucun séjour avec ce filtre.</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setFilterStatus("all")}>
            Voir tous les séjours
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((h) => (
            <HospitalisationCard
              key={h.id}
              hospitalisation={h}
              patient={patient}
              user={user as { id: string; role: string } | null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
