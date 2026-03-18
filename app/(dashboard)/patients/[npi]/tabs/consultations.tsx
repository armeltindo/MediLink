"use client";
import { useState, useEffect } from "react";
import { Patient, Consultation, Constante } from "@/types";
import { supabase } from "@/lib/supabase";
import { formatDateTime, calculateIMC } from "@/lib/utils";
import { searchCIM10, CIM10Code } from "@/lib/cim10";
import { toast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { ConstantesChart } from "@/components/charts/constantes-chart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, ChevronDown, ChevronUp, Search, Activity } from "lucide-react";

interface ConsultationsTabProps {
  patient: Patient;
  consultations?: Consultation[];
  onRefresh: () => void;
}

function ConsultationCard({ consultation }: { consultation: Consultation }) {
  const [expanded, setExpanded] = useState(false);
  const [constantes, setConstantes] = useState<Constante[]>([]);
  const [loadingConst, setLoadingConst] = useState(false);

  async function loadConstantes() {
    if (constantes.length > 0) {
      setExpanded(!expanded);
      return;
    }
    setLoadingConst(true);
    const { data } = await supabase
      .from("constantes")
      .select("*")
      .eq("consultation_id", consultation.id)
      .order("date_mesure");
    setConstantes(data || []);
    setLoadingConst(false);
    setExpanded(true);
  }

  const typeColors: Record<string, string> = {
    externe: "bg-blue-100 text-blue-800",
    urgence: "bg-red-100 text-red-800",
    hospitalisation: "bg-purple-100 text-purple-800",
    teleconsultation: "bg-green-100 text-green-800",
  };

  return (
    <Card className="overflow-hidden">
      <div
        className="flex items-start gap-4 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={loadConstantes}
      >
        {/* Timeline dot */}
        <div className="flex flex-col items-center pt-1">
          <div className="h-3 w-3 rounded-full bg-medical-green border-2 border-background ring-2 ring-medical-green" />
          <div className="w-0.5 bg-border flex-1 mt-1" style={{ minHeight: "20px" }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{formatDateTime(consultation.date_consultation)}</span>
            {consultation.type_consultation && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${typeColors[consultation.type_consultation] || "bg-gray-100 text-gray-800"}`}>
                {consultation.type_consultation}
              </span>
            )}
          </div>
          <p className="text-sm font-medium mt-1">{consultation.motif}</p>
          {consultation.diagnostic_principal && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">{consultation.diagnostic_principal}</span>
              {consultation.diagnostic_cim10 && (
                <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{consultation.diagnostic_cim10}</span>
              )}
            </div>
          )}
        </div>

        <Button variant="ghost" size="icon-sm">
          {loadingConst ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {expanded && (
        <div className="border-t bg-muted/20 p-4 space-y-4">
          {consultation.anamnese && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Anamnèse</p>
              <p className="text-sm">{consultation.anamnese}</p>
            </div>
          )}
          {consultation.plan_prise_en_charge && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Plan de prise en charge</p>
              <p className="text-sm">{consultation.plan_prise_en_charge}</p>
            </div>
          )}

          {/* Constantes */}
          {constantes.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Constantes vitales</p>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-3">
                {[
                  { label: "TA", value: constantes[0]?.ta_sys && constantes[0]?.ta_dia ? `${constantes[0].ta_sys}/${constantes[0].ta_dia}` : "—", unit: "mmHg" },
                  { label: "FC", value: constantes[0]?.fc || "—", unit: "bpm" },
                  { label: "T°", value: constantes[0]?.temperature || "—", unit: "°C" },
                  { label: "SpO₂", value: constantes[0]?.spo2 || "—", unit: "%" },
                  { label: "Poids", value: constantes[0]?.poids || "—", unit: "kg" },
                  { label: "IMC", value: constantes[0]?.imc || (constantes[0]?.poids && constantes[0]?.taille ? calculateIMC(constantes[0].poids, constantes[0].taille) : "—"), unit: "" },
                ].map(({ label, value, unit }) => (
                  <div key={label} className="bg-background rounded-lg p-2.5 border text-center">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-bold mt-0.5">{value}<span className="text-xs font-normal text-muted-foreground ml-0.5">{unit}</span></p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

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

  function handleCIM10Search(q: string) {
    setCim10Query(q);
    setCim10Results(searchCIM10(q));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
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

      // Insert constantes if provided
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
      const msg = error instanceof Error ? error.message : "Erreur";
      toast({ variant: "destructive", title: "Erreur", description: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Type de consultation</Label>
          <Select value={form.type_consultation} onValueChange={(v) => setForm({ ...form, type_consultation: v })}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="externe">Externe</SelectItem>
              <SelectItem value="urgence">Urgence</SelectItem>
              <SelectItem value="hospitalisation">Hospitalisation</SelectItem>
              <SelectItem value="teleconsultation">Téléconsultation</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Établissement</Label>
          <Select value={form.etablissement_id} onValueChange={(v) => setForm({ ...form, etablissement_id: v })}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
            <SelectContent>
              {etablissements.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.nom}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label>Motif de consultation *</Label>
        <Input value={form.motif} onChange={(e) => setForm({ ...form, motif: e.target.value })} required placeholder="Ex: Suivi diabète, Douleur thoracique..." />
      </div>

      <div className="space-y-1">
        <Label>Anamnèse</Label>
        <Textarea value={form.anamnese} onChange={(e) => setForm({ ...form, anamnese: e.target.value })} rows={3} placeholder="Description clinique du motif..." />
      </div>

      {/* CIM-10 */}
      <div className="space-y-1">
        <Label>Diagnostic CIM-10</Label>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={selectedCIM10 ? `${selectedCIM10.code} — ${selectedCIM10.libelle}` : cim10Query}
            onChange={(e) => { setSelectedCIM10(null); handleCIM10Search(e.target.value); }}
            placeholder="Rechercher diabète, HTA, paludisme..."
            className="pl-9"
          />
        </div>
        {cim10Results.length > 0 && !selectedCIM10 && (
          <div className="border rounded-md shadow-sm bg-background max-h-40 overflow-y-auto">
            {cim10Results.map((code) => (
              <button
                key={code.code}
                type="button"
                onClick={() => { setSelectedCIM10(code); setCim10Results([]); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent border-b last:border-0"
              >
                <span className="font-mono font-medium text-medical-green">{code.code}</span>
                <span className="ml-2">{code.libelle}</span>
                <span className="ml-2 text-xs text-muted-foreground">({code.categorie})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <Label>Diagnostic principal (texte libre)</Label>
        <Input
          value={form.diagnostic_principal}
          onChange={(e) => setForm({ ...form, diagnostic_principal: e.target.value })}
          placeholder="Ex: Diabète type 2 décompensé"
        />
      </div>

      {/* Constantes */}
      <div>
        <p className="text-sm font-medium mb-2 flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Constantes vitales
        </p>
        <div className="grid grid-cols-3 gap-2 text-sm">
          {[
            { key: "ta_sys", label: "TA sys (mmHg)", type: "number" },
            { key: "ta_dia", label: "TA dia (mmHg)", type: "number" },
            { key: "fc", label: "FC (bpm)", type: "number" },
            { key: "fr", label: "FR (rpm)", type: "number" },
            { key: "temperature", label: "Temp (°C)", type: "number", step: "0.1" },
            { key: "spo2", label: "SpO₂ (%)", type: "number", step: "0.1" },
            { key: "poids", label: "Poids (kg)", type: "number", step: "0.1" },
            { key: "taille", label: "Taille (cm)", type: "number" },
          ].map(({ key, label, type, step }) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs">{label}</Label>
              <Input
                type={type}
                step={step}
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="h-8 text-sm"
                placeholder="—"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <Label>Plan de prise en charge</Label>
        <Textarea
          value={form.plan_prise_en_charge}
          onChange={(e) => setForm({ ...form, plan_prise_en_charge: e.target.value })}
          rows={3}
          placeholder="Ordonnance, examens prescrits, orientation..."
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
        <Button type="submit" variant="medical" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Enregistrer
        </Button>
      </div>
    </form>
  );
}

export function ConsultationsTab({ patient, consultations: initialConsultations, onRefresh }: ConsultationsTabProps) {
  const [open, setOpen] = useState(false);
  const { user } = useUser();
  const canCreate = user?.role === "medecin" || user?.role === "super_admin";

  // Lazy-load consultations if not passed as props
  const [consultations, setConsultations] = useState<Consultation[]>(initialConsultations || []);
  const [tabLoading, setTabLoading] = useState(!initialConsultations);

  useEffect(() => {
    if (initialConsultations) return;
    supabase
      .from("consultations")
      .select("*")
      .eq("patient_id", patient.id)
      .is("deleted_at", null)
      .order("date_consultation", { ascending: false })
      .then(({ data }) => {
        setConsultations(data || []);
        setTabLoading(false);
      });
  }, [patient.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filters
  const [filterType, setFilterType] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");

  // Get all constantes for charts
  const [allConstantes, setAllConstantes] = useState<Constante[]>([]);

  useEffect(() => {
    supabase
      .from("constantes")
      .select("*")
      .eq("patient_id", patient.id)
      .order("date_mesure")
      .then(({ data }) => setAllConstantes(data || []));
  }, [patient.id]);

  // Compute available years from consultations
  const availableYears = Array.from(
    new Set(consultations.map((c) => new Date(c.date_consultation).getFullYear()))
  ).sort((a, b) => b - a);

  // Apply filters
  const filteredConsultations = consultations.filter((c) => {
    if (filterType !== "all" && c.type_consultation !== filterType) return false;
    if (filterYear !== "all" && new Date(c.date_consultation).getFullYear().toString() !== filterYear) return false;
    return true;
  });

  if (tabLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-lg border bg-card animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold">
          {filteredConsultations.length} / {consultations.length} consultation{consultations.length > 1 ? "s" : ""}
        </h3>
        <div className="flex gap-2 flex-wrap items-center">
          {/* Filter by type */}
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Type..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="externe">Externe</SelectItem>
              <SelectItem value="urgence">Urgence</SelectItem>
              <SelectItem value="hospitalisation">Hospitalisation</SelectItem>
              <SelectItem value="teleconsultation">Téléconsultation</SelectItem>
            </SelectContent>
          </Select>
          {/* Filter by year */}
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="h-8 w-28 text-xs"><SelectValue placeholder="Année..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {availableYears.map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
              <NewConsultationDialog
                patient={patient}
                onSuccess={onRefresh}
                onClose={() => setOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Charts */}
      {allConstantes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Évolution des constantes vitales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ConstantesChart constantes={allConstantes} type="tension" />
              <ConstantesChart constantes={allConstantes} type="poids" />
              <ConstantesChart constantes={allConstantes} type="temperature" />
              <ConstantesChart constantes={allConstantes} type="spo2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      {filteredConsultations.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>{consultations.length === 0 ? "Aucune consultation enregistrée" : "Aucune consultation pour ces filtres"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredConsultations.map((c) => (
            <ConsultationCard key={c.id} consultation={c} />
          ))}
        </div>
      )}
    </div>
  );
}
