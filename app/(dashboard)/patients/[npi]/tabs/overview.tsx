"use client";
import { useState, useEffect } from "react";
import { Patient, Allergie, Antecedent, AntecedentFamilial, HabitudesVie, Consultation, Prescription } from "@/types";
import { supabase } from "@/lib/supabase";
import { formatDate, getSeverityColor } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertTriangle, CheckCircle, Clock, Stethoscope,
  Pill, Activity, Loader2, Sparkles, Cigarette,
  Wine, Utensils, User2, Plus, Shield, Network, List,
} from "lucide-react";
import { searchCIM10, CIM10Code } from "@/lib/cim10";

// ─── Arbre Généalogique SVG ────────────────────────────────────────────────
function FamilyTreeSVG({ antecedentsFamiliaux }: { antecedentsFamiliaux: AntecedentFamilial[] }) {
  const byParent: Record<string, AntecedentFamilial[]> = {};
  antecedentsFamiliaux.forEach((af) => {
    if (!byParent[af.parent]) byParent[af.parent] = [];
    byParent[af.parent].push(af);
  });

  const LABELS: Record<string, string> = {
    gp_paternel: "GP Paternel", gm_paternelle: "GM Paternelle",
    gp_maternel: "GP Maternel", gm_maternelle: "GM Maternelle",
    pere: "Père", mere: "Mère",
  };

  const has = (key: string) => (byParent[key]?.length ?? 0) > 0;

  const NW = 110, NH = 54;
  // Positions: [x, y, centerX, centerBottomY]
  const POS: Record<string, [number, number, number, number]> = {
    gp_paternel:   [0,   10, 55,  64],
    gm_paternelle: [120, 10, 175, 64],
    gp_maternel:   [330, 10, 385, 64],
    gm_maternelle: [450, 10, 505, 64],
    pere:          [60,  115, 115, 169],
    mere:          [390, 115, 445, 169],
  };
  const patCx = 280, patCy = 215;
  const nodeBottom = 169;

  // Visibility flags
  const hasPGP1 = has("gp_paternel"), hasPGP2 = has("gm_paternelle");
  const hasMGP1 = has("gp_maternel"), hasMGP2 = has("gm_maternelle");
  const hasPere = has("pere"), hasMere = has("mere");

  function renderNode(key: string) {
    const entries = byParent[key];
    if (!entries?.length) return null; // hide nodes with no data
    const [nx, ny] = POS[key];
    const isDeceased = entries.some((e) => e.statut_vital === "decede");
    const fill = isDeceased ? "#fff1f2" : "#f0fdf4";
    const stroke = isDeceased ? "#fca5a5" : "#86efac";
    return (
      <g key={key}>
        <rect x={nx} y={ny} width={NW} height={NH} rx={6}
          fill={fill} stroke={stroke} strokeWidth={1.5} />
        <text x={nx + NW / 2} y={ny + 15} textAnchor="middle"
          fontSize={9} fontWeight="600" fill="#374151">{LABELS[key] || key}</text>
        <text x={nx + NW / 2} y={ny + 29} textAnchor="middle"
          fontSize={8} fill={isDeceased ? "#dc2626" : "#15803d"}>
          {entries[0].pathologie.length > 17
            ? entries[0].pathologie.substring(0, 17) + "…"
            : entries[0].pathologie}
        </text>
        {entries.length > 1 && (
          <text x={nx + NW / 2} y={ny + 42} textAnchor="middle" fontSize={7} fill="#6b7280">
            +{entries.length - 1} autre{entries.length > 2 ? "s" : ""}
          </text>
        )}
        {isDeceased && entries.length === 1 && (
          <text x={nx + NW / 2} y={ny + 42} textAnchor="middle" fontSize={7} fill="#dc2626">
            † décédé{entries[0].age_deces ? ` à ${entries[0].age_deces} ans` : ""}
          </text>
        )}
      </g>
    );
  }

  const L = "#cbd5e1";
  const siblings = [...(byParent["frere"] || []), ...(byParent["soeur"] || [])];

  return (
    <div className="space-y-3">
      <svg viewBox="0 0 580 235" className="w-full h-auto rounded-lg border bg-slate-50/30">
        {/* ── Paternal grandparents → père ── */}
        {hasPGP1 && hasPGP2 && <line x1={55} y1={64} x2={175} y2={64} stroke={L} strokeWidth={1.5} />}
        {hasPGP1 && hasPGP2 && hasPere && <line x1={115} y1={64} x2={115} y2={115} stroke={L} strokeWidth={1.5} />}
        {hasPGP1 && !hasPGP2 && hasPere && <line x1={55} y1={64} x2={115} y2={115} stroke={L} strokeWidth={1.5} />}
        {!hasPGP1 && hasPGP2 && hasPere && <line x1={175} y1={64} x2={115} y2={115} stroke={L} strokeWidth={1.5} />}
        {/* ── Maternal grandparents → mère ── */}
        {hasMGP1 && hasMGP2 && <line x1={385} y1={64} x2={505} y2={64} stroke={L} strokeWidth={1.5} />}
        {hasMGP1 && hasMGP2 && hasMere && <line x1={445} y1={64} x2={445} y2={115} stroke={L} strokeWidth={1.5} />}
        {hasMGP1 && !hasMGP2 && hasMere && <line x1={385} y1={64} x2={445} y2={115} stroke={L} strokeWidth={1.5} />}
        {!hasMGP1 && hasMGP2 && hasMere && <line x1={505} y1={64} x2={445} y2={115} stroke={L} strokeWidth={1.5} />}
        {/* ── Parents → patient ── */}
        {hasPere && hasMere && <line x1={115} y1={nodeBottom} x2={445} y2={nodeBottom} stroke={L} strokeWidth={1.5} />}
        {hasPere && hasMere && <line x1={patCx} y1={nodeBottom} x2={patCx} y2={patCy - 16} stroke={L} strokeWidth={1.5} />}
        {hasPere && !hasMere && <line x1={115} y1={nodeBottom} x2={patCx} y2={patCy - 16} stroke={L} strokeWidth={1.5} />}
        {!hasPere && hasMere && <line x1={445} y1={nodeBottom} x2={patCx} y2={patCy - 16} stroke={L} strokeWidth={1.5} />}
        {/* ── Nodes (only rendered if data exists) ── */}
        {Object.keys(POS).map((key) => renderNode(key))}
        {/* ── Patient ── */}
        <circle cx={patCx} cy={patCy} r={16} fill="#dbeafe" stroke="#3b82f6" strokeWidth={2} />
        <text x={patCx} y={patCy - 2} textAnchor="middle" fontSize={8} fontWeight="700" fill="#1d4ed8">Patient</text>
        <text x={patCx} y={patCy + 10} textAnchor="middle" fontSize={7} fill="#3b82f6">(index)</text>
        {/* ── Legend ── */}
        <g transform="translate(446,200)">
          <rect x={0} y={0} width={8} height={8} rx={2} fill="#f0fdf4" stroke="#86efac" strokeWidth={1} />
          <text x={11} y={8} fontSize={7} fill="#6b7280">Vivant</text>
          <rect x={0} y={14} width={8} height={8} rx={2} fill="#fff1f2" stroke="#fca5a5" strokeWidth={1} />
          <text x={11} y={22} fontSize={7} fill="#6b7280">Décédé</text>
        </g>
      </svg>
      {siblings.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Fratrie</p>
          <div className="flex flex-wrap gap-1.5">
            {siblings.map((s, i) => (
              <span key={i} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border ${
                s.statut_vital === "decede"
                  ? "bg-red-50 border-red-200 text-red-700"
                  : "bg-green-50 border-green-200 text-green-700"
              }`}>
                {s.parent === "frere" ? "♂" : "♀"} {s.pathologie}
                {s.statut_vital === "decede" && " †"}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface OverviewTabProps {
  patient: Patient;
  allergies: Allergie[];
  antecedents: Antecedent[];
  antecedentsFamiliaux: AntecedentFamilial[];
  habitudes: HabitudesVie | null;
  consultations: Consultation[];
  prescriptions: Prescription[];
  onRefresh: () => void;
}

// ─── Add Antécédent Dialog ─────────────────────────────────────────────────
function AddAntecedentDialog({ patient, onSuccess }: { patient: Patient; onSuccess: () => void }) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cim10Query, setCim10Query] = useState("");
  const [cim10Results, setCim10Results] = useState<CIM10Code[]>([]);
  const [selectedCIM10, setSelectedCIM10] = useState<CIM10Code | null>(null);
  const [form, setForm] = useState({
    categorie: "medical", description: "", notes: "",
    date_debut: "", actif: true,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("antecedents").insert({
        patient_id: patient.id,
        categorie: form.categorie,
        description: form.description,
        cim10_code: selectedCIM10?.code || null,
        notes: form.notes || null,
        date_debut: form.date_debut || null,
        actif: form.actif,
        created_by: user.id,
      });
      if (error) throw error;
      toast({ title: "Antécédent ajouté" });
      setOpen(false);
      onSuccess();
      setForm({ categorie: "medical", description: "", notes: "", date_debut: "", actif: true });
      setSelectedCIM10(null);
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Erreur", description: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Plus className="h-3.5 w-3.5 mr-1" />Ajouter</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nouvel antécédent — {patient.prenom} {patient.nom}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Catégorie *</Label>
              <Select value={form.categorie} onValueChange={(v) => setForm({ ...form, categorie: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="medical">Médical</SelectItem>
                  <SelectItem value="chirurgical">Chirurgical</SelectItem>
                  <SelectItem value="obstetrical">Obstétrical</SelectItem>
                  <SelectItem value="psychiatrique">Psychiatrique</SelectItem>
                  <SelectItem value="traumatologique">Traumatologique</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Date de début</Label>
              <Input type="date" value={form.date_debut} onChange={(e) => setForm({ ...form, date_debut: e.target.value })} className="h-9" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Description *</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required placeholder="Ex: Diabète type 2, HTA, Appendicectomie..." />
          </div>
          <div className="space-y-1">
            <Label>Code CIM-10</Label>
            <Input
              value={selectedCIM10 ? `${selectedCIM10.code} — ${selectedCIM10.libelle}` : cim10Query}
              onChange={(e) => { setSelectedCIM10(null); setCim10Query(e.target.value); setCim10Results(searchCIM10(e.target.value)); }}
              placeholder="Rechercher un code CIM-10..."
            />
            {cim10Results.length > 0 && !selectedCIM10 && (
              <div className="border rounded-md shadow-sm bg-background max-h-32 overflow-y-auto">
                {cim10Results.map((code) => (
                  <button key={code.code} type="button" onClick={() => { setSelectedCIM10(code); setCim10Results([]); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent border-b last:border-0">
                    <span className="font-mono font-medium text-medical-green">{code.code}</span>
                    <span className="ml-2">{code.libelle}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Informations complémentaires..." />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="actif" checked={form.actif} onChange={(e) => setForm({ ...form, actif: e.target.checked })} className="h-4 w-4" />
            <Label htmlFor="actif" className="text-sm cursor-pointer">Actif (non résolu)</Label>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" variant="medical" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Allergie Dialog ───────────────────────────────────────────────────
function AddAllergieDialog({ patient, onSuccess }: { patient: Patient; onSuccess: () => void }) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ substance: "", type: "medicamenteuse", severite: "moderee", reaction: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("allergies").insert({
        patient_id: patient.id,
        ...form,
        actif: true,
        created_by: user.id,
      });
      if (error) throw error;
      toast({ title: "Allergie enregistrée", variant: "default" });
      setOpen(false);
      onSuccess();
      setForm({ substance: "", type: "medicamenteuse", severite: "moderee", reaction: "" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Erreur", description: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Plus className="h-3.5 w-3.5 mr-1" />Ajouter</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nouvelle allergie — {patient.prenom} {patient.nom}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Substance *</Label>
            <Input value={form.substance} onChange={(e) => setForm({ ...form, substance: e.target.value })} required placeholder="Ex: Pénicilline, Arachides, Pollen..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="medicamenteuse">Médicamenteuse</SelectItem>
                  <SelectItem value="alimentaire">Alimentaire</SelectItem>
                  <SelectItem value="environnementale">Environnementale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Sévérité *</Label>
              <Select value={form.severite} onValueChange={(v) => setForm({ ...form, severite: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="legere">Légère</SelectItem>
                  <SelectItem value="moderee">Modérée</SelectItem>
                  <SelectItem value="anaphylactique">Anaphylactique ⚠️</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Réaction décrite *</Label>
            <Textarea value={form.reaction} onChange={(e) => setForm({ ...form, reaction: e.target.value })} required rows={2} placeholder="Ex: Urticaire, choc anaphylactique, oedème de Quincke..." />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" variant="medical" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Habitudes de vie Dialog ─────────────────────────────────────────
function EditHabitudesDialog({ patient, habitudes, onSuccess }: { patient: Patient; habitudes: HabitudesVie | null; onSuccess: () => void }) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    tabac: habitudes?.tabac || "",
    tabac_quantite: habitudes?.tabac_quantite || "",
    alcool: habitudes?.alcool || "",
    alcool_unites_semaine: habitudes?.alcool_unites_semaine?.toString() || "",
    drogues: habitudes?.drogues || "",
    activite_physique: habitudes?.activite_physique || "",
    alimentation: habitudes?.alimentation || "",
    eau_potable: habitudes?.eau_potable ?? true,
    electricite: habitudes?.electricite ?? true,
    assainissement: habitudes?.assainissement ?? true,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const payload = {
        patient_id: patient.id,
        tabac: form.tabac || null,
        tabac_quantite: form.tabac_quantite || null,
        alcool: form.alcool || null,
        alcool_unites_semaine: form.alcool_unites_semaine ? parseInt(form.alcool_unites_semaine) : null,
        drogues: form.drogues || null,
        activite_physique: form.activite_physique || null,
        alimentation: form.alimentation || null,
        eau_potable: form.eau_potable,
        electricite: form.electricite,
        assainissement: form.assainissement,
      };
      if (habitudes) {
        const { error } = await supabase.from("habitudes_vie").update(payload).eq("id", habitudes.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("habitudes_vie").insert(payload);
        if (error) throw error;
      }
      toast({ title: "Habitudes de vie mises à jour" });
      setOpen(false);
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
        <Button variant="outline" size="sm"><Plus className="h-3.5 w-3.5 mr-1" />{habitudes ? "Modifier" : "Renseigner"}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Habitudes de vie — {patient.prenom} {patient.nom}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tabac</Label>
              <Select value={form.tabac} onValueChange={(v) => setForm({ ...form, tabac: v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Statut tabac..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="non_fumeur">Non-fumeur</SelectItem>
                  <SelectItem value="fumeur">Fumeur actif</SelectItem>
                  <SelectItem value="ex_fumeur">Ex-fumeur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(form.tabac === "fumeur" || form.tabac === "ex_fumeur") && (
              <div className="space-y-1">
                <Label>Quantité / durée</Label>
                <Input value={form.tabac_quantite} onChange={(e) => setForm({ ...form, tabac_quantite: e.target.value })} placeholder="Ex: 10 cig/jour depuis 5 ans" />
              </div>
            )}
            <div className="space-y-1">
              <Label>Alcool</Label>
              <Select value={form.alcool} onValueChange={(v) => setForm({ ...form, alcool: v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Consommation..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aucun">Aucune consommation</SelectItem>
                  <SelectItem value="occasionnel">Occasionnel</SelectItem>
                  <SelectItem value="regulier">Régulier</SelectItem>
                  <SelectItem value="excessif">Excessif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.alcool && form.alcool !== "aucun" && (
              <div className="space-y-1">
                <Label>Unités / semaine</Label>
                <Input type="number" min="0" value={form.alcool_unites_semaine} onChange={(e) => setForm({ ...form, alcool_unites_semaine: e.target.value })} placeholder="Ex: 7" />
              </div>
            )}
            <div className="space-y-1">
              <Label>Drogues (confidentiel)</Label>
              <Input value={form.drogues} onChange={(e) => setForm({ ...form, drogues: e.target.value })} placeholder="Type, fréquence..." />
            </div>
            <div className="space-y-1">
              <Label>Activité physique</Label>
              <Select value={form.activite_physique} onValueChange={(v) => setForm({ ...form, activite_physique: v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Niveau..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentaire">Sédentaire</SelectItem>
                  <SelectItem value="moderee">Modérée (1-3x/sem)</SelectItem>
                  <SelectItem value="intense">Intense (4+ x/sem)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Régime alimentaire particulier</Label>
              <Input value={form.alimentation} onChange={(e) => setForm({ ...form, alimentation: e.target.value })} placeholder="Ex: Végétarien, sans sel, diabétique..." />
            </div>
          </div>
          <div className="border-t pt-3 space-y-2">
            <p className="text-sm font-medium">Conditions de logement</p>
            {[
              { key: "eau_potable", label: "Accès à l'eau potable" },
              { key: "electricite", label: "Accès à l'électricité" },
              { key: "assainissement", label: "Assainissement adéquat" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <input type="checkbox" id={key} checked={form[key as keyof typeof form] as boolean} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} className="h-4 w-4" />
                <Label htmlFor={key} className="text-sm cursor-pointer">{label}</Label>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" variant="medical" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Antécédent Familial Dialog ───────────────────────────────────────
function AddAntecedentFamilialDialog({ patient, onSuccess }: { patient: Patient; onSuccess: () => void }) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ parent: "", pathologie: "", statut_vital: "vivant", cause_deces: "", age_deces: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("antecedents_familiaux").insert({
        patient_id: patient.id,
        parent: form.parent,
        pathologie: form.pathologie,
        statut_vital: form.statut_vital,
        cause_deces: form.statut_vital === "decede" ? form.cause_deces || null : null,
        age_deces: form.statut_vital === "decede" && form.age_deces ? parseInt(form.age_deces) : null,
      });
      if (error) throw error;
      toast({ title: "Antécédent familial ajouté" });
      setOpen(false);
      onSuccess();
      setForm({ parent: "", pathologie: "", statut_vital: "vivant", cause_deces: "", age_deces: "" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Erreur", description: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Plus className="h-3.5 w-3.5 mr-1" />Ajouter</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Antécédent familial — {patient.prenom} {patient.nom}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Membre de la famille *</Label>
              <Select value={form.parent} onValueChange={(v) => setForm({ ...form, parent: v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pere">Père</SelectItem>
                  <SelectItem value="mere">Mère</SelectItem>
                  <SelectItem value="frere">Frère</SelectItem>
                  <SelectItem value="soeur">Sœur</SelectItem>
                  <SelectItem value="gp_paternel">Grand-père paternel</SelectItem>
                  <SelectItem value="gm_paternelle">Grand-mère paternelle</SelectItem>
                  <SelectItem value="gp_maternel">Grand-père maternel</SelectItem>
                  <SelectItem value="gm_maternelle">Grand-mère maternelle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Statut vital</Label>
              <Select value={form.statut_vital} onValueChange={(v) => setForm({ ...form, statut_vital: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vivant">Vivant</SelectItem>
                  <SelectItem value="decede">Décédé</SelectItem>
                  <SelectItem value="inconnu">Inconnu</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Pathologie héréditaire *</Label>
            <Input value={form.pathologie} onChange={(e) => setForm({ ...form, pathologie: e.target.value })} required placeholder="Ex: Diabète type 2, HTA, Drépanocytose, Cancer du sein..." />
          </div>
          {form.statut_vital === "decede" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Cause du décès</Label>
                <Input value={form.cause_deces} onChange={(e) => setForm({ ...form, cause_deces: e.target.value })} placeholder="Ex: AVC, Infarctus..." />
              </div>
              <div className="space-y-1">
                <Label>Âge au décès</Label>
                <Input type="number" min="0" max="130" value={form.age_deces} onChange={(e) => setForm({ ...form, age_deces: e.target.value })} placeholder="Ex: 72" />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" variant="medical" disabled={loading || !form.parent}>
              {loading && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ConsentementRGPD {
  id: string;
  type_consentement: string;
  statut: string;
  date_consentement: string;
}

const CONSENT_TYPES: Record<string, string> = {
  traitement_donnees: "Traitement des données médicales",
  partage_inter_etablissement: "Partage inter-établissement",
  recherche_medicale: "Recherche médicale",
  telemedicine: "Télémédecine",
  contact_urgence: "Contact d'urgence autorisé",
  photo_identite: "Photo d'identité",
};

function RGPDConsentSection({ patient, canWrite }: { patient: Patient; canWrite: boolean }) {
  const { user } = useUser();
  const [consentements, setConsentements] = useState<ConsentementRGPD[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newType, setNewType] = useState("");
  const [newStatut, setNewStatut] = useState("accorde");

  useEffect(() => {
    loadConsentements();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadConsentements() {
    const { data } = await supabase
      .from("consentements_rgpd")
      .select("id, type_consentement, statut, date_consentement")
      .eq("patient_id", patient.id)
      .order("date_consentement", { ascending: false });
    setConsentements((data as ConsentementRGPD[]) || []);
    setLoading(false);
  }

  async function addConsentement() {
    if (!user || !newType) return;
    setAdding(true);
    const { error } = await supabase.from("consentements_rgpd").insert({
      patient_id: patient.id,
      type_consentement: newType,
      statut: newStatut,
      recueilli_par: user.id,
      date_consentement: new Date().toISOString(),
    });
    setAdding(false);
    if (!error) {
      setNewType("");
      loadConsentements();
    }
  }

  async function updateStatut(id: string, statut: string) {
    await supabase.from("consentements_rgpd").update({ statut, updated_at: new Date().toISOString() }).eq("id", id);
    loadConsentements();
  }

  const statutConfig: Record<string, { label: string; color: string }> = {
    accorde: { label: "Accordé", color: "text-green-600" },
    refuse: { label: "Refusé", color: "text-red-600" },
    retire: { label: "Retiré", color: "text-orange-500" },
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4 text-blue-600" />
          Consentements RGPD
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <p className="text-xs text-muted-foreground">Chargement...</p>
        ) : consentements.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucun consentement enregistré</p>
        ) : (
          <div className="space-y-1.5">
            {consentements.map((c) => {
              const statut = statutConfig[c.statut] || { label: c.statut, color: "text-muted-foreground" };
              return (
                <div key={c.id} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{CONSENT_TYPES[c.type_consentement] || c.type_consentement}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`font-medium ${statut.color}`}>{statut.label}</span>
                    {canWrite && c.statut === "accorde" && (
                      <button
                        onClick={() => updateStatut(c.id, "retire")}
                        className="text-orange-400 hover:text-orange-600 text-xs underline"
                        title="Retirer le consentement"
                      >
                        Retirer
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {canWrite && (
          <div className="pt-2 border-t space-y-2">
            <Select value={newType} onValueChange={setNewType}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Ajouter un consentement..." /></SelectTrigger>
              <SelectContent>
                {Object.entries(CONSENT_TYPES)
                  .filter(([key]) => !consentements.some((c) => c.type_consentement === key && c.statut === "accorde"))
                  .map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)
                }
              </SelectContent>
            </Select>
            {newType && (
              <div className="flex gap-2">
                <Select value={newStatut} onValueChange={setNewStatut}>
                  <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accorde">Accordé</SelectItem>
                    <SelectItem value="refuse">Refusé</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="medical" className="h-7 text-xs" onClick={addConsentement} disabled={adding}>
                  {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main OverviewTab Component ───────────────────────────────────────────
export function OverviewTab({
  patient, allergies, antecedents, antecedentsFamiliaux,
  habitudes, consultations, prescriptions, onRefresh,
}: OverviewTabProps) {
  const { user } = useUser();
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [familyView, setFamilyView] = useState<"tree" | "list">("tree");

  const canWrite = user?.role === "medecin" || user?.role === "super_admin" || user?.role === "infirmier";
  const activePrescriptions = prescriptions.filter((p) => p.statut === "en_cours" || p.statut === "prescrit");
  const lastConsultation = consultations[0];

  async function generateAISummary() {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: patient.id }),
      });
      const data = await res.json();
      setAiSummary(data.summary);
    } catch {
      toast({ variant: "destructive", title: "Erreur IA", description: "Impossible de générer le résumé." });
    } finally {
      setAiLoading(false);
    }
  }

  const parentLabels: Record<string, string> = {
    pere: "Père", mere: "Mère", frere: "Frère", soeur: "Sœur",
    gp_paternel: "Grand-père paternel", gm_paternelle: "Grand-mère paternelle",
    gp_maternel: "Grand-père maternel", gm_maternelle: "Grand-mère maternelle",
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left column */}
      <div className="lg:col-span-2 space-y-4">

        {/* AI Summary */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-medical-blue" />
                Résumé clinique IA
              </CardTitle>
              <Button variant="outline" size="sm" onClick={generateAISummary} disabled={aiLoading}>
                {aiLoading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                {aiLoading ? "Génération..." : "Générer résumé"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {aiSummary ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs text-blue-600 font-medium mb-2 uppercase tracking-wide">
                  Résumé généré par IA — À valider par le médecin
                </p>
                <p className="text-sm whitespace-pre-wrap">{aiSummary}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Cliquez sur &quot;Générer résumé&quot; pour obtenir une synthèse clinique automatique basée sur les données du dossier.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Antécédents médicaux personnels */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-medical-green" />
                Antécédents médicaux personnels
              </CardTitle>
              {canWrite && <AddAntecedentDialog patient={patient} onSuccess={onRefresh} />}
            </div>
          </CardHeader>
          <CardContent>
            {antecedents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun antécédent enregistré</p>
            ) : (
              <div className="space-y-2">
                {antecedents.map((ant) => (
                  <div key={ant.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                    <div className="mt-0.5">
                      {ant.actif ? (
                        <div className="h-2 w-2 rounded-full bg-red-500 mt-1.5" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{ant.description}</span>
                        {ant.cim10_code && (
                          <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{ant.cim10_code}</span>
                        )}
                        <Badge variant={ant.actif ? "danger" : "success"} className="text-xs">
                          {ant.actif ? "Actif" : "Résolu"}
                        </Badge>
                        <Badge variant="secondary" className="text-xs capitalize">{ant.categorie}</Badge>
                      </div>
                      {ant.date_debut && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Depuis le {formatDate(ant.date_debut)}{ant.date_fin ? ` → ${formatDate(ant.date_fin)}` : ""}
                        </p>
                      )}
                      {ant.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">{ant.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Allergies */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Allergies et intolérances
              </CardTitle>
              {canWrite && <AddAllergieDialog patient={patient} onSuccess={onRefresh} />}
            </div>
          </CardHeader>
          <CardContent>
            {allergies.filter((a) => a.actif).length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune allergie connue enregistrée</p>
            ) : (
              <div className="space-y-2">
                {allergies.filter((a) => a.actif).map((allergie) => (
                  <div key={allergie.id} className={`flex items-start gap-3 p-3 rounded-lg border ${getSeverityColor(allergie.severite)}`}>
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{allergie.substance}</span>
                        <Badge variant="outline" className="text-xs capitalize">{allergie.type}</Badge>
                        <Badge className={`text-xs ${getSeverityColor(allergie.severite)}`}>
                          {allergie.severite === "anaphylactique" ? "ANAPHYLACTIQUE" : allergie.severite}
                        </Badge>
                      </div>
                      <p className="text-xs mt-1">{allergie.reaction}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Antécédents familiaux */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <User2 className="h-4 w-4 text-purple-500" />
                Antécédents familiaux
              </CardTitle>
              <div className="flex items-center gap-1">
                {antecedentsFamiliaux.length > 0 && (
                  <>
                    <Button
                      variant="ghost" size="sm"
                      className={`h-7 px-2 ${familyView === "tree" ? "bg-muted" : ""}`}
                      onClick={() => setFamilyView("tree")}
                      title="Vue arbre généalogique"
                    >
                      <Network className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      className={`h-7 px-2 ${familyView === "list" ? "bg-muted" : ""}`}
                      onClick={() => setFamilyView("list")}
                      title="Vue liste"
                    >
                      <List className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
                {canWrite && <AddAntecedentFamilialDialog patient={patient} onSuccess={onRefresh} />}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {antecedentsFamiliaux.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun antécédent familial enregistré</p>
            ) : familyView === "tree" ? (
              <FamilyTreeSVG antecedentsFamiliaux={antecedentsFamiliaux} />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {antecedentsFamiliaux.map((af) => (
                  <div key={af.id} className="p-3 bg-muted/50 rounded-lg border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      {parentLabels[af.parent] || af.parent}
                    </p>
                    <p className="text-sm">{af.pathologie}</p>
                    {af.statut_vital === "decede" && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Décédé{af.cause_deces ? ` — ${af.cause_deces}` : ""}
                        {af.age_deces ? ` (${af.age_deces} ans)` : ""}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right column */}
      <div className="space-y-4">

        {/* Prescriptions actives */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Pill className="h-4 w-4 text-medical-orange" />
              Traitements en cours
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activePrescriptions.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucun traitement actif</p>
            ) : (
              <div className="space-y-2">
                {activePrescriptions.slice(0, 6).map((p) => (
                  <div key={p.id} className="text-xs p-2 bg-orange-50 rounded border border-orange-200">
                    <p className="font-semibold">{p.medicament_dci}</p>
                    <p className="text-muted-foreground">{p.dosage} — {p.posologie}</p>
                    {p.date_expiration && (
                      <p className="text-orange-600 mt-0.5">
                        <Clock className="h-3 w-3 inline mr-1" />
                        Exp. {formatDate(p.date_expiration)}
                      </p>
                    )}
                  </div>
                ))}
                {activePrescriptions.length > 6 && (
                  <p className="text-xs text-muted-foreground text-center">+{activePrescriptions.length - 6} autres traitements</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Habitudes de vie */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-teal-500" />
                Habitudes de vie
              </CardTitle>
              {canWrite && <EditHabitudesDialog patient={patient} habitudes={habitudes} onSuccess={onRefresh} />}
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {!habitudes ? (
              <p className="text-muted-foreground">Non renseignées</p>
            ) : (
              <>
                {habitudes.tabac && (
                  <div className="flex items-center gap-2">
                    <Cigarette className="h-3.5 w-3.5 text-gray-500" />
                    <span className="capitalize">{habitudes.tabac.replace("_", " ")}</span>
                    {habitudes.tabac_quantite && <span className="text-muted-foreground">— {habitudes.tabac_quantite}</span>}
                  </div>
                )}
                {habitudes.alcool && (
                  <div className="flex items-center gap-2">
                    <Wine className="h-3.5 w-3.5 text-gray-500" />
                    <span className="capitalize">{habitudes.alcool}</span>
                    {habitudes.alcool_unites_semaine && <span className="text-muted-foreground">— {habitudes.alcool_unites_semaine} u/sem</span>}
                  </div>
                )}
                {habitudes.activite_physique && (
                  <div className="flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5 text-gray-500" />
                    <span className="capitalize">{habitudes.activite_physique}</span>
                  </div>
                )}
                {habitudes.alimentation && (
                  <div className="flex items-center gap-2">
                    <Utensils className="h-3.5 w-3.5 text-gray-500" />
                    <span>{habitudes.alimentation}</span>
                  </div>
                )}
                <div className="flex gap-3 pt-1 flex-wrap">
                  <span className={`text-xs ${habitudes.eau_potable ? "text-green-600" : "text-red-500"}`}>
                    💧 {habitudes.eau_potable ? "Eau potable" : "Eau non potable"}
                  </span>
                  <span className={`text-xs ${habitudes.electricite ? "text-green-600" : "text-red-500"}`}>
                    ⚡ {habitudes.electricite ? "Électricité" : "Pas d'électricité"}
                  </span>
                  {habitudes.assainissement !== null && (
                    <span className={`text-xs ${habitudes.assainissement ? "text-green-600" : "text-red-500"}`}>
                      🚿 {habitudes.assainissement ? "Assainissement OK" : "Assainissement insuffisant"}
                    </span>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Dernière consultation */}
        {lastConsultation && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-medical-green" />
                Dernière consultation
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-1">
              <p className="text-muted-foreground">{formatDate(lastConsultation.date_consultation)}</p>
              <p className="font-medium">{lastConsultation.motif}</p>
              {lastConsultation.diagnostic_principal && (
                <p className="text-muted-foreground">{lastConsultation.diagnostic_principal}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Infos patient */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Informations administratives
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1.5">
            {patient.assurance_organisme && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Assurance</span>
                <span className="font-medium">{patient.assurance_organisme} ({patient.assurance_taux}%)</span>
              </div>
            )}
            {patient.situation_matrimoniale && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Statut marital</span>
                <span className="font-medium capitalize">{patient.situation_matrimoniale}</span>
              </div>
            )}
            {patient.nombre_enfants !== null && patient.nombre_enfants !== undefined && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Enfants</span>
                <span className="font-medium">{patient.nombre_enfants}</span>
              </div>
            )}
            {patient.nationalite && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nationalité</span>
                <span className="font-medium">{patient.nationalite}</span>
              </div>
            )}
            {patient.langue_preferee && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Langue préférée</span>
                <span className="font-medium">{patient.langue_preferee}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dossier créé</span>
              <span className="font-medium">{formatDate(patient.created_at)}</span>
            </div>
          </CardContent>
        </Card>

        {/* RGPD Consents */}
        <RGPDConsentSection patient={patient} canWrite={canWrite} />
      </div>
    </div>
  );
}
