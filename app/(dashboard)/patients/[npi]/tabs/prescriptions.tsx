"use client";
import { useState, useEffect, useCallback } from "react";
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
import { AlertTriangle, Plus, Loader2, Pill, Clock, CheckCircle, Info, ChevronDown, ChevronUp } from "lucide-react";

// ─── Base d'interactions médicamenteuses élargie ───────────────────────────
// Couvre les médicaments les plus fréquents en Afrique sub-saharienne
const DRUG_INTERACTIONS: Record<string, { drug: string; severity: "danger" | "warning"; message: string }[]> = {
  // Anticoagulants
  warfarine: [
    { drug: "aspirine", severity: "danger", message: "Warfarine + Aspirine : risque hémorragique majeur" },
    { drug: "ibuprofène", severity: "danger", message: "Warfarine + AINS : potentialisation de l'effet anticoagulant" },
    { drug: "rifampicine", severity: "danger", message: "Warfarine + Rifampicine : inducteur — diminue l'effet anticoagulant" },
    { drug: "metronidazole", severity: "danger", message: "Warfarine + Métronidazole : augmentation de l'INR" },
    { drug: "cotrimoxazole", severity: "warning", message: "Warfarine + Cotrimoxazole : augmentation possible de l'effet anticoagulant" },
    { drug: "fluconazole", severity: "danger", message: "Warfarine + Fluconazole : forte augmentation de l'INR" },
  ],
  // Antidiabétiques
  metformine: [
    { drug: "alcool", severity: "warning", message: "Metformine + Alcool : risque d'acidose lactique" },
    { drug: "produit de contraste iodé", severity: "warning", message: "Metformine + PCI : suspendre 48h avant injection" },
    { drug: "glucocorticoïde", severity: "warning", message: "Metformine + Corticoïde : risque d'hyperglycémie" },
    { drug: "prednisolone", severity: "warning", message: "Metformine + Prednisolone : risque d'hyperglycémie" },
    { drug: "dexamethasone", severity: "warning", message: "Metformine + Dexaméthasone : risque d'hyperglycémie" },
  ],
  glibenclamide: [
    { drug: "fluconazole", severity: "danger", message: "Glibenclamide + Fluconazole : risque d'hypoglycémie sévère" },
    { drug: "cotrimoxazole", severity: "warning", message: "Glibenclamide + Cotrimoxazole : potentialisation hypoglycémique" },
  ],
  // Antituberculeux / Antiparasitaires
  rifampicine: [
    { drug: "contraceptif oral", severity: "danger", message: "Rifampicine + Contraceptif oral : inducteur enzymatique — efficacité réduite" },
    { drug: "warfarine", severity: "danger", message: "Rifampicine + Warfarine : inducteur enzymatique" },
    { drug: "atazanavir", severity: "danger", message: "Rifampicine + Atazanavir : contre-indication absolue" },
    { drug: "lopinavir", severity: "danger", message: "Rifampicine + Lopinavir : réduction majeure des concentrations" },
    { drug: "prednisolone", severity: "warning", message: "Rifampicine + Prednisolone : inducteur — diminue l'effet du corticoïde" },
    { drug: "ciclosporine", severity: "danger", message: "Rifampicine + Ciclosporine : réduction des taux de ciclosporine" },
    { drug: "digoxine", severity: "warning", message: "Rifampicine + Digoxine : inducteur — diminue l'efficacité de la digoxine" },
  ],
  // Antipaludéens
  artemether: [
    { drug: "halofantrine", severity: "danger", message: "Artéméther + Halofantrine : risque d'allongement du QT" },
    { drug: "quinine", severity: "danger", message: "Artéméther + Quinine : risque d'allongement du QT" },
  ],
  quinine: [
    { drug: "artemether", severity: "danger", message: "Quinine + Artéméther : risque d'allongement du QT" },
    { drug: "digoxine", severity: "warning", message: "Quinine + Digoxine : augmentation des concentrations de digoxine" },
    { drug: "mefloquine", severity: "warning", message: "Quinine + Méfloquine : risque de convulsions" },
  ],
  // Antirétroviraux
  efavirenz: [
    { drug: "rifampicine", severity: "warning", message: "Efavirenz + Rifampicine : ajustement de dose nécessaire" },
    { drug: "contraceptif oral", severity: "warning", message: "Efavirenz + Contraceptif : efficacité contraceptive réduite" },
    { drug: "fluconazole", severity: "warning", message: "Efavirenz + Fluconazole : augmentation possible de la toxicité" },
  ],
  // Cardiologie
  digoxine: [
    { drug: "amiodarone", severity: "danger", message: "Digoxine + Amiodarone : augmentation de la digoxinémie — risque toxicité" },
    { drug: "quinine", severity: "warning", message: "Digoxine + Quinine : augmentation de la digoxinémie" },
    { drug: "rifampicine", severity: "warning", message: "Digoxine + Rifampicine : réduction des concentrations de digoxine" },
    { drug: "furosémide", severity: "warning", message: "Digoxine + Furosémide : hypokaliémie — augmente la toxicité" },
  ],
  amiodarone: [
    { drug: "digoxine", severity: "danger", message: "Amiodarone + Digoxine : augmentation de la digoxinémie" },
    { drug: "warfarine", severity: "danger", message: "Amiodarone + Warfarine : augmentation de l'INR" },
  ],
  // Antibiotiques
  cotrimoxazole: [
    { drug: "methotrexate", severity: "danger", message: "Cotrimoxazole + Méthotrexate : toxicité hématologique sévère" },
    { drug: "warfarine", severity: "warning", message: "Cotrimoxazole + Warfarine : augmentation de l'INR" },
    { drug: "glibenclamide", severity: "warning", message: "Cotrimoxazole + Glibenclamide : potentialisation hypoglycémique" },
  ],
  metronidazole: [
    { drug: "alcool", severity: "danger", message: "Métronidazole + Alcool : effet antabuse (nausées, vomissements)" },
    { drug: "warfarine", severity: "danger", message: "Métronidazole + Warfarine : augmentation de l'INR" },
    { drug: "lithium", severity: "warning", message: "Métronidazole + Lithium : augmentation de la lithiémie" },
  ],
  // Psychotropes
  haloperidol: [
    { drug: "lithium", severity: "danger", message: "Halopéridol + Lithium : risque de neurotoxicité" },
    { drug: "carbamazepine", severity: "warning", message: "Halopéridol + Carbamazépine : réduction des concentrations" },
  ],
  carbamazepine: [
    { drug: "contraceptif oral", severity: "danger", message: "Carbamazépine + Contraceptif : inducteur — efficacité contraceptive réduite" },
    { drug: "warfarine", severity: "danger", message: "Carbamazépine + Warfarine : inducteur — diminue l'anticoagulation" },
    { drug: "haloperidol", severity: "warning", message: "Carbamazépine + Halopéridol : réduction des concentrations" },
  ],
  // Diurétiques
  furosemide: [
    { drug: "digoxine", severity: "warning", message: "Furosémide + Digoxine : hypokaliémie — augmente la toxicité de la digoxine" },
    { drug: "gentamicine", severity: "danger", message: "Furosémide + Gentamicine : risque ototoxicité et néphrotoxicité" },
    { drug: "aminoside", severity: "danger", message: "Furosémide + Aminoside : ototoxicité et néphrotoxicité" },
  ],
  // AINS
  ibuprofene: [
    { drug: "warfarine", severity: "danger", message: "Ibuprofène + Warfarine : risque hémorragique majeur" },
    { drug: "aspirine", severity: "warning", message: "Ibuprofène + Aspirine : double AINS — augmentation des effets indésirables" },
    { drug: "lithium", severity: "warning", message: "Ibuprofène + Lithium : augmentation de la lithiémie" },
  ],
  aspirine: [
    { drug: "warfarine", severity: "danger", message: "Aspirine + Warfarine : risque hémorragique majeur" },
    { drug: "ibuprofène", severity: "warning", message: "Aspirine + Ibuprofène : double AINS — risque GI augmenté" },
    { drug: "methotrexate", severity: "danger", message: "Aspirine + Méthotrexate : augmentation de la toxicité du méthotrexate" },
  ],
};

