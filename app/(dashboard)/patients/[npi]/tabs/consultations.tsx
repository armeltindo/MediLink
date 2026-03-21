"use client";
import { useState, useEffect, useMemo } from "react";
import { Patient, Consultation, Constante } from "@/types";
import { supabase, isDemoMode } from "@/lib/supabase";
import { formatDateTime, calculateIMC } from "@/lib/utils";
import { searchCIM10, CIM10Code } from "@/lib/cim10";
import { toast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { ConstantesChart } from "@/components/charts/constantes-chart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Loader2, Plus, ChevronDown, ChevronUp, Search, Activity,
  Stethoscope, AlertCircle, Building2, Video, CalendarDays,
  FileText, ClipboardList, HeartPulse, TrendingUp, ChevronRight,
} from "lucide-react";

// ─── Type config ────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; badge: string; border: string }> = {
  externe:        { label: "Externe",        icon: Stethoscope, badge: "bg-blue-100 text-blue-800",   border: "border-l-blue-400" },
  urgence:        { label: "Urgence",        icon: AlertCircle, badge: "bg-red-100 text-red-800",     border: "border-l-red-500" },
  hospitalisation:{ label: "Hospitalisation",icon: Building2,   badge: "bg-purple-100 text-purple-800",border: "border-l-purple-400" },
  teleconsultation:{ label: "Téléconsultation",icon: Video,     badge: "bg-green-100 text-green-800", border: "border-l-green-400" },
};

// ─── Vital sign alert ranges ─────────────────────────────────────────────────

function getVitalAlert(key: string, value: number | null | undefined): "normal" | "warning" | "danger" {
  if (value == null) return "normal";
  switch (key) {
    case "ta_sys":   return value > 180 ? "danger" : value > 140 ? "warning" : "normal";
    case "ta_dia":   return value > 110 ? "danger" : value > 90  ? "warning" : "normal";
    case "fc":       return value > 120 || value < 50 ? "danger" : value > 100 || value < 60 ? "warning" : "normal";
    case "temperature": return value >= 39.5 ? "danger" : value >= 38 ? "warning" : value < 36 ? "warning" : "normal";
    case "spo2":     return value < 90 ? "danger" : value < 95 ? "warning" : "normal";
    default:         return "normal";
  }
}

const alertColors = {
  normal:  "text-foreground",
  warning: "text-orange-600 font-bold",
  danger:  "text-red-600 font-bold",
};

// ─── Stats Bar ───────────────────────────────────────────────────────────────

