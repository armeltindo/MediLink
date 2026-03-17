"use client";
import { useState } from "react";
import { Patient, Vaccination } from "@/types";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Syringe, Plus, Loader2, CheckCircle, AlertTriangle, Clock } from "lucide-react";

const VACCINS_PEV = [
  "BCG (Tuberculose)",
  "DTCHepB (DTP-HepB)",
  "Polio oral (VPO)",
  "Polio injectable (VPI)",
  "Rougeole-Rubéole (MR)",
  "ROR (Rougeole-Oreillons-Rubéole)",
  "Méningite A (MenA)",
  "Pneumocoque (PCV13)",
  "Rotavirus",
  "Fièvre Jaune",
  "Hépatite B",
  "Tétanos-Diphtérie (Td)",
  "HPV (Col de l'utérus)",
  "Grippe (annuel)",
  "Typhoid Vi",
  "Rage",
  "Choléra",
];

const statusConfig = {
  a_jour: { label: "À jour", variant: "success" as const, icon: CheckCircle, color: "text-green-600" },
  en_retard: { label: "En retard", variant: "warning" as const, icon: Clock, color: "text-yellow-600" },
  contre_indique: { label: "Contre-indiqué", variant: "danger" as const, icon: AlertTriangle, color: "text-red-600" },
};

interface VaccinationsTabProps {
  patient: Patient;
  vaccinations: Vaccination[];
  onRefresh: () => void;
}

export function VaccinationsTab({ patient, vaccinations, onRefresh }: VaccinationsTabProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  const canCreate = user?.role !== "pharmacien" && user?.role !== "laborantin";

  const [etablissements, setEtablissements] = useState<{ id: string; nom: string }[]>([]);
  const [form, setForm] = useState({
    vaccin: "", dose: "", lot: "", voie: "",
    date_vaccination: new Date().toISOString().split("T")[0],
    prochain_rappel: "", etablissement_id: "", notes: "",
  });

  useState(() => {
    supabase.from("etablissements").select("id, nom").then(({ data }) => setEtablissements(data || []));
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const { error } = await supabase.from("vaccinations").insert({
        patient_id: patient.id,
        operateur_id: user.id,
        etablissement_id: form.etablissement_id || etablissements[0]?.id,
        vaccin: form.vaccin,
        dose: form.dose || null,
        lot: form.lot || null,
        voie: form.voie || null,
        date_vaccination: form.date_vaccination,
        prochain_rappel: form.prochain_rappel || null,
        statut: "a_jour",
        notes: form.notes || null,
      });

      if (error) throw error;
      toast({ title: "Vaccination enregistrée", description: form.vaccin });
      setOpen(false);
      onRefresh();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    } finally {
      setLoading(false);
    }
  }

  const enRetard = vaccinations.filter((v) => v.statut === "en_retard");
  const rapportsByVaccin = vaccinations.reduce((acc, v) => {
    acc[v.vaccin] = [...(acc[v.vaccin] || []), v];
    return acc;
  }, {} as Record<string, Vaccination[]>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Carnet vaccinal ({vaccinations.length} vaccinations)</h3>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="medical" size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Enregistrer vaccination
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Nouvelle vaccination — {patient.prenom} {patient.nom}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Vaccin *</Label>
                  <Input
                    value={form.vaccin}
                    onChange={(e) => setForm({ ...form, vaccin: e.target.value })}
                    placeholder="Ex: BCG, Fièvre Jaune..."
                    list="vaccins-list"
                    required
                  />
                  <datalist id="vaccins-list">
                    {VACCINS_PEV.map((v) => <option key={v} value={v} />)}
                  </datalist>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Dose</Label>
                    <Input value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} placeholder="1ère, 2ème, Rappel..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Numéro de lot</Label>
                    <Input value={form.lot} onChange={(e) => setForm({ ...form, lot: e.target.value })} placeholder="Ex: LOT-2024-001" />
                  </div>
                  <div className="space-y-2">
                    <Label>Voie d'administration</Label>
                    <Select onValueChange={(v) => setForm({ ...form, voie: v })}>
                      <SelectTrigger><SelectValue placeholder="Voie..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IM">Intramusculaire (IM)</SelectItem>
                        <SelectItem value="SC">Sous-cutanée (SC)</SelectItem>
                        <SelectItem value="ID">Intradermique (ID)</SelectItem>
                        <SelectItem value="PO">Orale (PO)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date vaccination *</Label>
                    <Input type="date" value={form.date_vaccination} onChange={(e) => setForm({ ...form, date_vaccination: e.target.value })} required />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Prochain rappel (date)</Label>
                    <Input type="date" value={form.prochain_rappel} onChange={(e) => setForm({ ...form, prochain_rappel: e.target.value })} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Établissement</Label>
                    <Select onValueChange={(v) => setForm({ ...form, etablissement_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                      <SelectContent>
                        {etablissements.map((e) => <SelectItem key={e.id} value={e.id}>{e.nom}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

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

      {/* Rappels en retard */}
      {enRetard.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm font-medium text-yellow-800 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {enRetard.length} vaccin{enRetard.length > 1 ? "s" : ""} en retard
          </p>
          {enRetard.map((v) => (
            <p key={v.id} className="text-xs text-yellow-700 mt-1">• {v.vaccin} — rappel prévu le {formatDate(v.prochain_rappel)}</p>
          ))}
        </div>
      )}

      {/* Vaccinations list */}
      {vaccinations.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Syringe className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Aucune vaccination enregistrée</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {Object.entries(rapportsByVaccin).map(([vaccin, records]) => {
            const latest = records[0];
            const status = statusConfig[latest.statut] || statusConfig.a_jour;
            const Icon = status.icon;

            return (
              <Card key={vaccin}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${status.color}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{vaccin}</span>
                        <Badge variant={status.variant}>{status.label}</Badge>
                        {records.length > 1 && (
                          <span className="text-xs text-muted-foreground">{records.length} doses</span>
                        )}
                      </div>
                      <div className="mt-1 space-y-1">
                        {records.map((r) => (
                          <p key={r.id} className="text-xs text-muted-foreground">
                            {formatDate(r.date_vaccination)}
                            {r.dose ? ` — ${r.dose}` : ""}
                            {r.lot ? ` (Lot: ${r.lot})` : ""}
                          </p>
                        ))}
                      </div>
                      {latest.prochain_rappel && (
                        <p className="text-xs mt-1 text-blue-600">
                          Prochain rappel : {formatDate(latest.prochain_rappel)}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
