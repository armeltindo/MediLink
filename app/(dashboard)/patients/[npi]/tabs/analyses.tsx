"use client";
import { useState, useEffect } from "react";
import { Patient, AnalysePrescrite, ResultatAnalyse } from "@/types";
import { supabase } from "@/lib/supabase";
import { formatDate, formatDateTime } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  FlaskConical, Plus, Loader2, ArrowUp, ArrowDown, Minus, AlertTriangle,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const COMMON_ANALYSES = [
  "Numération Formule Sanguine (NFS)",
  "Glycémie à jeun",
  "HbA1c",
  "Créatinine sérique",
  "Bilan lipidique",
  "ALAT / ASAT",
  "CD4 / Charge virale VIH",
  "ECBU",
  "Test de grossesse",
  "Paludisme (TDR / Goutte épaisse)",
  "Groupage sanguin",
  "INR / TP",
  "TSH",
  "CRP / VS",
];

interface AnalysesTabProps {
  patient: Patient;
  analyses: AnalysePrescrite[];
  onRefresh: () => void;
}

function ResultatDisplay({ valeur, valeurMin, valeurMax, unite }: {
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
    <div className={`flex items-center gap-1 font-medium ${isAbnormal ? "text-red-600" : "text-green-700"}`}>
      {isHigh && <ArrowUp className="h-3.5 w-3.5" />}
      {isLow && <ArrowDown className="h-3.5 w-3.5" />}
      {!isAbnormal && <Minus className="h-3.5 w-3.5" />}
      <span>{valeur}</span>
      {unite && <span className="text-xs font-normal ml-0.5">{unite}</span>}
      {isAbnormal && (
        <span className="text-xs">
          ({valeurMin}–{valeurMax})
        </span>
      )}
    </div>
  );
}