// ─── Génériques courants ────────────────────────────────────────────────────
const GENERICS_MAP: Record<string, string[]> = {
  "Amoxicilline": ["Clamoxyl", "Amoxil", "Gramaxin"],
  "Ampicilline": ["Totapen", "Penbritin"],
  "Ciprofloxacine": ["Ciflox", "Ciprobay", "Ciprobid"],
  "Métronidazole": ["Flagyl", "Métronide"],
  "Cotrimoxazole": ["Bactrim", "Septrin", "Eusaprim"],
  "Doxycycline": ["Vibramycine", "Doxy"],
  "Artéméther-Luméfantrine": ["Coartem", "Lumartem", "Artefan"],
  "Artésunate-Amodiaquine": ["ASAQ", "Arsucam", "Coarsucam"],
  "Quinine": ["Quinimax", "Surquina"],
  "Métformine": ["Glucophage", "Diaformine", "Metforal"],
  "Glibenclamide": ["Daonil", "Euglucon"],
  "Lisinopril": ["Zestril", "Prinivil"],
  "Amlodipine": ["Amlor", "Norvasc", "Amlopin"],
  "Furosémide": ["Lasilix", "Lasix"],
  "Atenolol": ["Ténormine", "Atenol"],
  "Paracétamol": ["Doliprane", "Efferalgan", "Panadol", "Perfalgan"],
  "Ibuprofène": ["Advil", "Nurofen", "Brufen"],
  "Diclofénac": ["Voltarène", "Diclofen"],
  "Oméprazole": ["Mopral", "Losec", "Prilosec"],
  "Ranitidine": ["Azantac", "Zantac"],
  "Prednisolone": ["Cortancyl", "Solupred"],
  "Dexaméthasone": ["Soludécadron", "Dectancyl"],
  "Salbutamol": ["Ventoline", "Airomir"],
  "Amoxicilline-Acide clavulanique": ["Augmentin", "Claventin"],
  "Érythromycine": ["Érythrocine", "Abboticine"],
  "Fluconazole": ["Triflucan", "Diflucan"],
  "Acyclovir": ["Zovirax"],
  "Efavirenz": ["Stocrin", "Sustiva"],
  "Lamivudine": ["Epivir", "Zefix"],
  "Zidovudine": ["Rétrovir"],
  "Rifampicine": ["Rifadine", "Rimactan"],
  "Isoniazide": ["Rimifon"],
  "Pyrazinamide": ["Pirilène"],
  "Ethambutol": ["Myambutol", "Dexambutol"],
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
  // Check reverse direction
  for (const existingDrug of existingDrugs) {
    const existingLower = existingDrug.toLowerCase();
    for (const [drug, interactions] of Object.entries(DRUG_INTERACTIONS)) {
      if (existingLower.includes(drug)) {
        for (const interaction of interactions) {
          if (drugLower.includes(interaction.drug)) {
            // Avoid duplicate
            if (!alerts.some((a) => a.message === interaction.message)) {
              alerts.push({ ...interaction, message: interaction.message });
            }
          }
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

function getGenericSuggestions(dci: string): string[] {
  const dciLower = dci.toLowerCase();
  for (const [genericName, brands] of Object.entries(GENERICS_MAP)) {
    if (dciLower.includes(genericName.toLowerCase()) || genericName.toLowerCase().includes(dciLower)) {
      return brands;
    }
  }
  return [];
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
  const [genericSuggestions, setGenericSuggestions] = useState<string[]>([]);
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
      setGenericSuggestions(getGenericSuggestions(value));
    } else {
      setInteractions([]);
      setAllergyConflict(null);
      setGenericSuggestions([]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (allergyConflict) {
      toast({ variant: "destructive", title: "ALERTE ALLERGIE", description: `Le patient est allergique à ${allergyConflict.substance}. Prescription bloquée.` });
      return;
    }
    // Ouvrir la fenêtre de façon SYNCHRONE (action utilisateur directe)
    // Les navigateurs bloquent window.open() appelé après un await
    const printWindow = window.open("", "_blank");
    setLoading(true);
    try {
      const { data: newRx, error } = await supabase.from("prescriptions").insert({
        patient_id: patient.id,
        medecin_id: user.id,
        consultation_id: null,
        ...form,
        date_prescription: new Date().toISOString(),
        statut: "prescrit",
        date_expiration: form.date_expiration || null,
      }).select("id").single();
      if (error) { printWindow?.close(); throw error; }

      await supabase.from("audit_logs").insert({
        user_id: user.id,
        patient_id: patient.id,
        action: "create_prescription",
        details: JSON.stringify({ medicament: form.medicament_dci, dosage: form.dosage }),
        timestamp: new Date().toISOString(),
      });

      toast({ title: "Prescription enregistrée", description: `${form.medicament_dci} ${form.dosage} — ordonnance générée` });
      onSuccess();
      onClose();

      // Naviguer dans la fenêtre déjà ouverte vers l'ordonnance
      if (printWindow && newRx?.id) {
        printWindow.location.href = `/api/ordonnance-pdf?prescriptionId=${newRx.id}`;
      } else {
        printWindow?.close();
      }
    } catch (error: unknown) {
      printWindow?.close();
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
        <div className="space-y-1 col-span-2">
          <Label>Médicament DCI *</Label>
          <Input
            value={form.medicament_dci}
            onChange={(e) => handleDrugChange(e.target.value)}
            placeholder="Ex: Metformine, Amlodipine, Artéméther-Luméfantrine..."
            required
            list="dci-list"
          />
          <datalist id="dci-list">
            {Object.keys(GENERICS_MAP).map((dci) => <option key={dci} value={dci} />)}
          </datalist>
        </div>

        {/* Generic suggestions */}
        {genericSuggestions.length > 0 && (
          <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-2">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Info className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">Noms commerciaux disponibles :</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {genericSuggestions.map((brand) => (
                <button
                  key={brand}
                  type="button"
                  onClick={() => setForm({ ...form, medicament_commercial: brand })}
                  className="text-xs bg-white border border-blue-300 rounded px-2 py-0.5 hover:bg-blue-100 transition-colors text-blue-800"
                >
                  {brand}
                </button>
              ))}
            </div>
          </div>
        )}

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
              <SelectItem value="perfusion">Perfusion IV</SelectItem>
              <SelectItem value="pommade">Pommade</SelectItem>
              <SelectItem value="gouttes">Gouttes</SelectItem>
              <SelectItem value="patch">Patch</SelectItem>
              <SelectItem value="spray">Spray</SelectItem>
              <SelectItem value="suppositoire">Suppositoire</SelectItem>
              <SelectItem value="sachet">Sachet</SelectItem>
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
          placeholder="Ex: À prendre pendant les repas, éviter le soleil, surveiller glycémie..."
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

// ─── Prescription Row (active) ────────────────────────────────────────────────

function PrescriptionRow({ p, canDispense, onDispense }: {
  p: Prescription;
  canDispense: boolean;
  onDispense: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = statusConfig[p.statut];

  return (
    <div className="rounded-lg border overflow-hidden">
      <div
        className="flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
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
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canDispense && p.statut === "prescrit" && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onDispense(p.id); }}
              className="shrink-0 border-medical-green text-medical-green hover:bg-medical-green-light"
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1" />
              Dispenser
            </Button>
          )}
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>
      {expanded && (
        <div className="border-t bg-muted/20 px-4 py-3 space-y-1.5">
          {p.instructions && (
            <p className="text-xs text-muted-foreground italic">{p.instructions}</p>
          )}
          <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
            <span>Prescrit le {formatDate(p.date_prescription)}</span>
            {p.date_expiration && <span>Expire le {formatDate(p.date_expiration)}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── History Row ──────────────────────────────────────────────────────────────

function HistoryRow({ p }: { p: Prescription }) {
  const [expanded, setExpanded] = useState(false);
  const status = statusConfig[p.statut];

  return (
    <div className="rounded-lg border overflow-hidden opacity-60">
      <div
        className="flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{p.medicament_dci} {p.dosage}</span>
            <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{p.posologie} — {p.duree}</p>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </div>
      {expanded && (
        <div className="border-t bg-muted/20 px-4 py-3 space-y-1 text-xs text-muted-foreground">
          {p.medicament_commercial && <p>Nom commercial : {p.medicament_commercial}</p>}
          {p.forme && <p>Forme : {p.forme}</p>}
          {p.instructions && <p className="italic">{p.instructions}</p>}
          <p>Prescrit le {formatDate(p.date_prescription)}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

export function PrescriptionsTab({ patient, allergies }: PrescriptionsTabProps) {
  const [open, setOpen] = useState(false);
  const { user } = useUser();
  const canCreate = user?.role === "medecin" || user?.role === "super_admin";
  const canDispense = user?.role === "pharmacien" || user?.role === "super_admin";

  // ── Chargement autonome des prescriptions ──────────────────────────────────
  const [rxList, setRxList] = useState<Prescription[]>([]);
  const [rxLoading, setRxLoading] = useState(true);
  const [rxError, setRxError] = useState<string | null>(null);

  const loadRx = useCallback(async () => {
    setRxLoading(true);
    setRxError(null);
    const { data, error } = await supabase
      .from("prescriptions")
      .select("*")
      .eq("patient_id", patient.id)
      .is("deleted_at", null)
      .order("date_prescription", { ascending: false });
    if (error) {
      setRxError(error.message);
    } else {
      setRxList(data || []);
    }
    setRxLoading(false);
  }, [patient.id]);

  useEffect(() => {
    loadRx();
  }, [loadRx]);

  async function handleDispense(prescriptionId: string) {
    if (!user) return;
    const { error } = await supabase.from("prescriptions")
      .update({ statut: "dispense", dispense_par: user.id, date_dispensation: new Date().toISOString() })
      .eq("id", prescriptionId);

    if (!error) {
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        patient_id: patient.id,
        action: "dispense_medication",
        details: JSON.stringify({ prescription_id: prescriptionId }),
        timestamp: new Date().toISOString(),
      });
      toast({ title: "Médicament dispensé" });
      loadRx();
    }
  }

  const activePrescriptions = rxList.filter((p) => ["prescrit", "dispense", "en_cours"].includes(p.statut));
  const historique = rxList.filter((p) => ["termine", "annule"].includes(p.statut));

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
        <h3 className="font-semibold">Prescriptions ({rxList.length})</h3>
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
                prescriptions={rxList}
                allergies={allergies}
                onSuccess={loadRx}
                onClose={() => setOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Expiration warnings */}
      {!rxLoading && !rxError && expiringPrescriptions.length > 0 && (
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
      {!rxLoading && !rxError && activePrescriptions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Pill className="h-4 w-4 text-medical-orange" />
              Traitements actifs ({activePrescriptions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activePrescriptions.map((p) => (
                <PrescriptionRow key={p.id} p={p} canDispense={canDispense} onDispense={handleDispense} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historique */}
      {!rxLoading && !rxError && historique.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-muted-foreground">Historique ({historique.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {historique.map((p) => (
                <HistoryRow key={p.id} p={p} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {rxLoading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span className="text-sm">Chargement des prescriptions…</span>
        </div>
      )}
      {!rxLoading && rxError && (
        <div className="text-center py-12 text-sm text-red-500">
          <p>Erreur de chargement : {rxError}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={loadRx}>Réessayer</Button>
        </div>
      )}
      {!rxLoading && !rxError && rxList.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Pill className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Aucune prescription enregistrée</p>
        </div>
      )}
    </div>
  );
}