function StatsBar({ consultations }: { consultations: Consultation[] }) {
  const currentYear = new Date().getFullYear();
  const thisYear = consultations.filter((c) => new Date(c.date_consultation).getFullYear() === currentYear).length;
  const urgences  = consultations.filter((c) => c.type_consultation === "urgence").length;
  const last = consultations[0];

  const stats = [
    { label: "Total",        value: consultations.length, color: "text-blue-600",  bg: "bg-blue-50",  border: "border-blue-200" },
    { label: String(currentYear), value: thisYear,        color: "text-teal-600",  bg: "bg-teal-50",  border: "border-teal-200" },
    { label: "Urgences",     value: urgences,             color: "text-red-600",   bg: "bg-red-50",   border: "border-red-200" },
    { label: "Dernière",     value: last ? formatDateTime(last.date_consultation).split(" ")[0] : "—",
      color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200", small: true },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {stats.map(({ label, value, color, bg, border, small }) => (
        <div key={label} className={`rounded-lg border ${border} ${bg} px-3 py-2 text-center`}>
          <p className={`font-bold ${color} ${small ? "text-sm leading-5 mt-0.5" : "text-xl"}`}>{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Consultation Card ────────────────────────────────────────────────────────

function ConsultationCard({ consultation, constantes }: { consultation: Consultation; constantes: Constante[] }) {
  const [expanded, setExpanded] = useState(false);

  const type = TYPE_CONFIG[consultation.type_consultation || "externe"] ?? TYPE_CONFIG.externe;
  const TypeIcon = type.icon;

  const c0 = constantes[0];
  const vitals = c0 ? [
    { key: "ta_sys",      label: "TA",    value: c0.ta_sys && c0.ta_dia ? `${c0.ta_sys}/${c0.ta_dia}` : null, numVal: c0.ta_sys, unit: "mmHg" },
    { key: "fc",          label: "FC",    value: c0.fc ? String(c0.fc) : null,          numVal: c0.fc,          unit: "bpm" },
    { key: "temperature", label: "T°",    value: c0.temperature ? String(c0.temperature) : null, numVal: c0.temperature, unit: "°C" },
    { key: "spo2",        label: "SpO₂",  value: c0.spo2 ? String(c0.spo2) : null,      numVal: c0.spo2,        unit: "%" },
    { key: "poids",       label: "Poids", value: c0.poids ? String(c0.poids) : null,    numVal: null,           unit: "kg" },
    { key: "imc",         label: "IMC",   value: c0.imc ? String(c0.imc) : (c0.poids && c0.taille ? String(calculateIMC(c0.poids, c0.taille)) : null), numVal: null, unit: "" },
  ] : [];

  return (
    <Card className={`overflow-hidden border-l-4 ${type.border} transition-shadow hover:shadow-md`}>
      {/* Header row — always visible */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Type icon */}
        <div className="mt-0.5 p-1.5 rounded-md bg-muted flex-shrink-0">
          <TypeIcon className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{formatDateTime(consultation.date_consultation)}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${type.badge}`}>
              {type.label}
            </span>
          </div>
          <p className="text-sm font-medium mt-1 truncate">{consultation.motif}</p>
          {consultation.diagnostic_principal && (
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-muted-foreground truncate">{consultation.diagnostic_principal}</span>
              {consultation.diagnostic_cim10 && (
                <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded shrink-0">{consultation.diagnostic_cim10}</span>
              )}
            </div>
          )}
        </div>

        <Button variant="ghost" size="icon-sm" className="shrink-0">
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t bg-muted/20 divide-y">
          {/* Anamnèse */}
          {consultation.anamnese && (
            <div className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Anamnèse
              </p>
              <p className="text-sm leading-relaxed">{consultation.anamnese}</p>
            </div>
          )}

          {/* Constantes */}
          {vitals.length > 0 && (
            <div className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2.5 flex items-center gap-1.5">
                <HeartPulse className="h-3.5 w-3.5" />
                Constantes vitales
              </p>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {vitals.map(({ key, label, value, numVal, unit }) => {
                  if (!value) return null;
                  const alert = getVitalAlert(key, numVal);
                  return (
                    <div key={key} className={`bg-background rounded-lg p-2.5 border text-center ${
                      alert === "danger" ? "border-red-300 bg-red-50" :
                      alert === "warning" ? "border-orange-300 bg-orange-50" : ""
                    }`}>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className={`text-sm mt-0.5 ${alertColors[alert]}`}>
                        {value}
                        <span className="text-xs font-normal text-muted-foreground ml-0.5">{unit}</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Plan de prise en charge */}
          {consultation.plan_prise_en_charge && (
            <div className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <ClipboardList className="h-3.5 w-3.5" />
                Plan de prise en charge
              </p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{consultation.plan_prise_en_charge}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── New Consultation Dialog ──────────────────────────────────────────────────

function NewConsultationDialog({ patient, onSuccess, onClose }: {
  patient: Patient;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [cim10Query, setCim10Query] = useState("");
  const [cim10Results, setCim10Results] = useState<CIM10Code[]>([]);
  const [selectedCIM10, setSelectedCIM10] = useState<CIM10Code | null>(null);
  const [etablissements, setEtablissements] = useState<{ id: string; nom: string }[]>([]);
  const [form, setForm] = useState({
    motif: "", anamnese: "", diagnostic_principal: "",
    plan_prise_en_charge: "", type_consultation: "externe", etablissement_id: "",
    ta_sys: "", ta_dia: "", fc: "", fr: "", temperature: "", spo2: "", poids: "", taille: "",
  });

  useEffect(() => {
    supabase.from("etablissements").select("id, nom").then(({ data }) => setEtablissements(data || []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (isDemoMode) {
      toast({ variant: "destructive", title: "Mode démo", description: "Configurez NEXT_PUBLIC_SUPABASE_ANON_KEY pour enregistrer des données." });
      return;
    }
    setLoading(true);
    try {
      const { data: consultation, error } = await supabase.from("consultations").insert({
        patient_id: patient.id,
        medecin_id: user.id,
        etablissement_id: form.etablissement_id || etablissements[0]?.id,
        motif: form.motif,
        anamnese: form.anamnese || null,
        diagnostic_principal: form.diagnostic_principal || null,
        diagnostic_cim10: selectedCIM10?.code || null,
        plan_prise_en_charge: form.plan_prise_en_charge || null,
        type_consultation: form.type_consultation as "externe" | "urgence" | "hospitalisation" | "teleconsultation",
        date_consultation: new Date().toISOString(),
      }).select().single();
      if (error) throw error;

      const hasConstantes = form.ta_sys || form.fc || form.temperature || form.poids;
      if (hasConstantes && consultation) {
        const poids = form.poids ? parseFloat(form.poids) : null;
        const taille = form.taille ? parseFloat(form.taille) : null;
        await supabase.from("constantes").insert({
          consultation_id: consultation.id,
          patient_id: patient.id,
          ta_sys: form.ta_sys ? parseInt(form.ta_sys) : null,
          ta_dia: form.ta_dia ? parseInt(form.ta_dia) : null,
          fc: form.fc ? parseInt(form.fc) : null,
          fr: form.fr ? parseInt(form.fr) : null,
          temperature: form.temperature ? parseFloat(form.temperature) : null,
          spo2: form.spo2 ? parseFloat(form.spo2) : null,
          poids,
          taille,
          imc: poids && taille ? calculateIMC(poids, taille) : null,
          date_mesure: new Date().toISOString(),
        });
      }
      toast({ title: "Consultation enregistrée", description: `Motif : ${form.motif}` });
      onSuccess();
      onClose();
    } catch (error: unknown) {
      toast({ variant: "destructive", title: "Erreur", description: error instanceof Error ? error.message : "Erreur" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Type de consultation</Label>
          <Select value={form.type_consultation} onValueChange={(v) => setForm({ ...form, type_consultation: v })}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(TYPE_CONFIG).map(([v, { label, icon: Icon }]) => (
                <SelectItem key={v} value={v}>
                  <span className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    {label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      </div>

      <div className="space-y-1.5">
        <Label>Motif de consultation *</Label>
        <Input value={form.motif} onChange={(e) => setForm({ ...form, motif: e.target.value })} required
          placeholder="Ex: Suivi diabète, Douleur thoracique..." className="h-9" />
      </div>

      <div className="space-y-1.5">
        <Label>Anamnèse</Label>
        <Textarea value={form.anamnese} onChange={(e) => setForm({ ...form, anamnese: e.target.value })}
          rows={3} placeholder="Description clinique du motif..." />
      </div>

      {/* CIM-10 */}
      <div className="space-y-1.5">
        <Label>Diagnostic CIM-10</Label>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={selectedCIM10 ? `${selectedCIM10.code} — ${selectedCIM10.libelle}` : cim10Query}
            onChange={(e) => { setSelectedCIM10(null); setCim10Query(e.target.value); setCim10Results(searchCIM10(e.target.value)); }}
            placeholder="Rechercher diabète, HTA, paludisme..."
            className="pl-9 h-9"
          />
        </div>
        {cim10Results.length > 0 && !selectedCIM10 && (
          <div className="border rounded-md shadow-sm bg-background max-h-40 overflow-y-auto">
            {cim10Results.map((code) => (
              <button key={code.code} type="button"
                onClick={() => { setSelectedCIM10(code); setCim10Results([]); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent border-b last:border-0">
                <span className="font-mono font-medium text-medical-green">{code.code}</span>
                <span className="ml-2">{code.libelle}</span>
                <span className="ml-2 text-xs text-muted-foreground">({code.categorie})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Diagnostic principal (texte libre)</Label>
        <Input value={form.diagnostic_principal}
          onChange={(e) => setForm({ ...form, diagnostic_principal: e.target.value })}
          placeholder="Ex: Diabète type 2 décompensé" className="h-9" />
      </div>

      {/* Constantes */}
      <div className="space-y-2">
        <p className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          Constantes vitales
        </p>
        <div className="grid grid-cols-4 gap-2 text-sm">
          {[
            { key: "ta_sys", label: "TA sys", unit: "mmHg" },
            { key: "ta_dia", label: "TA dia", unit: "mmHg" },
            { key: "fc",    label: "FC",      unit: "bpm" },
            { key: "fr",    label: "FR",      unit: "rpm" },
            { key: "temperature", label: "Temp", unit: "°C", step: "0.1" },
            { key: "spo2",  label: "SpO₂",    unit: "%",   step: "0.1" },
            { key: "poids", label: "Poids",   unit: "kg",  step: "0.1" },
            { key: "taille",label: "Taille",  unit: "cm" },
          ].map(({ key, label, unit, step }) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs text-muted-foreground">{label} <span className="text-muted-foreground/60">({unit})</span></Label>
              <Input
                type="number" step={step}
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="h-8 text-sm" placeholder="—"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Plan de prise en charge</Label>
        <Textarea value={form.plan_prise_en_charge}
          onChange={(e) => setForm({ ...form, plan_prise_en_charge: e.target.value })}
          rows={3} placeholder="Ordonnance, examens prescrits, orientation..." />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
        <Button type="submit" variant="medical" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Enregistrer
        </Button>
      </div>
    </form>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function ConsultationsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        {[1,2,3,4].map((i) => <div key={i} className="h-14 rounded-lg border bg-muted animate-pulse" />)}
      </div>
      <div className="h-8 w-48 rounded bg-muted animate-pulse" />
      {[1,2,3].map((i) => (
        <div key={i} className="h-20 rounded-lg border bg-card animate-pulse border-l-4 border-l-muted" />
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ConsultationsTabProps {
  patient: Patient;
  consultations?: Consultation[];
  onRefresh: () => void;
}

export function ConsultationsTab({ patient, consultations: initialConsultations, onRefresh }: ConsultationsTabProps) {
  const [open, setOpen] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const { user } = useUser();
  const canCreate = user?.role === "medecin" || user?.role === "super_admin";

  const [consultations, setConsultations] = useState<Consultation[]>(initialConsultations || []);
  const [tabLoading, setTabLoading] = useState(!initialConsultations);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [allConstantes, setAllConstantes] = useState<Constante[]>([]);

  useEffect(() => {
    if (initialConsultations) return;
    supabase
      .from("consultations")
      .select("*")
      .eq("patient_id", patient.id)
      .is("deleted_at", null)
      .order("date_consultation", { ascending: false })
      .then(({ data }) => { setConsultations(data || []); setTabLoading(false); });
  }, [patient.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    supabase.from("constantes").select("*").eq("patient_id", patient.id).order("date_mesure").limit(200)
      .then(({ data }) => setAllConstantes(data || []));
  }, [patient.id]);

  const availableYears = useMemo(() =>
    Array.from(new Set(consultations.map((c) => new Date(c.date_consultation).getFullYear()))).sort((a, b) => b - a),
    [consultations]
  );

  const filtered = useMemo(() => consultations.filter((c) => {
    if (filterType !== "all" && c.type_consultation !== filterType) return false;
    if (filterYear !== "all" && new Date(c.date_consultation).getFullYear().toString() !== filterYear) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!c.motif?.toLowerCase().includes(q) && !c.diagnostic_principal?.toLowerCase().includes(q) && !c.diagnostic_cim10?.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [consultations, filterType, filterYear, search]);

  // Group by year for the timeline
  const grouped = useMemo(() => {
    const map: Record<number, Consultation[]> = {};
    filtered.forEach((c) => {
      const y = new Date(c.date_consultation).getFullYear();
      if (!map[y]) map[y] = [];
      map[y].push(c);
    });
    return Object.entries(map).sort(([a], [b]) => Number(b) - Number(a)) as [string, Consultation[]][];
  }, [filtered]);

  if (tabLoading) return <ConsultationsSkeleton />;

  return (
    <div className="space-y-4">
      {/* Stats */}
      {consultations.length > 0 && <StatsBar consultations={consultations} />}

      {/* Header / filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher motif, diagnostic..."
            className="pl-9 h-8 text-sm"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Type..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {Object.entries(TYPE_CONFIG).map(([v, { label }]) => (
              <SelectItem key={v} value={v}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="h-8 w-24 text-xs"><SelectValue placeholder="Année..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {availableYears.map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="medical" size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Nouvelle consultation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nouvelle consultation — {patient.prenom} {patient.nom}</DialogTitle>
              </DialogHeader>
              <NewConsultationDialog patient={patient} onSuccess={onRefresh} onClose={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Charts — collapsible */}
      {allConstantes.length > 0 && (
        <Card>
          <button
            type="button"
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
            onClick={() => setShowCharts(!showCharts)}
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="h-4 w-4 text-medical-blue" />
              Évolution des constantes vitales
              <span className="text-xs text-muted-foreground font-normal">({allConstantes.length} mesures)</span>
            </span>
            <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${showCharts ? "rotate-90" : ""}`} />
          </button>
          {showCharts && (
            <CardContent className="pt-0 pb-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ConstantesChart constantes={allConstantes} type="tension" />
                <ConstantesChart constantes={allConstantes} type="poids" />
                <ConstantesChart constantes={allConstantes} type="temperature" />
                <ConstantesChart constantes={allConstantes} type="spo2" />
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Empty state */}
      {consultations.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <CalendarDays className="h-8 w-8 opacity-40" />
          </div>
          <p className="font-medium">Aucune consultation enregistrée</p>
          <p className="text-sm mt-1">Créez la première consultation pour ce patient.</p>
          {canCreate && (
            <Button variant="medical" size="sm" className="mt-4" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Nouvelle consultation
            </Button>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucune consultation pour ces critères.</p>
          <Button variant="ghost" size="sm" className="mt-2"
            onClick={() => { setSearch(""); setFilterType("all"); setFilterYear("all"); }}>
            Réinitialiser les filtres
          </Button>
        </div>
      ) : (
        // Grouped timeline by year
        <div className="space-y-5">
          {grouped.map(([year, items]) => (
            <div key={year} className="space-y-2">
              {/* Year separator */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{year}</span>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">{items.length} consultation{items.length > 1 ? "s" : ""}</span>
              </div>
              {items.map((c) => (
                <ConsultationCard
                  key={c.id}
                  consultation={c}
                  constantes={allConstantes.filter((ct) => ct.consultation_id === c.id)}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
