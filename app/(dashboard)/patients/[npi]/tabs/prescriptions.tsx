"use client";
import { useState } from "react";
import { Patient, Prescription, Allergie } from "@/types";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, Plus, Loader2, Pill, Clock, CheckCircle } from "lucide-react";

// Interactions médicamenteuses — base locale simplifiée
const DRUG_INTERACTIONS: Record<string, { drug: string; severity: "danger" | "warning"; message: string }[]> = {
  warfarine: [
    { drug: "aspirine", severity: "danger", message: "Risque hémorragique majeur avec Warfarine" },
    { drug: "ibuprofène", severity: "danger", message: "AINS potentialise l'effet anticoagulant" },
  ],
  metformine: [
    { drug: "alcool", severity: "warning", message: "Risque d'acidose lactique" },
    { drug: "produit de contraste iodé", severity: "warning", message: "Suspendre 48h avant injection" },
  ],
  rifampicine: [
    { drug: "contraceptif oral", severity: "danger", message: "Rifampicine réduit l'efficacité des contraceptifs oraux" },
    { drug: "warfarine", severity: "danger", message: "Inducteur enzymatique — diminue l'effet anticoagulant" },
  ],
};

function checkInteractions(newDrug: string, existingDrugs: string[]): Array<{ drug: string; severity: "danger" | "warning"; message: string }> {
  const alerts: Array<{ drug: string; severity: "danger" | "warning"; message: string }> = [];
  const drugLower = newDrug.toLowerCase();

  for (const [drug, interactions] of Object.entries(DRUG_INTERACTIONS)) {
    if (drugLower.includes(drug)) {
      for (const interaction of interactions) {
        if (existingDrugs.some((d) => d.toLowerCase().includes(interaction.drug))) {
          alerts.push(interaction);
        }
      }
    }
  }
  return alerts;
}

function checkAllergyConflict(newDrug: string, allergies: Allergie[]): Allergie | null {
  const drugLower = newDrug.toLowerCase();
  return allergies.find((a) => {
    const substanceLower = a.substance.toLowerCase();
    return drugLower.includes(substanceLower) || substanceLower.includes(drugLower.split(" ")[0]);
  }) || null;
}

const statusConfig: Record<string, { label: string; variant: "default" | "success" | "warning" | "danger" | "info" | "secondary" }> = {
  prescrit: { label: "Prescrit", variant: "info" },
  dispense: { label: "Dispensé", variant: "success" },
  en_cours: { label: "En cours", variant: "success" },
  termine: { label: "Terminé", variant: "secondary" },
  annule: { label: "Annulé", variant: "danger" },
};

interface PrescriptionsTabProps {
  patient: Patient;
  prescriptions: Prescription[];
  allergies: Allergie[];
  onRefresh: () => void;
}

