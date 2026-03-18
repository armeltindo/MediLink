"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";
import { formatDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FlaskConical,
  Search,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Minus,
  Loader2,
  ClipboardList,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnalyseRow {
  id: string;
  patient_id: string;
  medecin_id: string;
  type_analyse: string;
  urgence: boolean;
  statut: "prescrit" | "en_attente" | "en_cours" | "rendu" | "annule";
  instructions: string | null;
  date_prescription: string;
  patients: {
    npi: string;
    nom: string;
    prenom: string;
  };
  resultats_analyse: ResultatRow[];
}

interface ResultatRow {
  id: string;
  analyse_id: string;
  parametre: string;
  valeur: number | null;
  valeur_texte: string | null;
  unite: string | null;
  valeur_min: number | null;
  valeur_max: number | null;
  interpretation: string | null;
  date_resultat: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type TabFilter = "toutes" | "en_attente" | "rendues" | "urgentes";

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "info" | "warning" | "success" | "danger" | "default" }
> = {
  prescrit: { label: "Prescrit", variant: "info" },
  en_attente: { label: "En attente", variant: "warning" },
  en_cours: { label: "En cours", variant: "warning" },
  rendu: { label: "Rendu", variant: "success" },
  annule: { label: "Annulé", variant: "default" },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ResultatDisplay({
  valeur,
  valeurMin,
  valeurMax,
  unite,
}: {
  valeur: number | null;
  valeurMin: number | null;
  valeurMax: number | null;
  unite: string | null;
}) {
  if (valeur === null) return <span className="text-muted-foreground">—</span>;

  const isLow = valeurMin !== null && valeur < valeurMin;
  const isHigh = valeurMax !== null && valeur > valeurMax;
  const isAbnormal = isLow || isHigh;

  return (
    <div
      className={`flex items-center gap-1 font-medium ${
        isAbnormal ? "text-red-600" : "text-green-700"
      }`}
    >
      {isHigh && <ArrowUp className="h-3.5 w-3.5" />}
      {isLow && <ArrowDown className="h-3.5 w-3.5" />}
      {!isAbnormal && <Minus className="h-3.5 w-3.5" />}
      <span>{valeur}</span>
      {unite && <span className="text-xs font-normal ml-0.5">{unite}</span>}
      {isAbnormal && valeurMin !== null && valeurMax !== null && (
        <span className="text-xs text-muted-foreground ml-1">
          ({valeurMin}–{valeurMax})
        </span>
      )}
    </div>
  );
}

function RowSkeleton() {
  return (
    <TableRow>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableCell key={i}>
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  );
}

// ---------------------------------------------------------------------------
// "Saisir résultat" dialog
// ---------------------------------------------------------------------------

interface SaisirResultatDialogProps {
  analyse: AnalyseRow;
  onSuccess: () => void;
}

function SaisirResultatDialog({ analyse, onSuccess }: SaisirResultatDialogProps) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    parametre: "",
    valeur: "",
    valeur_texte: "",
    unite: "",
    valeur_min: "",
    valeur_max: "",
    interpretation: "",
  });

  // Auto-detect abnormal when both bounds and value are filled
  const valeurNum = form.valeur !== "" ? parseFloat(form.valeur) : null;
  const minNum = form.valeur_min !== "" ? parseFloat(form.valeur_min) : null;
  const maxNum = form.valeur_max !== "" ? parseFloat(form.valeur_max) : null;
  const isAbnormal =
    valeurNum !== null &&
    ((minNum !== null && valeurNum < minNum) ||
      (maxNum !== null && valeurNum > maxNum));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const { error: insertError } = await supabase
        .from("resultats_analyse")
        .insert({
          analyse_id: analyse.id,
          patient_id: analyse.patient_id,
          laborantin_id: user.id,
          parametre: form.parametre,
          valeur: valeurNum,
          valeur_texte: form.valeur_texte || null,
          unite: form.unite || null,
          valeur_min: minNum,
          valeur_max: maxNum,
          interpretation: form.interpretation || null,
          date_resultat: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from("analyses_prescrites")
        .update({ statut: "rendu" })
        .eq("id", analyse.id);

      if (updateError) throw updateError;

      toast({
        title: "Résultat enregistré",
        description: `${analyse.type_analyse} — ${form.parametre}`,
      });
      setOpen(false);
      setForm({
        parametre: "",
        valeur: "",
        valeur_texte: "",
        unite: "",
        valeur_min: "",
        valeur_max: "",
        interpretation: "",
      });
      onSuccess();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erreur lors de l'enregistrement",
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="medical" size="sm">
          <FlaskConical className="h-3.5 w-3.5 mr-1.5" />
          Saisir résultat
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Saisir le résultat — {analyse.type_analyse}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Patient :{" "}
            <span className="font-medium">
              {analyse.patients.nom} {analyse.patients.prenom}
            </span>{" "}
            <span className="font-mono text-xs">({analyse.patients.npi})</span>
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="parametre">Paramètre *</Label>
            <Input
              id="parametre"
              value={form.parametre}
              onChange={(e) => setForm({ ...form, parametre: e.target.value })}
              placeholder="Ex: Glycémie à jeun, NFS — Hémoglobine…"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="valeur">Valeur numérique</Label>
              <Input
                id="valeur"
                type="number"
                step="any"
                value={form.valeur}
                onChange={(e) => setForm({ ...form, valeur: e.target.value })}
                placeholder="Ex: 7.2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unite">Unité</Label>
              <Input
                id="unite"
                value={form.unite}
                onChange={(e) => setForm({ ...form, unite: e.target.value })}
                placeholder="mmol/L, g/dL, UI/L…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valeur_min">Norme min</Label>
              <Input
                id="valeur_min"
                type="number"
                step="any"
                value={form.valeur_min}
                onChange={(e) => setForm({ ...form, valeur_min: e.target.value })}
                placeholder="Ex: 3.9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valeur_max">Norme max</Label>
              <Input
                id="valeur_max"
                type="number"
                step="any"
                value={form.valeur_max}
                onChange={(e) => setForm({ ...form, valeur_max: e.target.value })}
                placeholder="Ex: 6.1"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="valeur_texte">Valeur texte (si applicable)</Label>
              <Input
                id="valeur_texte"
                value={form.valeur_texte}
                onChange={(e) => setForm({ ...form, valeur_texte: e.target.value })}
                placeholder="Négatif, Positif, Limite…"
              />
            </div>
          </div>

          {isAbnormal && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                Valeur <strong>anormale</strong> détectée — hors des normes
                saisies.
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="interpretation">Interprétation / Commentaire</Label>
            <Textarea
              id="interpretation"
              value={form.interpretation}
              onChange={(e) => setForm({ ...form, interpretation: e.target.value })}
              placeholder="Normal, Élevé, Pathologique, À surveiller…"
              rows={3}
            />
          </div>

          <Separator />

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" variant="medical" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer le résultat
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Results summary (read-only, for médecin / admin)
// ---------------------------------------------------------------------------

function ResultsSummary({ resultats }: { resultats: ResultatRow[] }) {
  if (resultats.length === 0) {
    return (
      <span className="text-xs text-muted-foreground italic">
        Aucun résultat
      </span>
    );
  }

  const hasAbnormal = resultats.some((r) => {
    if (r.valeur === null) return false;
    return (
      (r.valeur_min !== null && r.valeur < r.valeur_min) ||
      (r.valeur_max !== null && r.valeur > r.valeur_max)
    );
  });

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">
        {resultats.length} paramètre{resultats.length > 1 ? "s" : ""}
      </span>
      {hasAbnormal && (
        <Badge variant="danger" className="text-xs px-1.5 py-0">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Anomalie
        </Badge>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AnalysesPage() {
  const { user, loading: userLoading } = useUser();
  const [analyses, setAnalyses] = useState<AnalyseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabFilter>("toutes");

  const isLaborantin = user?.role === "laborantin";
  const isMedecin = user?.role === "medecin";
  const isAdmin =
    user?.role === "super_admin" || user?.role === "admin_etablissement";
  const canSaisir = isLaborantin || isAdmin;

  const fetchAnalyses = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let req = supabase
      .from("analyses_prescrites")
      .select(
        "*, patients!inner(npi, nom, prenom), resultats_analyse(*)"
      )
      .is("deleted_at", null)
      .order("date_prescription", { ascending: false })
      .limit(100);

    // Médecin only sees their own prescriptions
    if (isMedecin) {
      req = req.eq("medecin_id", user.id);
    }

    const { data, error } = await req;

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur de chargement",
        description: error.message,
      });
    } else {
      setAnalyses((data as unknown as AnalyseRow[]) || []);
    }

    setLoading(false);
  }, [user, isMedecin]);

  useEffect(() => {
    if (user) fetchAnalyses();
  }, [user, fetchAnalyses]);

  // -------------------------------------------------------------------------
  // Filtering
  // -------------------------------------------------------------------------

  const filtered = analyses.filter((a) => {
    // Tab filter
    if (activeTab === "en_attente") {
      if (a.statut !== "prescrit" && a.statut !== "en_attente") return false;
    } else if (activeTab === "rendues") {
      if (a.statut !== "rendu") return false;
    } else if (activeTab === "urgentes") {
      if (!a.urgence) return false;
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const patientMatch =
        a.patients.npi.toLowerCase().includes(q) ||
        a.patients.nom.toLowerCase().includes(q) ||
        a.patients.prenom.toLowerCase().includes(q);
      const typeMatch = a.type_analyse.toLowerCase().includes(q);
      if (!patientMatch && !typeMatch) return false;
    }

    return true;
  });

  // For laborantin: sort so pending/in-progress come first
  const displayList = isLaborantin
    ? [
        ...filtered.filter(
          (a) => a.statut === "en_attente" || a.statut === "en_cours"
        ),
        ...filtered.filter(
          (a) => a.statut !== "en_attente" && a.statut !== "en_cours"
        ),
      ]
    : filtered;

  // -------------------------------------------------------------------------
  // Tab counts
  // -------------------------------------------------------------------------

  const counts = {
    toutes: analyses.length,
    en_attente: analyses.filter(
      (a) => a.statut === "prescrit" || a.statut === "en_attente"
    ).length,
    rendues: analyses.filter((a) => a.statut === "rendu").length,
    urgentes: analyses.filter((a) => a.urgence).length,
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const tabs: { key: TabFilter; label: string }[] = [
    { key: "toutes", label: "Toutes" },
    { key: "en_attente", label: "En attente" },
    { key: "rendues", label: "Rendues" },
    { key: "urgentes", label: "Urgentes" },
  ];

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Analyses & Biologie" />

      <div className="p-6 space-y-5 flex-1">
        {/* Search + tabs toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="NPI, nom du patient ou type d'analyse…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Tab buttons */}
          <div className="flex items-center gap-1 flex-wrap">
            {tabs.map((tab) => (
              <Button
                key={tab.key}
                variant={activeTab === tab.key ? "medical" : "outline"}
                size="sm"
                onClick={() => setActiveTab(tab.key)}
                className="gap-1.5"
              >
                {tab.label}
                {counts[tab.key] > 0 && (
                  <span
                    className={`text-xs rounded-full px-1.5 py-0 font-medium ${
                      activeTab === tab.key
                        ? "bg-white/20 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {counts[tab.key]}
                  </span>
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* Result count */}
        {!loading && (
          <p className="text-sm text-muted-foreground">
            {displayList.length} analyse{displayList.length !== 1 ? "s" : ""}{" "}
            affichée{displayList.length !== 1 ? "s" : ""}
          </p>
        )}

        {/* Table */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Type d'analyse</TableHead>
                <TableHead>Date prescription</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Résultats</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <RowSkeleton key={i} />
                ))
              ) : displayList.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-16 text-muted-foreground"
                  >
                    <FlaskConical className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Aucune analyse trouvée</p>
                    <p className="text-sm mt-1">
                      {search
                        ? "Aucun résultat pour cette recherche."
                        : "Les analyses prescrites apparaîtront ici."}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                displayList.map((analyse) => {
                  const statusCfg =
                    STATUS_CONFIG[analyse.statut] ?? STATUS_CONFIG.prescrit;
                  const showSaisir =
                    canSaisir && analyse.statut !== "rendu" && analyse.statut !== "annule";

                  return (
                    <TableRow
                      key={analyse.id}
                      className={analyse.urgence ? "bg-red-50/40 hover:bg-red-50/70" : undefined}
                    >
                      {/* Patient */}
                      <TableCell>
                        <div className="flex flex-col">
                          <Link
                            href={`/patients/${analyse.patients.npi}`}
                            className="font-semibold text-foreground hover:text-medical-green transition-colors"
                          >
                            {analyse.patients.nom} {analyse.patients.prenom}
                          </Link>
                          <span className="text-xs font-mono text-muted-foreground">
                            {analyse.patients.npi}
                          </span>
                        </div>
                      </TableCell>

                      {/* Type */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FlaskConical className="h-4 w-4 text-medical-blue shrink-0" />
                          <span className="font-medium text-sm">
                            {analyse.type_analyse}
                          </span>
                          {analyse.urgence && (
                            <Badge variant="danger" className="text-xs">
                              URGENT
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Date */}
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(analyse.date_prescription)}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge variant={statusCfg.variant}>
                          {statusCfg.label}
                        </Badge>
                      </TableCell>

                      {/* Results summary */}
                      <TableCell>
                        <ResultsSummary
                          resultats={analyse.resultats_analyse}
                        />
                      </TableCell>

                      {/* Action */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {showSaisir ? (
                            <SaisirResultatDialog
                              analyse={analyse}
                              onSuccess={fetchAnalyses}
                            />
                          ) : (
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/patients/${analyse.patients.npi}`}>
                                <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
                                Dossier
                              </Link>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
