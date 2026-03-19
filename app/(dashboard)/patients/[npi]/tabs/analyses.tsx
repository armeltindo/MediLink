"use client";
import { useState, useEffect, useMemo, ComponentType, FormEvent, ChangeEvent } from "react";
import { Patient, AnalysePrescrite, ResultatAnalyse } from "@/types";
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
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceArea, ReferenceLine,
} from "recharts";
import {
  FlaskConical, Plus, Loader2, ArrowUp, ArrowDown, Minus,
  TrendingUp, Clock, CheckCircle2, XCircle, AlertTriangle,
  ChevronDown, ChevronUp, ChevronRight, Activity,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const BIO_PARAMS = [
  { key: "Glycémie à jeun",         unit: "mmol/L", min: 3.9, max: 5.5,  color: "#f59e0b" },
  { key: "HbA1c",                   unit: "%",      min: 4.0, max: 5.7,  color: "#8b5cf6" },
  { key: "Créatinine sérique",      unit: "µmol/L", min: 53,  max: 106,  color: "#3b82f6" },
  { key: "Hémoglobine",             unit: "g/dL",   min: 12,  max: 17,   color: "#ef4444" },
  { key: "CD4 / Charge virale VIH", unit: "cell/mm³",min:500, max: 1500, color: "#10b981" },
  { key: "Cholestérol total",        unit: "mmol/L", min: 0,   max: 5.2,  color: "#f97316" },
  { key: "Plaquettes",              unit: "×10⁹/L", min: 150, max: 400,  color: "#06b6d4" },
  { key: "ALAT / ASAT",             unit: "UI/L",   min: 0,   max: 40,   color: "#84cc16" },
  { key: "INR / TP",                unit: "%",      min: 70,  max: 100,  color: "#ec4899" },
];

const COMMON_ANALYSES = [
  "Numération Formule Sanguine (NFS)", "Glycémie à jeun", "HbA1c",
  "Créatinine sérique", "Bilan lipidique", "ALAT / ASAT",
  "CD4 / Charge virale VIH", "ECBU", "Test de grossesse",
  "Paludisme (TDR / Goutte épaisse)", "Groupage sanguin",
  "INR / TP", "TSH", "CRP / VS",
];

const STATUS_CONFIG: Record<string, {
  label: string; variant: BadgeVariant;
  icon: ComponentType<{ className?: string }>; border: string; bg: string;
}> = {
  prescrit:       { label: "Prescrit",    variant: "info",    icon: Clock,        border: "border-l-blue-400",   bg: "" },
  en_attente:     { label: "En attente",  variant: "warning", icon: Clock,        border: "border-l-amber-400",  bg: "" },
  en_cours:       { label: "En cours",    variant: "warning", icon: Activity,     border: "border-l-orange-400", bg: "" },
  rendu:          { label: "Rendu",       variant: "success", icon: CheckCircle2, border: "border-l-green-400",  bg: "bg-green-50/30" },
  annule:         { label: "Annulé",      variant: "danger",  icon: XCircle,      border: "border-l-gray-300",   bg: "bg-muted/30" },
};

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ analyses }: { analyses: AnalysePrescrite[] }) {
  const pending  = analyses.filter((a) => a.statut === "prescrit" || a.statut === "en_attente" || a.statut === "en_cours").length;
  const done     = analyses.filter((a) => a.statut === "rendu").length;
  const urgent   = analyses.filter((a) => a.urgence).length;

  return (
    <div className="grid grid-cols-4 gap-2">
      {[
        { label: "Total",       value: analyses.length, color: "text-blue-600",  bg: "bg-blue-50",   border: "border-blue-200" },
        { label: "En attente",  value: pending,         color: "text-amber-600", bg: "bg-amber-50",  border: "border-amber-200" },
        { label: "Urgentes",    value: urgent,          color: "text-red-600",   bg: "bg-red-50",    border: "border-red-200" },
        { label: "Rendues",     value: done,            color: "text-green-600", bg: "bg-green-50",  border: "border-green-200" },
      ].map(({ label, value, color, bg, border }) => (
        <div key={label} className={`rounded-lg border ${border} ${bg} px-3 py-2 text-center`}>
          <p className={`text-xl font-bold ${color}`}>{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Normal-range mini-bar ────────────────────────────────────────────────────

function NormalRangeBar({ value, min, max }: { value: number; min: number; max: number }) {
  const range  = max - min;
  const isLow  = value < min;
  const isHigh = value > max;

  // Clamp position percent within bar (0–100)
  let pct: number;
  if (isLow)  pct = Math.max(0, ((value - min + range * 0.2) / (range * 1.4)) * 100);
  else if (isHigh) pct = Math.min(100, ((value - min) / (range * 1.4)) * 100);
  else pct = ((value - min) / range) * 100;

  // Normal zone within bar spans roughly 14%–86%
  const normalStart = (range * 0.2 / (range * 1.4)) * 100; // ≈ 14%
  const normalEnd   = normalStart + (range / (range * 1.4)) * 100; // ≈ 86%

  return (
    <div className="flex items-center gap-1.5 mt-1">
      <span className="text-[10px] text-muted-foreground w-6 text-right shrink-0">{min}</span>
      <div className="relative flex-1 h-2 rounded-full bg-muted overflow-hidden">
        {/* Normal zone */}
        <div
          className="absolute h-full bg-green-200 rounded-full"
          style={{ left: `${normalStart}%`, width: `${normalEnd - normalStart}%` }}
        />
        {/* Value dot */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full border-2 border-background ${
            isLow || isHigh ? "bg-red-500" : "bg-green-600"
          }`}
          style={{ left: `${Math.max(4, Math.min(96, pct))}%` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground w-6 shrink-0">{max}</span>
    </div>
  );
}

// ─── Result Display ───────────────────────────────────────────────────────────

function ResultRow({ r }: { r: ResultatAnalyse }) {
  const isLow      = r.valeur !== null && r.valeur_min !== null && r.valeur < r.valeur_min;
  const isHigh     = r.valeur !== null && r.valeur_max !== null && r.valeur > r.valeur_max;
  const isAbnormal = isLow || isHigh;
  const hasRange   = r.valeur !== null && r.valeur_min !== null && r.valeur_max !== null;

  return (
    <div className={`rounded-lg border p-3 ${isAbnormal ? "border-red-200 bg-red-50/60" : "border-border bg-muted/20"}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{r.parametre}</p>
          <p className="text-xs text-muted-foreground">{formatDateTime(r.date_resultat)}</p>
        </div>
        <div className="text-right shrink-0">
          {r.valeur !== null ? (
            <div className={`flex items-center gap-1 font-bold text-base ${isAbnormal ? "text-red-600" : "text-green-700"}`}>
              {isHigh && <ArrowUp className="h-4 w-4" />}
              {isLow  && <ArrowDown className="h-4 w-4" />}
              {!isAbnormal && <Minus className="h-4 w-4" />}
              <span>{r.valeur}</span>
              {r.unite && <span className="text-xs font-normal text-muted-foreground">{r.unite}</span>}
            </div>
          ) : r.valeur_texte ? (
            <span className={`text-sm font-bold ${
              /positif|anormal|patholog/i.test(r.valeur_texte) ? "text-red-600" :
              /négatif|normal/i.test(r.valeur_texte) ? "text-green-700" : "text-foreground"
            }`}>
              {r.valeur_texte}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
          {r.valeur_min !== null && r.valeur_max !== null && (
            <p className="text-[10px] text-muted-foreground text-right mt-0.5">
              N : {r.valeur_min}–{r.valeur_max} {r.unite}
            </p>
          )}
        </div>
      </div>
      {hasRange && r.valeur !== null && (
        <NormalRangeBar value={r.valeur} min={r.valeur_min!} max={r.valeur_max!} />
      )}
      {r.interpretation && (
        <p className="text-xs text-muted-foreground mt-1.5 italic">{r.interpretation}</p>
      )}
    </div>
  );
}

// ─── Evolution Chart ──────────────────────────────────────────────────────────

interface ChartPoint { date: string; value: number }

function BiologieEvolutionSection({ patientId }: { patientId: string }) {
  const [open, setOpen] = useState(false);
  const [selectedParam, setSelectedParam] = useState(BIO_PARAMS[0].key);
  const [period, setPeriod] = useState<"3m" | "6m" | "1y" | "all">("6m");
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);

  const paramConfig = BIO_PARAMS.find((p) => p.key === selectedParam) || BIO_PARAMS[0];

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingChart(true);

    const now = new Date();
    let from: Date | null = null;
    if (period === "3m") from = new Date(new Date().setMonth(now.getMonth() - 3));
    else if (period === "6m") from = new Date(new Date().setMonth(now.getMonth() - 6));
    else if (period === "1y") from = new Date(new Date().setFullYear(now.getFullYear() - 1));

    let q = supabase
      .from("resultats_analyse")
      .select("valeur, date_resultat, analyses_prescrites!inner(patient_id)")
      .eq("analyses_prescrites.patient_id", patientId)
      .ilike("parametre", `%${selectedParam.split(" ")[0]}%`)
      .not("valeur", "is", null)
      .order("date_resultat", { ascending: true })
      .limit(50);

    if (from) q = q.gte("date_resultat", from.toISOString());

    q.then(({ data }: { data: { valeur: number; date_resultat: string }[] | null }) => {
      if (cancelled) return;
      setChartData(
        (data || []).map((r) => ({
          date: new Date(r.date_resultat).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" }),
          value: r.valeur,
        }))
      );
      setLoadingChart(false);
    });

    return () => { cancelled = true; };
  }, [patientId, selectedParam, period, open]);

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
    if (!active || !payload?.length) return null;
    const v = payload[0].value;
    const isAbnormal = v < paramConfig.min || v > paramConfig.max;
    return (
      <div className="bg-white border rounded-lg p-2.5 shadow text-xs">
        <p className="font-semibold text-muted-foreground mb-1">{label}</p>
        <p className={`font-bold text-sm ${isAbnormal ? "text-red-600" : "text-green-700"}`}>
          {v} {paramConfig.unit}
          {isAbnormal && (v > paramConfig.max ? " ↑" : " ↓")}
        </p>
        <p className="text-muted-foreground mt-0.5">Normal : {paramConfig.min}–{paramConfig.max}</p>
      </div>
    );
  };

  return (
    <Card>
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <TrendingUp className="h-4 w-4 text-medical-blue" />
          Évolution graphique des paramètres biologiques
        </span>
        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <CardContent className="pt-0 pb-5 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedParam} onValueChange={setSelectedParam}>
              <SelectTrigger className="h-8 text-xs w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                {BIO_PARAMS.map((p) => (
                  <SelectItem key={p.key} value={p.key} className="text-xs">{p.key}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={period} onValueChange={(v: string) => setPeriod(v as typeof period)}>
              <SelectTrigger className="h-8 text-xs w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="3m" className="text-xs">3 mois</SelectItem>
                <SelectItem value="6m" className="text-xs">6 mois</SelectItem>
                <SelectItem value="1y" className="text-xs">1 an</SelectItem>
                <SelectItem value="all" className="text-xs">Tout</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">
              Norme : {paramConfig.min}–{paramConfig.max} {paramConfig.unit}
            </span>
          </div>

          {loadingChart ? (
            <div className="h-44 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <TrendingUp className="h-8 w-8 opacity-20" />
              <p className="text-xs">Aucun résultat pour ce paramètre sur la période</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={44}
                  label={{ value: paramConfig.unit, position: "insideLeft", angle: -90, fontSize: 9, fill: "#94a3b8", dy: 40 }} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceArea y1={paramConfig.min} y2={paramConfig.max} fill="#dcfce7" fillOpacity={0.4} />
                <ReferenceLine y={paramConfig.max} stroke="#16a34a" strokeDasharray="4 2"
                  label={{ value: `Max ${paramConfig.max}`, fontSize: 8, fill: "#16a34a" }} />
                <ReferenceLine y={paramConfig.min} stroke="#16a34a" strokeDasharray="4 2"
                  label={{ value: `Min ${paramConfig.min}`, fontSize: 8, fill: "#16a34a" }} />
                <Line type="monotone" dataKey="value" stroke={paramConfig.color}
                  strokeWidth={2} dot={{ r: 4, fill: paramConfig.color }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Analyse Card ─────────────────────────────────────────────────────────────

function AnalyseCard({
  analyse, canSaisirResultat, onRefresh,
}: {
  analyse: AnalysePrescrite;
  canSaisirResultat: boolean;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [resultats, setResultats] = useState<ResultatAnalyse[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newResultat, setNewResultat] = useState({
    parametre: "", valeur: "", valeur_texte: "", unite: "",
    valeur_min: "", valeur_max: "", interpretation: "",
  });
  const { user } = useUser();

  const status = STATUS_CONFIG[analyse.statut] ?? STATUS_CONFIG.prescrit;
  const StatusIcon = status.icon;

  async function toggle() {
    if (resultats === null) {
      setLoading(true);
      const { data } = await supabase
        .from("resultats_analyse")
        .select("*")
        .eq("analyse_id", analyse.id)
        .order("date_resultat");
      setResultats(data || []);
      setLoading(false);
    }
    setExpanded(!expanded);
  }

  async function submitResultat(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await supabase.from("resultats_analyse").insert({
        analyse_id: analyse.id,
        patient_id: analyse.patient_id,
        laborantin_id: user.id,
        parametre: newResultat.parametre,
        valeur: newResultat.valeur ? parseFloat(newResultat.valeur) : null,
        valeur_texte: newResultat.valeur_texte || null,
        unite: newResultat.unite || null,
        valeur_min: newResultat.valeur_min ? parseFloat(newResultat.valeur_min) : null,
        valeur_max: newResultat.valeur_max ? parseFloat(newResultat.valeur_max) : null,
        interpretation: newResultat.interpretation || null,
        date_resultat: new Date().toISOString(),
      });
      await supabase.from("analyses_prescrites").update({ statut: "rendu" }).eq("id", analyse.id);
      toast({ title: "Résultat enregistré" });
      setShowForm(false);
      setResultats(null);
      onRefresh();
    } catch {
      toast({ variant: "destructive", title: "Erreur lors de l'enregistrement" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className={`overflow-hidden border-l-4 ${status.border} ${status.bg} transition-shadow hover:shadow-md`}>
      {/* Header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/20 transition-colors"
        onClick={toggle}
      >
        {/* Status icon */}
        <div className="p-1.5 rounded-md bg-muted flex-shrink-0">
          <StatusIcon className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm truncate">{analyse.type_analyse}</span>
            <Badge variant={status.variant as BadgeVariant}>{status.label}</Badge>
            {analyse.urgence && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full animate-pulse">
                <AlertTriangle className="h-3 w-3" />
                URGENT
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Prescrit le {formatDate(analyse.date_prescription)}
          </p>
          {analyse.instructions && (
            <p className="text-xs text-muted-foreground mt-0.5 italic truncate">{analyse.instructions}</p>
          )}
        </div>

        <Button variant="ghost" size="icon-sm" className="shrink-0">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="border-t bg-background/60 p-4 space-y-4">
          {/* Results */}
          {resultats && resultats.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Résultats ({resultats.length})
              </p>
              <div className="space-y-2">
                {resultats.map((r: ResultatAnalyse) => <ResultRow key={r.id} r={r} />)}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
              <FlaskConical className="h-4 w-4 opacity-40" />
              <span>Aucun résultat saisi pour cette analyse.</span>
            </div>
          )}

          {/* Laborantin form */}
          {canSaisirResultat && analyse.statut !== "rendu" && analyse.statut !== "annule" && (
            <div className="border-t pt-4">
              {!showForm ? (
                <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Saisir un résultat
                </Button>
              ) : (
                <form onSubmit={submitResultat} className="space-y-3">
                  <p className="text-sm font-semibold">Saisir un résultat</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1 col-span-2 sm:col-span-1">
                      <Label className="text-xs">Paramètre *</Label>
                      <Input
                        value={newResultat.parametre}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setNewResultat({ ...newResultat, parametre: e.target.value })}
                        placeholder="Ex: Glycémie à jeun" required className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Unité</Label>
                      <Input
                        value={newResultat.unite}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setNewResultat({ ...newResultat, unite: e.target.value })}
                        placeholder="mmol/L, g/dL…" className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Valeur numérique</Label>
                      <Input
                        type="number" step="any"
                        value={newResultat.valeur}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setNewResultat({ ...newResultat, valeur: e.target.value })}
                        placeholder="Ex: 7.2" className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Valeur texte</Label>
                      <Input
                        value={newResultat.valeur_texte}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setNewResultat({ ...newResultat, valeur_texte: e.target.value })}
                        placeholder="Négatif, Positif…" className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Norme min</Label>
                      <Input
                        type="number" step="any"
                        value={newResultat.valeur_min}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setNewResultat({ ...newResultat, valeur_min: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Norme max</Label>
                      <Input
                        type="number" step="any"
                        value={newResultat.valeur_max}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setNewResultat({ ...newResultat, valeur_max: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Interprétation</Label>
                    <Input
                      value={newResultat.interpretation}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setNewResultat({ ...newResultat, interpretation: e.target.value })}
                      placeholder="Normal, Élevé, Pathologique…" className="h-8 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" variant="medical" disabled={loading}>
                      {loading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                      Enregistrer
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                      Annuler
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

interface AnalysesTabProps {
  patient: Patient;
  analyses?: AnalysePrescrite[];
  onRefresh: () => void;
}

export function AnalysesTab({ patient, analyses: initialAnalyses, onRefresh }: AnalysesTabProps) {
  const [open, setOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { user } = useUser();
  const canCreate       = user?.role === "medecin" || user?.role === "super_admin";
  const canSaisirResultat = user?.role === "laborantin" || user?.role === "super_admin";

  const [analyses, setAnalyses] = useState<AnalysePrescrite[]>(initialAnalyses || []);
  const [tabLoading, setTabLoading] = useState(!initialAnalyses);
  const [newAnalyse, setNewAnalyse] = useState({ type_analyse: "", instructions: "", urgence: false });
  const [submitting, setSubmitting] = useState(false);

  // Lazy load
  useEffect(() => {
    if (initialAnalyses) return;
    supabase
      .from("analyses_prescrites")
      .select("*")
      .eq("patient_id", patient.id)
      .is("deleted_at", null)
      .order("date_prescription", { ascending: false })
      .then(({ data }: { data: AnalysePrescrite[] | null }) => { setAnalyses(data || []); setTabLoading(false); });
  }, [patient.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime notifications for médecin when laborantin saves a result
  useEffect(() => {
    if (analyses.length === 0) return;
    const channel = supabase
      .channel(`resultats-patient-${patient.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public",
        table: "resultats_analyse",
        filter: `patient_id=eq.${patient.id}`,
      }, (payload: { new: Record<string, unknown> }) => {
        if (user?.role === "medecin" || user?.role === "super_admin") {
          toast({
            title: "Résultats disponibles",
            description: `Nouveaux résultats : ${(payload.new as unknown as ResultatAnalyse).parametre || "analyse"}`,
          });
          onRefresh();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient.id, analyses.length]);

  const filtered = useMemo(() =>
    analyses.filter((a: AnalysePrescrite) => filterStatus === "all" || a.statut === filterStatus),
    [analyses, filterStatus]
  );

  async function createAnalyse(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      await supabase.from("analyses_prescrites").insert({
        patient_id: patient.id,
        medecin_id: user.id,
        consultation_id: null,
        type_analyse: newAnalyse.type_analyse,
        instructions: newAnalyse.instructions || null,
        urgence: newAnalyse.urgence,
        statut: "prescrit",
        date_prescription: new Date().toISOString(),
      });
      toast({ title: "Analyse prescrite", description: newAnalyse.type_analyse });
      setOpen(false);
      setNewAnalyse({ type_analyse: "", instructions: "", urgence: false });
      onRefresh();
    } catch {
      toast({ variant: "destructive", title: "Erreur lors de la prescription" });
    } finally {
      setSubmitting(false);
    }
  }

  if (tabLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-2">
          {[1,2,3,4].map((i) => <div key={i} className="h-14 rounded-lg border bg-muted animate-pulse" />)}
        </div>
        <div className="h-11 rounded-lg border bg-muted animate-pulse" />
        {[1,2,3].map((i) => (
          <div key={i} className="h-20 rounded-lg border bg-card animate-pulse border-l-4 border-l-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      {analyses.length > 0 && <StatsBar analyses={analyses} />}

      {/* Graph */}
      <BiologieEvolutionSection patientId={patient.id} />

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Statut…" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([v, { label }]) => (
              <SelectItem key={v} value={v}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground flex-1">
          {filtered.length !== analyses.length
            ? `${filtered.length} / ${analyses.length} analyses`
            : `${analyses.length} analyse${analyses.length > 1 ? "s" : ""}`}
        </span>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="medical" size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Prescrire une analyse
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Prescription d&apos;analyse — {patient.prenom} {patient.nom}</DialogTitle>
              </DialogHeader>
              <form onSubmit={createAnalyse} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Type d&apos;analyse *</Label>
                  <Input
                    value={newAnalyse.type_analyse}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setNewAnalyse({ ...newAnalyse, type_analyse: e.target.value })}
                    placeholder="Ex: NFS, Glycémie, HbA1c…"
                    list="analyses-list" required className="h-9"
                  />
                  <datalist id="analyses-list">
                    {COMMON_ANALYSES.map((a) => <option key={a} value={a} />)}
                  </datalist>
                </div>
                <div className="space-y-1.5">
                  <Label>Instructions pour le laboratoire</Label>
                  <Textarea
                    value={newAnalyse.instructions}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNewAnalyse({ ...newAnalyse, instructions: e.target.value })}
                    placeholder="Ex: À jeun depuis 12h, prélèvement sur tube hépariné…"
                    rows={2}
                  />
                </div>
                <label className="flex items-center gap-2.5 cursor-pointer group w-fit">
                  <input
                    type="checkbox"
                    checked={newAnalyse.urgence}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setNewAnalyse({ ...newAnalyse, urgence: e.target.checked })}
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-sm group-hover:text-foreground flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                    Marquer comme urgente
                  </span>
                </label>
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                  <Button type="submit" variant="medical" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Prescrire
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Empty state */}
      {analyses.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <FlaskConical className="h-8 w-8 opacity-40" />
          </div>
          <p className="font-medium">Aucune analyse prescrite</p>
          <p className="text-sm mt-1">Prescrivez la première analyse biologique pour ce patient.</p>
          {canCreate && (
            <Button variant="medical" size="sm" className="mt-4" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Prescrire une analyse
            </Button>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <p className="text-sm">Aucune analyse avec ce statut.</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setFilterStatus("all")}>
            Voir toutes les analyses
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((analyse: AnalysePrescrite) => (
            <AnalyseCard
              key={analyse.id}
              analyse={analyse}
              canSaisirResultat={canSaisirResultat}
              onRefresh={() => { setAnalyses([]); setTabLoading(true); onRefresh(); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