function NewPrescriptionDialog({ patient, prescriptions, allergies, onSuccess, onClose }: {
  patient: Patient;
  prescriptions: Prescription[];
  allergies: Allergie[];
  onSuccess: () => void;
  onClose: () => void;
}) {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [interactions, setInteractions] = useState<Array<{ drug: string; severity: "danger" | "warning"; message: string }>>([]);
  const [allergyConflict, setAllergyConflict] = useState<Allergie | null>(null);
  const [form, setForm] = useState({
    medicament_dci: "", medicament_commercial: "", dosage: "",
    forme: "", posologie: "", duree: "", instructions: "", date_expiration: "",
  });

  function handleDrugChange(value: string) {
    setForm({ ...form, medicament_dci: value });
    if (value.length > 2) {
      const existingDrugs = prescriptions
        .filter((p) => p.statut === "en_cours" || p.statut === "prescrit")
        .map((p) => p.medicament_dci);
      setInteractions(checkInteractions(value, existingDrugs));
      setAllergyConflict(checkAllergyConflict(value, allergies));
    } else {
      setInteractions([]);
      setAllergyConflict(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (allergyConflict) {
      toast({ variant: "destructive", title: "ALERTE ALLERGIE", description: `Le patient est allergique à ${allergyConflict.substance}. Prescription bloquée.` });
      return;
    }
    setLoading(true);

    try {
      const { error } = await supabase.from("prescriptions").insert({
        patient_id: patient.id,
        medecin_id: user.id,
        consultation_id: null,
        ...form,
        date_prescription: new Date().toISOString(),
        statut: "prescrit",
        date_expiration: form.date_expiration || null,
      });

      if (error) throw error;
      toast({ title: "Prescription enregistrée", description: `${form.medicament_dci} ${form.dosage}` });
      onSuccess();
      onClose();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Erreur";
      toast({ variant: "destructive", title: "Erreur", description: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Allergie alert — BLOQUANT */}
      {allergyConflict && (
        <div className="bg-red-50 border-2 border-red-500 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-700">ALLERGIE CONNUE — PRESCRIPTION BLOQUÉE</p>
            <p className="text-xs text-red-600 mt-0.5">
              Le patient est allergique à <strong>{allergyConflict.substance}</strong> ({allergyConflict.severite}) : {allergyConflict.reaction}
            </p>
          </div>
        </div>
      )}

      {/* Interactions warning */}
      {interactions.map((interaction, i) => (
        <div key={i} className={`rounded-lg p-3 flex items-start gap-2 ${interaction.severity === "danger" ? "bg-red-50 border border-red-200" : "bg-yellow-50 border border-yellow-200"}`}>
          <AlertTriangle className={`h-4 w-4 flex-shrink-0 mt-0.5 ${interaction.severity === "danger" ? "text-red-600" : "text-yellow-600"}`} />
          <p className="text-xs">{interaction.message}</p>
        </div>
      ))}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Médicament DCI *</Label>
          <Input
            value={form.medicament_dci}
            onChange={(e) => handleDrugChange(e.target.value)}
            placeholder="Ex: Metformine, Amlodipine..."
            required
          />
        </div>
        <div className="space-y-1">
          <Label>Nom commercial</Label>
          <Input
            value={form.medicament_commercial}
            onChange={(e) => setForm({ ...form, medicament_commercial: e.target.value })}
            placeholder="Ex: Glucophage, Amlor..."
          />
        </div>
        <div className="space-y-1">
          <Label>Dosage *</Label>
          <Input value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} placeholder="Ex: 500mg" required />
        </div>
        <div className="space-y-1">
          <Label>Forme galénique</Label>
          <Select onValueChange={(v) => setForm({ ...form, forme: v })}>
            <SelectTrigger><SelectValue placeholder="Forme..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="comprimé">Comprimé</SelectItem>
              <SelectItem value="gélule">Gélule</SelectItem>
              <SelectItem value="sirop">Sirop</SelectItem>
              <SelectItem value="injectable">Injectable</SelectItem>
              <SelectItem value="pommade">Pommade</SelectItem>
              <SelectItem value="gouttes">Gouttes</SelectItem>
              <SelectItem value="patch">Patch</SelectItem>
              <SelectItem value="spray">Spray</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Posologie *</Label>
          <Input value={form.posologie} onChange={(e) => setForm({ ...form, posologie: e.target.value })} placeholder="Ex: 1 cp matin et soir" required />
        </div>
        <div className="space-y-1">
          <Label>Durée *</Label>
          <Input value={form.duree} onChange={(e) => setForm({ ...form, duree: e.target.value })} placeholder="Ex: 30 jours" required />
        </div>
        <div className="space-y-1">
          <Label>Date d&apos;expiration</Label>
          <Input type="date" value={form.date_expiration} onChange={(e) => setForm({ ...form, date_expiration: e.target.value })} />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Instructions particulières</Label>
        <Textarea
          value={form.instructions}
          onChange={(e) => setForm({ ...form, instructions: e.target.value })}
          rows={2}
          placeholder="Ex: À prendre pendant les repas, éviter le soleil..."
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
        <Button type="submit" variant="medical" disabled={loading || !!allergyConflict}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Prescrire
        </Button>
      </div>
    </form>
  );
}

export function PrescriptionsTab({ patient, prescriptions, allergies, onRefresh }: PrescriptionsTabProps) {
  const [open, setOpen] = useState(false);
  const { user } = useUser();
  const canCreate = user?.role === "medecin" || user?.role === "super_admin";
  const canDispense = user?.role === "pharmacien" || user?.role === "super_admin";

  async function handleDispense(prescriptionId: string) {
    if (!user) return;
    const { error } = await supabase.from("prescriptions")
      .update({ statut: "dispense", dispense_par: user.id, date_dispensation: new Date().toISOString() })
      .eq("id", prescriptionId);

    if (!error) {
      toast({ title: "Médicament dispensé" });
      onRefresh();
    }
  }

  const activePrescriptions = prescriptions.filter((p) => ["prescrit", "dispense", "en_cours"].includes(p.statut));
  const historique = prescriptions.filter((p) => ["termine", "annule"].includes(p.statut));

  const expiringPrescriptions = activePrescriptions.filter((p) => {
    if (!p.date_expiration) return false;
    const exp = new Date(p.date_expiration);
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    return exp <= sevenDaysFromNow && exp >= new Date();
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Prescriptions ({prescriptions.length})</h3>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="medical" size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Nouvelle prescription
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Prescription — {patient.prenom} {patient.nom}</DialogTitle>
              </DialogHeader>
              <NewPrescriptionDialog
                patient={patient}
                prescriptions={prescriptions}
                allergies={allergies}
                onSuccess={onRefresh}
                onClose={() => setOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Expiration warnings */}
      {expiringPrescriptions.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <p className="text-sm font-medium text-orange-800 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {expiringPrescriptions.length} ordonnance{expiringPrescriptions.length > 1 ? "s" : ""} expire{expiringPrescriptions.length > 1 ? "nt" : ""} dans 7 jours
          </p>
          {expiringPrescriptions.map((p) => (
            <p key={p.id} className="text-xs text-orange-700 mt-1">
              • {p.medicament_dci} {p.dosage} — expire le {formatDate(p.date_expiration)}
            </p>
          ))}
        </div>
      )}

      {/* Active prescriptions */}
      {activePrescriptions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Pill className="h-4 w-4 text-medical-orange" />
              Traitements actifs ({activePrescriptions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activePrescriptions.map((p) => {
                const status = statusConfig[p.statut];
                return (
                  <div key={p.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{p.medicament_dci}</span>
                        {p.medicament_commercial && (
                          <span className="text-xs text-muted-foreground">({p.medicament_commercial})</span>
                        )}
                        <span className="text-sm font-medium text-medical-green">{p.dosage}</span>
                        {p.forme && <Badge variant="outline" className="text-xs">{p.forme}</Badge>}
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{p.posologie} — {p.duree}</p>
                      {p.instructions && <p className="text-xs text-muted-foreground mt-0.5 italic">{p.instructions}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        Prescrit le {formatDate(p.date_prescription)}
                        {p.date_expiration && ` — Expire le ${formatDate(p.date_expiration)}`}
                      </p>
                    </div>
                    {canDispense && p.statut === "prescrit" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDispense(p.id)}
                        className="shrink-0 border-medical-green text-medical-green hover:bg-medical-green-light"
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                        Dispenser
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historique */}
      {historique.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-muted-foreground">Historique ({historique.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {historique.map((p) => {
                const status = statusConfig[p.statut];
                return (
                  <div key={p.id} className="flex items-start gap-3 p-3 opacity-60">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{p.medicament_dci} {p.dosage}</span>
                        <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{p.posologie} — {p.duree}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {prescriptions.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Pill className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Aucune prescription enregistrée</p>
        </div>
      )}
    </div>
  );
}
