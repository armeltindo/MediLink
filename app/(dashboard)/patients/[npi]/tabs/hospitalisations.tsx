"use client";
import { useState, useEffect } from "react";
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
import { BedDouble, Plus, Loader2, Calendar, ClipboardList, ChevronDown, ChevronUp, FileText, Stethoscope } from "lucide-react";

// ─── Compte Rendu Opératoire Dialog ───────────────────────────────────────
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
    type_intervention: "",
    chirurgien: "",
    anesthesiste: "",
    duree_minutes: "",
    complications: "",
    notes: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const metadata = JSON.stringify({
        hospitalisation_id: hospitalisation.id,
        type_intervention: form.type_intervention,
        chirurgien: form.chirurgien,
        anesthesiste: form.anesthesiste,
        duree_minutes: form.duree_minutes ? parseInt(form.duree_minutes) : null,
        complications: form.complications || null,
        notes: form.notes || null,
      });

      const { error } = await supabase.from("documents").insert({
        patient_id: patient.id,
        nom: `CR Opératoire — ${form.type_intervention}`,
        url: "",
        type: "compte_rendu",
        description: metadata,
        uploaded_by: user.id,
        etablissement_id: hospitalisation.etablissement_id,
      });

      if (error) throw error;
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
          <Stethoscope className="h-3 w-3 mr-1" />
          CR Opératoire
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Compte rendu opératoire — {patient.prenom} {patient.nom}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Type d&apos;intervention *</Label>
            <Input
              value={form.type_intervention}
              onChange={(e) => setForm({ ...form, type_intervention: e.target.value })}
              placeholder="Ex: Appendicectomie, Césarienne, Laparotomie..."
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Chirurgien *</Label>
              <Input
                value={form.chirurgien}
                onChange={(e) => setForm({ ...form, chirurgien: e.target.value })}
                placeholder="Dr. Nom Prénom"
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Anesthésiste</Label>
              <Input
                value={form.anesthesiste}
                onChange={(e) => setForm({ ...form, anesthesiste: e.target.value })}
                placeholder="Dr. Nom Prénom"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Durée (minutes)</Label>
            <Input
              type="number"
              min={1}
              value={form.duree_minutes}
              onChange={(e) => setForm({ ...form, duree_minutes: e.target.value })}
              placeholder="Ex: 90"
            />
          </div>
          <div className="space-y-1">
            <Label>Complications per-opératoires</Label>
            <Textarea
              value={form.complications}
              onChange={(e) => setForm({ ...form, complications: e.target.value })}
              rows={2}
              placeholder="Aucune / Saignement / Plaie organe..."
            />
          </div>
          <div className="space-y-1">
            <Label>Notes et observations</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              placeholder="Technique utilisée, constatations peropératoires, suites prévues..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" variant="medical" disabled={loading || !form.type_intervention || !form.chirurgien}>
              {loading && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const SERVICES = [
  "Médecine interne", "Chirurgie générale", "Maternité / Obstétrique",
  "Pédiatrie", "Cardiologie", "Pneumologie", "Neurologie", "Urologie",
  "Orthopédie / Traumatologie", "Oncologie", "Réanimation / USI",
  "Soins intensifs néonatals", "Psychiatrie", "Dermatologie",
  "ORL", "Ophtalmologie", "Urgences",
];

interface HospitalisationsTabProps {
  patient: Patient;
  hospitalisations: Hospitalisation[];
  onRefresh: () => void;
}

export function HospitalisationsTab({ patient, hospitalisations, onRefresh }: HospitalisationsTabProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  const canCreate = user?.role === "medecin" || user?.role === "super_admin" || user?.role === "admin_etablissement";

  const [etablissements, setEtablissements] = useState<{ id: string; nom: string }[]>([]);
  const [form, setForm] = useState({
    service: "", motif: "", date_entree: new Date().toISOString().split("T")[0],
    date_sortie: "", resume_sejour: "", mode_sortie: "", etablissement_id: "",
  });

  useEffect(() => {
    supabase.from("etablissements").select("id, nom").then(({ data }) => setEtablissements(data || []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const { error } = await supabase.from("hospitalisations").insert({
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

      if (error) throw error;
      toast({ title: "Hospitalisation enregistrée" });
      setOpen(false);
      onRefresh();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Erreur";
      toast({ variant: "destructive", title: "Erreur", description: msg });
    } finally {
      setLoading(false);
    }
  }

  const modeSortieConfig: Record<string, { label: string; variant: BadgeVariant }> = {
    domicile: { label: "Retour à domicile", variant: "success" },
    transfert: { label: "Transfert", variant: "info" },
    deces: { label: "Décès", variant: "danger" },
    fugue: { label: "Fugue", variant: "warning" },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          Hospitalisations ({hospitalisations.length})
        </h3>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="medical" size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Enregistrer hospitalisation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Hospitalisation — {patient.prenom} {patient.nom}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Service *</Label>
                    <Input
                      value={form.service}
                      onChange={(e) => setForm({ ...form, service: e.target.value })}
                      placeholder="Ex: Médecine interne"
                      list="services-list"
                      required
                    />
                    <datalist id="services-list">
                      {SERVICES.map((s) => <option key={s} value={s} />)}
                    </datalist>
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
                    <Label>Date d&apos;entrée *</Label>
                    <Input type="date" value={form.date_entree} onChange={(e) => setForm({ ...form, date_entree: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Date de sortie</Label>
                    <Input type="date" value={form.date_sortie} onChange={(e) => setForm({ ...form, date_sortie: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Motif d&apos;hospitalisation *</Label>
                  <Input value={form.motif} onChange={(e) => setForm({ ...form, motif: e.target.value })} required placeholder="Raison principale de l'hospitalisation" />
                </div>
                <div className="space-y-2">
                  <Label>Résumé du séjour</Label>
                  <Textarea value={form.resume_sejour} onChange={(e) => setForm({ ...form, resume_sejour: e.target.value })} rows={3} placeholder="Évolution, traitements, actes..." />
                </div>
                {form.date_sortie && (
                  <div className="space-y-2">
                    <Label>Mode de sortie</Label>
                    <Select onValueChange={(v) => setForm({ ...form, mode_sortie: v })}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="domicile">Retour à domicile</SelectItem>
                        <SelectItem value="transfert">Transfert inter-établissement</SelectItem>
                        <SelectItem value="deces">Décès</SelectItem>
                        <SelectItem value="fugue">Fugue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                  <Button type="submit" variant="medical" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Enregistrer
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {hospitalisations.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BedDouble className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Aucune hospitalisation enregistrée</p>
        </div>
      ) : (
        <div className="space-y-3">
          {hospitalisations.map((h) => (
            <HospitalisationCard key={h.id} hospitalisation={h} patient={patient} user={user as { id: string; role: string } | null} modeSortieConfig={modeSortieConfig} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Hospitalisation Card with Soins Infirmiers ────────────────────────────
function HospitalisationCard({
  hospitalisation: h, patient, user, modeSortieConfig,
}: {
  hospitalisation: Hospitalisation;
  patient: Patient;
  user: { id: string; role: string } | null;
  modeSortieConfig: Record<string, { label: string; variant: BadgeVariant }>;
}) {
  const [showSoins, setShowSoins] = useState(false);
  const [soins, setSoins] = useState<SoinInfirmier[]>([]);
  const [loadingSoins, setLoadingSoins] = useState(false);
  const [openSoin, setOpenSoin] = useState(false);
  const [soinLoading, setSoinLoading] = useState(false);
  const [soinForm, setSoinForm] = useState({ type_soin: "", description: "", medicament_administre: "" });

  const canAddSoin = user?.role === "infirmier" || user?.role === "medecin" || user?.role === "super_admin";

  async function loadSoins() {
    if (soins.length > 0) { setShowSoins(!showSoins); return; }
    setLoadingSoins(true);
    const { data } = await supabase.from("soins_infirmiers").select("*").eq("hospitalisation_id", h.id).order("created_at", { ascending: false });
    setSoins(data || []);
    setLoadingSoins(false);
    setShowSoins(true);
  }

  async function handleSoinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSoinLoading(true);
    try {
      const { error } = await supabase.from("soins_infirmiers").insert({
        hospitalisation_id: h.id,
        patient_id: patient.id,
        infirmier_id: user.id,
        type_soin: soinForm.type_soin,
        description: soinForm.description,
        medicament_administre: soinForm.medicament_administre || null,
        heure_administration: new Date().toISOString(),
      });
      if (error) throw error;
      toast({ title: "Soin infirmier enregistré" });
      setOpenSoin(false);
      setSoinForm({ type_soin: "", description: "", medicament_administre: "" });
      setSoins([]); // reset to force reload
      setShowSoins(false);
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Erreur", description: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setSoinLoading(false);
    }
  }

  const isOngoing = !h.date_sortie;
  const modeSortie = h.mode_sortie ? modeSortieConfig[h.mode_sortie] : null;
  const entree = new Date(h.date_entree);
  const sortie = h.date_sortie ? new Date(h.date_sortie) : new Date();
  const duree = Math.round((sortie.getTime() - entree.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Card className={`overflow-hidden ${isOngoing ? "border-medical-green" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <BedDouble className={`h-5 w-5 flex-shrink-0 mt-0.5 ${isOngoing ? "text-medical-green" : "text-muted-foreground"}`} />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{h.service}</span>
              {isOngoing ? (
                <Badge className="bg-medical-green-light text-medical-green">En cours</Badge>
              ) : (
                modeSortie && <Badge variant={modeSortie.variant}>{modeSortie.label}</Badge>
              )}
              <Badge variant="outline" className="text-xs">{duree} jour{duree > 1 ? "s" : ""}</Badge>
            </div>
            <p className="text-sm mt-1">{h.motif}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Entrée : {formatDate(h.date_entree)}
              </span>
              {h.date_sortie && <span>Sortie : {formatDate(h.date_sortie)}</span>}
            </div>
            {h.resume_sejour && (
              <p className="text-xs text-muted-foreground mt-2 border-t pt-2">{h.resume_sejour}</p>
            )}

            {/* CR Opératoire + Lettre de sortie buttons */}
            {(user?.role === "medecin" || user?.role === "super_admin") && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <CROperatoireDialog
                  hospitalisation={{ id: h.id, etablissement_id: h.etablissement_id }}
                  patient={patient}
                  user={user as { id: string; role: string } | null}
                  onSuccess={() => {}}
                />
              </div>
            )}
            {/* Lettre de sortie button */}
            {!isOngoing && (user?.role === "medecin" || user?.role === "super_admin" || user?.role === "admin_etablissement") && (
              <div className="mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-medical-green text-medical-green hover:bg-medical-green-light"
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
                  <FileText className="h-3 w-3 mr-1" />
                  Lettre de sortie
                </Button>
              </div>
            )}

            {/* Soins infirmiers toggle */}
            <div className="mt-3 pt-2 border-t flex items-center justify-between">
              <button
                type="button"
                onClick={loadSoins}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                Soins infirmiers
                {loadingSoins ? (
                  <Loader2 className="h-3 w-3 animate-spin ml-1" />
                ) : showSoins ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
              {canAddSoin && (
                <Dialog open={openSoin} onOpenChange={setOpenSoin}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-xs">
                      <Plus className="h-3 w-3 mr-1" />Soin infirmier
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Soin infirmier — {patient.prenom} {patient.nom}</DialogTitle></DialogHeader>
                    <form onSubmit={handleSoinSubmit} className="space-y-4">
                      <div className="space-y-1">
                        <Label>Type de soin *</Label>
                        <Select value={soinForm.type_soin} onValueChange={(v) => setSoinForm({ ...soinForm, type_soin: v })}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
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
                      <div className="space-y-1">
                        <Label>Description *</Label>
                        <Textarea value={soinForm.description} onChange={(e) => setSoinForm({ ...soinForm, description: e.target.value })} required rows={2} placeholder="Décrivez le soin effectué..." />
                      </div>
                      <div className="space-y-1">
                        <Label>Médicament administré (si applicable)</Label>
                        <Input value={soinForm.medicament_administre} onChange={(e) => setSoinForm({ ...soinForm, medicament_administre: e.target.value })} placeholder="Ex: Paracétamol 1g IV, Morphine 5mg SC..." />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setOpenSoin(false)}>Annuler</Button>
                        <Button type="submit" variant="medical" disabled={soinLoading || !soinForm.type_soin}>
                          {soinLoading && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}Enregistrer
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {/* Soins list */}
            {showSoins && soins.length > 0 && (
              <div className="mt-2 space-y-1">
                {soins.map((s) => (
                  <div key={s.id} className="bg-blue-50 rounded p-2 text-xs border border-blue-100">
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">{s.type_soin?.replace(/_/g, " ")}</span>
                      <span className="text-muted-foreground">{formatDateTime(s.heure_administration || s.created_at)}</span>
                    </div>
                    <p className="text-muted-foreground mt-0.5">{s.description}</p>
                    {s.medicament_administre && <p className="text-blue-700 mt-0.5">💊 {s.medicament_administre}</p>}
                  </div>
                ))}
              </div>
            )}
            {showSoins && soins.length === 0 && (
              <p className="text-xs text-muted-foreground mt-2">Aucun soin infirmier enregistré pour cette hospitalisation.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
