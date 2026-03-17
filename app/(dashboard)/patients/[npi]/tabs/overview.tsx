"use client";
import { useState } from "react";
import { Patient, Allergie, Antecedent, AntecedentFamilial, HabitudesVie, Consultation, Prescription } from "@/types";
import { formatDate, getSeverityColor } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle, CheckCircle, Clock, Heart, Stethoscope,
  Pill, Activity, Loader2, Sparkles, Plus, Cigarette,
  Wine, TreePalm, Utensils, User2,
} from "lucide-react";

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

export function OverviewTab({
  patient, allergies, antecedents, antecedentsFamiliaux,
  habitudes, consultations, prescriptions, onRefresh,
}: OverviewTabProps) {
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const activeAntecedents = antecedents.filter((a) => a.actif);
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
      {/* Left column: antecedents + allergies */}
      <div className="lg:col-span-2 space-y-4">
        {/* AI Summary */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-medical-blue" />
                Résumé clinique IA
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={generateAISummary}
                disabled={aiLoading}
              >
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
                Cliquez sur "Générer résumé" pour obtenir une synthèse clinique automatique basée sur les données du dossier.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Antécédents médicaux */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-medical-green" />
              Antécédents médicaux personnels
            </CardTitle>
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
                          <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                            {ant.cim10_code}
                          </span>
                        )}
                        <Badge variant={ant.actif ? "danger" : "success"} className="text-xs">
                          {ant.actif ? "Actif" : "Résolu"}
                        </Badge>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {ant.categorie}
                        </Badge>
                      </div>
                      {ant.date_debut && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Depuis le {formatDate(ant.date_debut)}
                          {ant.date_fin ? ` → ${formatDate(ant.date_fin)}` : ""}
                        </p>
                      )}
                      {ant.notes && (
                        <p className="text-xs text-muted-foreground mt-0.5 italic">{ant.notes}</p>
                      )}
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
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Allergies et intolérances
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allergies.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune allergie connue enregistrée</p>
            ) : (
              <div className="space-y-2">
                {allergies.filter((a) => a.actif).map((allergie) => (
                  <div
                    key={allergie.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${getSeverityColor(allergie.severite)}`}
                  >
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{allergie.substance}</span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {allergie.type}
                        </Badge>
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
        {antecedentsFamiliaux.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User2 className="h-4 w-4 text-purple-500" />
                Antécédents familiaux
              </CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right column: habitudes + prescriptions actives + dernière consultation */}
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
                  <p className="text-xs text-muted-foreground text-center">
                    +{activePrescriptions.length - 6} autres traitements
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Habitudes de vie */}
        {habitudes && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-teal-500" />
                Habitudes de vie
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
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
              <div className="flex gap-3 pt-1">
                <span className={`text-xs ${habitudes.eau_potable ? "text-green-600" : "text-red-500"}`}>
                  💧 {habitudes.eau_potable ? "Eau potable" : "Eau non potable"}
                </span>
                <span className={`text-xs ${habitudes.electricite ? "text-green-600" : "text-red-500"}`}>
                  ⚡ {habitudes.electricite ? "Électricité" : "Pas d'électricité"}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

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
            <CardTitle className="text-sm">Informations administratives</CardTitle>
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
            {patient.nombre_enfants !== null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Enfants</span>
                <span className="font-medium">{patient.nombre_enfants}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dossier créé</span>
              <span className="font-medium">{formatDate(patient.created_at)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