export function AnalysesTab({ patient, analyses, onRefresh }: AnalysesTabProps) {
  const [open, setOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState<string | null>(null);
  const [resultats, setResultats] = useState<Record<string, ResultatAnalyse[]>>({});
  const { user } = useUser();
  const canCreate = user?.role === "medecin" || user?.role === "super_admin";
  const canSaisirResultat = user?.role === "laborantin" || user?.role === "super_admin";

  const [newAnalyse, setNewAnalyse] = useState({ type_analyse: "", urgence: false });
  const [newResultat, setNewResultat] = useState({
    parametre: "", valeur: "", valeur_texte: "", unite: "",
    valeur_min: "", valeur_max: "", interpretation: "",
  });
  const [loading, setLoading] = useState(false);

  async function loadResultats(analyseId: string) {
    if (resultats[analyseId]) {
      setResultOpen(resultOpen === analyseId ? null : analyseId);
      return;
    }
    const { data } = await supabase
      .from("resultats_analyse")
      .select("*")
      .eq("analyse_id", analyseId)
      .order("date_resultat");

    setResultats((prev) => ({ ...prev, [analyseId]: data || [] }));
    setResultOpen(analyseId);
  }

  async function createAnalyse(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const { error } = await supabase.from("analyses_prescrites").insert({
        patient_id: patient.id,
        medecin_id: user.id,
        consultation_id: null,
        type_analyse: newAnalyse.type_analyse,
        urgence: newAnalyse.urgence,
        statut: "prescrit",
        date_prescription: new Date().toISOString(),
      });

      if (error) throw error;
      toast({ title: "Analyse prescrite" });
      setOpen(false);
      onRefresh();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function submitResultat(analyseId: string, e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const { error } = await supabase.from("resultats_analyse").insert({
        analyse_id: analyseId,
        patient_id: patient.id,
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

      // Update analyse status
      await supabase.from("analyses_prescrites").update({ statut: "rendu" }).eq("id", analyseId);

      if (error) throw error;
      toast({ title: "Résultat enregistré" });
      setResultOpen(null);
      setResultats({});
      onRefresh();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    } finally {
      setLoading(false);
    }
  }

  const statusConfig: Record<string, { label: string; variant: any }> = {
    prescrit: { label: "Prescrit", variant: "info" },
    en_attente: { label: "En attente", variant: "warning" },
    en_cours: { label: "En cours", variant: "warning" },
    rendu: { label: "Rendu", variant: "success" },
    annule: { label: "Annulé", variant: "danger" },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Analyses biologiques ({analyses.length})</h3>
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
                <DialogTitle>Prescription d'analyse — {patient.prenom} {patient.nom}</DialogTitle>
              </DialogHeader>
              <form onSubmit={createAnalyse} className="space-y-4">
                <div className="space-y-2">
                  <Label>Type d'analyse *</Label>
                  <Input
                    value={newAnalyse.type_analyse}
                    onChange={(e) => setNewAnalyse({ ...newAnalyse, type_analyse: e.target.value })}
                    placeholder="Ex: NFS, Glycémie, HbA1c..."
                    list="analyses-list"
                    required
                  />
                  <datalist id="analyses-list">
                    {COMMON_ANALYSES.map((a) => <option key={a} value={a} />)}
                  </datalist>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="urgence"
                    checked={newAnalyse.urgence}
                    onChange={(e) => setNewAnalyse({ ...newAnalyse, urgence: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="urgence" className="text-sm cursor-pointer">
                    Urgence — résultat immédiat requis
                  </Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                  <Button type="submit" variant="medical" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Prescrire
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {analyses.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FlaskConical className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Aucune analyse prescrite</p>
        </div>
      ) : (
        <div className="space-y-3">
          {analyses.map((analyse) => {
            const status = statusConfig[analyse.statut];
            const isOpen = resultOpen === analyse.id;
            const results = resultats[analyse.id] || [];

            return (
              <Card key={analyse.id} className="overflow-hidden">
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30"
                  onClick={() => loadResultats(analyse.id)}
                >
                  <FlaskConical className="h-5 w-5 text-medical-blue flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{analyse.type_analyse}</span>
                      <Badge variant={status.variant}>{status.label}</Badge>
                      {analyse.urgence && <Badge variant="danger">URGENT</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Prescrit le {formatDate(analyse.date_prescription)}
                    </p>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t p-4 space-y-4">
                    {/* Existing results */}
                    {results.length > 0 && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Paramètre</TableHead>
                            <TableHead>Résultat</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Interprétation</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {results.map((r) => (
                            <TableRow key={r.id}>
                              <TableCell className="font-medium">{r.parametre}</TableCell>
                              <TableCell>
                                <ResultatDisplay
                                  valeur={r.valeur}
                                  valeurMin={r.valeur_min}
                                  valeurMax={r.valeur_max}
                                  unite={r.unite}
                                />
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {formatDateTime(r.date_resultat)}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">{r.interpretation}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}

                    {/* Saisir résultat — laborantin */}
                    {canSaisirResultat && analyse.statut !== "rendu" && (
                      <form onSubmit={(e) => submitResultat(analyse.id, e)} className="space-y-3 border-t pt-4">
                        <p className="text-sm font-medium">Saisir le résultat</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Paramètre *</Label>
                            <Input
                              value={newResultat.parametre}
                              onChange={(e) => setNewResultat({ ...newResultat, parametre: e.target.value })}
                              placeholder="Ex: Glycémie à jeun" size={1} required
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Valeur numérique</Label>
                            <Input
                              type="number"
                              step="any"
                              value={newResultat.valeur}
                              onChange={(e) => setNewResultat({ ...newResultat, valeur: e.target.value })}
                              placeholder="Ex: 7.2"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Unité</Label>
                            <Input
                              value={newResultat.unite}
                              onChange={(e) => setNewResultat({ ...newResultat, unite: e.target.value })}
                              placeholder="mmol/L, g/dL..."
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Valeur texte (si applicable)</Label>
                            <Input
                              value={newResultat.valeur_texte}
                              onChange={(e) => setNewResultat({ ...newResultat, valeur_texte: e.target.value })}
                              placeholder="Négatif, Positif..."
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Norme min</Label>
                            <Input
                              type="number" step="any"
                              value={newResultat.valeur_min}
                              onChange={(e) => setNewResultat({ ...newResultat, valeur_min: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Norme max</Label>
                            <Input
                              type="number" step="any"
                              value={newResultat.valeur_max}
                              onChange={(e) => setNewResultat({ ...newResultat, valeur_max: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Interprétation</Label>
                          <Input
                            value={newResultat.interpretation}
                            onChange={(e) => setNewResultat({ ...newResultat, interpretation: e.target.value })}
                            placeholder="Normal, Élevé, Pathologique..."
                          />
                        </div>
                        <Button type="submit" size="sm" variant="medical" disabled={loading}>
                          {loading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                          Enregistrer le résultat
                        </Button>
                      </form>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
