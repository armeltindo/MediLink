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
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Syringe,
  Search,
  AlertTriangle,
  Plus,
  Loader2,
  Calendar,
  Building2,
  Clock,
  CheckCircle,
  ShieldOff,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VaccinationRow {
  id: string;
  patient_id: string;
  vaccin: string;
  dose: string | null;
  lot: string | null;
  voie: string | null;
  operateur_id: string;
  etablissement_id: string;
  date_vaccination: string;
  prochain_rappel: string | null;
  statut: "a_jour" | "en_retard" | "contre_indique";
  notes: string | null;
  patients: {
    npi: string;
    nom: string;
    prenom: string;
  };
  etablissements: {
    nom: string;
  } | null;
}

interface PatientOption {
  id: string;
  npi: string;
  nom: string;
  prenom: string;
}

interface EtablissementOption {
  id: string;
  nom: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_CONFIG = {
  a_jour: {
    label: "À jour",
    variant: "success" as const,
    icon: CheckCircle,
    rowClass: "",
  },
  en_retard: {
    label: "En retard",
    variant: "danger" as const,
    icon: Clock,
    rowClass: "bg-orange-50/60 hover:bg-orange-50/80",
  },
  contre_indique: {
    label: "Contre-indiqué",
    variant: "default" as const,
    icon: ShieldOff,
    rowClass: "",
  },
};

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

// ---------------------------------------------------------------------------
// Skeleton row
// ---------------------------------------------------------------------------

function RowSkeleton() {
  return (
    <TableRow>
      {Array.from({ length: 7 }).map((_, i) => (
        <TableCell key={i}>
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  );
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon: Icon,
  colorClass,
  loading,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${colorClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          {loading ? (
            <Skeleton className="h-7 w-12 mb-1" />
          ) : (
            <p className="text-2xl font-bold">{value}</p>
          )}
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Add vaccination dialog
// ---------------------------------------------------------------------------

interface AddVaccinationDialogProps {
  etablissements: EtablissementOption[];
  onSuccess: () => void;
}

function AddVaccinationDialog({
  etablissements,
  onSuccess,
}: AddVaccinationDialogProps) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientOptions, setPatientOptions] = useState<PatientOption[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(
    null
  );
  const [searchingPatient, setSearchingPatient] = useState(false);

  const [form, setForm] = useState({
    vaccin: "",
    dose: "",
    lot: "",
    voie: "",
    date_vaccination: new Date().toISOString().split("T")[0],
    prochain_rappel: "",
    etablissement_id: etablissements[0]?.id ?? "",
    statut: "a_jour" as "a_jour" | "en_retard" | "contre_indique",
    notes: "",
  });

  // Keep etablissement_id in sync when etablissements load
  useEffect(() => {
    if (etablissements.length > 0 && !form.etablissement_id) {
      setForm((f) => ({ ...f, etablissement_id: etablissements[0].id }));
    }
  }, [etablissements]); // eslint-disable-line react-hooks/exhaustive-deps

  // Patient search
  useEffect(() => {
    if (patientSearch.trim().length < 2) {
      setPatientOptions([]);
      return;
    }

    const t = setTimeout(async () => {
      setSearchingPatient(true);
      const { data } = await supabase
        .from("patients")
        .select("id, npi, nom, prenom")
        .is("deleted_at", null)
        .or(
          `npi.ilike.%${patientSearch}%,nom.ilike.%${patientSearch}%,prenom.ilike.%${patientSearch}%`
        )
        .limit(10);
      setPatientOptions((data as PatientOption[]) || []);
      setSearchingPatient(false);
    }, 300);

    return () => clearTimeout(t);
  }, [patientSearch]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !selectedPatient) {
      toast({
        variant: "destructive",
        title: "Patient requis",
        description: "Veuillez sélectionner un patient.",
      });
      return;
    }
    setLoading(true);

    try {
      const { error } = await supabase.from("vaccinations").insert({
        patient_id: selectedPatient.id,
        operateur_id: user.id,
        etablissement_id:
          form.etablissement_id || etablissements[0]?.id,
        vaccin: form.vaccin,
        dose: form.dose || null,
        lot: form.lot || null,
        voie: form.voie || null,
        date_vaccination: form.date_vaccination,
        prochain_rappel: form.prochain_rappel || null,
        statut: form.statut,
        notes: form.notes || null,
      });

      if (error) throw error;

      toast({
        title: "Vaccination enregistrée",
        description: `${form.vaccin} — ${selectedPatient.prenom} ${selectedPatient.nom}`,
      });

      setOpen(false);
      setSelectedPatient(null);
      setPatientSearch("");
      setForm({
        vaccin: "",
        dose: "",
        lot: "",
        voie: "",
        date_vaccination: new Date().toISOString().split("T")[0],
        prochain_rappel: "",
        etablissement_id: etablissements[0]?.id ?? "",
        statut: "a_jour",
        notes: "",
      });
      onSuccess();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erreur lors de l'enregistrement",
        description: (err as Error).message,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="medical">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter vaccination
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle vaccination</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Patient selection */}
          <div className="space-y-2">
            <Label htmlFor="patient-search">Patient *</Label>
            {selectedPatient ? (
              <div className="flex items-center justify-between rounded-md border px-3 py-2 bg-medical-green/5 border-medical-green/30">
                <div>
                  <span className="font-medium text-sm">
                    {selectedPatient.prenom} {selectedPatient.nom}
                  </span>
                  <span className="ml-2 text-xs font-mono text-muted-foreground">
                    {selectedPatient.npi}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedPatient(null);
                    setPatientSearch("");
                  }}
                >
                  Changer
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="patient-search"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  placeholder="Rechercher par NPI, nom, prénom…"
                  className="pl-9"
                  autoComplete="off"
                />
                {(patientOptions.length > 0 || searchingPatient) && (
                  <div className="absolute z-10 top-full mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
                    {searchingPatient ? (
                      <div className="flex items-center justify-center py-3">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      patientOptions.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-center gap-2"
                          onClick={() => {
                            setSelectedPatient(p);
                            setPatientSearch("");
                            setPatientOptions([]);
                          }}
                        >
                          <span className="font-medium">
                            {p.prenom} {p.nom}
                          </span>
                          <span className="text-xs font-mono text-muted-foreground">
                            {p.npi}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Vaccin */}
          <div className="space-y-2">
            <Label htmlFor="vaccin">Vaccin *</Label>
            <Input
              id="vaccin"
              value={form.vaccin}
              onChange={(e) => setForm({ ...form, vaccin: e.target.value })}
              placeholder="Ex: BCG, Fièvre Jaune…"
              list="vaccins-list"
              required
            />
            <datalist id="vaccins-list">
              {VACCINS_PEV.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="dose">Dose</Label>
              <Input
                id="dose"
                value={form.dose}
                onChange={(e) => setForm({ ...form, dose: e.target.value })}
                placeholder="1ère, 2ème, Rappel…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lot">Numéro de lot</Label>
              <Input
                id="lot"
                value={form.lot}
                onChange={(e) => setForm({ ...form, lot: e.target.value })}
                placeholder="Ex: LOT-2024-001"
              />
            </div>

            <div className="space-y-2">
              <Label>Voie d&apos;administration</Label>
              <Select
                value={form.voie}
                onValueChange={(v) => setForm({ ...form, voie: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IM">Intramusculaire (IM)</SelectItem>
                  <SelectItem value="SC">Sous-cutanée (SC)</SelectItem>
                  <SelectItem value="ID">Intradermique (ID)</SelectItem>
                  <SelectItem value="PO">Orale (PO)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Statut</Label>
              <Select
                value={form.statut}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    statut: v as "a_jour" | "en_retard" | "contre_indique",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a_jour">À jour</SelectItem>
                  <SelectItem value="en_retard">En retard</SelectItem>
                  <SelectItem value="contre_indique">Contre-indiqué</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_vaccination">Date vaccination *</Label>
              <Input
                id="date_vaccination"
                type="date"
                value={form.date_vaccination}
                onChange={(e) =>
                  setForm({ ...form, date_vaccination: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prochain_rappel">Prochain rappel</Label>
              <Input
                id="prochain_rappel"
                type="date"
                value={form.prochain_rappel}
                onChange={(e) =>
                  setForm({ ...form, prochain_rappel: e.target.value })
                }
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Établissement</Label>
              <Select
                value={form.etablissement_id}
                onValueChange={(v) =>
                  setForm({ ...form, etablissement_id: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner…" />
                </SelectTrigger>
                <SelectContent>
                  {etablissements.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function VaccinationsPage() {
  const { user } = useUser();
  const [vaccinations, setVaccinations] = useState<VaccinationRow[]>([]);
  const [etablissements, setEtablissements] = useState<EtablissementOption[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const canAdd =
    user?.role === "medecin" ||
    user?.role === "infirmier" ||
    user?.role === "super_admin" ||
    user?.role === "admin_etablissement";

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchVaccinations = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("vaccinations")
      .select("*, patients!inner(npi, nom, prenom), etablissements(nom)")
      .order("date_vaccination", { ascending: false })
      .limit(200);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur de chargement",
        description: error.message,
      });
    } else {
      setVaccinations((data as unknown as VaccinationRow[]) || []);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchVaccinations();
      supabase
        .from("etablissements")
        .select("id, nom")
        .is("deleted_at", null)
        .order("nom")
        .then(({ data }) =>
          setEtablissements((data as EtablissementOption[]) || [])
        );
    }
  }, [user, fetchVaccinations]);

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  const today = new Date();
  const in30Days = new Date();
  in30Days.setDate(today.getDate() + 30);

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const countThisWeek = vaccinations.filter((v) => {
    const d = new Date(v.date_vaccination);
    return d >= startOfWeek && d <= today;
  }).length;

  const countEnRetard = vaccinations.filter(
    (v) => v.statut === "en_retard"
  ).length;

  const countProchain = vaccinations.filter((v) => {
    if (!v.prochain_rappel) return false;
    const d = new Date(v.prochain_rappel);
    return d > today && d <= in30Days;
  }).length;

  // ---------------------------------------------------------------------------
  // Filtering
  // ---------------------------------------------------------------------------

  const filtered = vaccinations.filter((v) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      v.patients.npi.toLowerCase().includes(q) ||
      v.patients.nom.toLowerCase().includes(q) ||
      v.patients.prenom.toLowerCase().includes(q) ||
      v.vaccin.toLowerCase().includes(q)
    );
  });

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Carnet Vaccinal & Prévention" />

      <div className="p-6 space-y-5 flex-1">
        {/* Alert banner — overdue vaccines */}
        {!loading && countEnRetard > 0 && (
          <div className="flex items-start gap-3 rounded-lg border border-orange-300 bg-orange-50 px-4 py-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-orange-800">
                {countEnRetard} rappel
                {countEnRetard > 1 ? "s" : ""} en retard
              </p>
              <p className="text-sm text-orange-700">
                Des patients ont des vaccinations en retard. Consultez les
                lignes surlignées ci-dessous.
              </p>
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Vaccinations cette semaine"
            value={countThisWeek}
            icon={Syringe}
            colorClass="bg-medical-green/10 text-medical-green"
            loading={loading}
          />
          <StatCard
            label="Rappels en retard"
            value={countEnRetard}
            icon={Clock}
            colorClass={
              countEnRetard > 0
                ? "bg-orange-100 text-orange-600"
                : "bg-muted text-muted-foreground"
            }
            loading={loading}
          />
          <StatCard
            label="Rappels dans 30 jours"
            value={countProchain}
            icon={Calendar}
            colorClass="bg-medical-blue/10 text-medical-blue"
            loading={loading}
          />
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="NPI, nom du patient ou vaccin…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {canAdd && (
            <div className="sm:ml-auto">
              <AddVaccinationDialog
                etablissements={etablissements}
                onSuccess={fetchVaccinations}
              />
            </div>
          )}
        </div>

        {/* Result count */}
        {!loading && (
          <p className="text-sm text-muted-foreground">
            {filtered.length} vaccination
            {filtered.length !== 1 ? "s" : ""} affichée
            {filtered.length !== 1 ? "s" : ""}
          </p>
        )}

        {/* Table */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Vaccin / Dose</TableHead>
                <TableHead>Date vaccination</TableHead>
                <TableHead>Prochain rappel</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Établissement</TableHead>
                <TableHead>Lot</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <RowSkeleton key={i} />
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-16 text-muted-foreground"
                  >
                    <Syringe className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Aucune vaccination trouvée</p>
                    <p className="text-sm mt-1">
                      {search
                        ? "Aucun résultat pour cette recherche."
                        : "Les vaccinations enregistrées apparaîtront ici."}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((v) => {
                  const cfg = STATUS_CONFIG[v.statut] ?? STATUS_CONFIG.a_jour;
                  const StatusIcon = cfg.icon;

                  // Highlight rows where prochain_rappel is past
                  const isOverdue =
                    v.statut === "en_retard" ||
                    (v.prochain_rappel &&
                      new Date(v.prochain_rappel) < today &&
                      v.statut !== "contre_indique");

                  return (
                    <TableRow
                      key={v.id}
                      className={
                        isOverdue
                          ? "bg-orange-50/60 hover:bg-orange-50/80"
                          : undefined
                      }
                    >
                      {/* Patient */}
                      <TableCell>
                        <div className="flex flex-col">
                          <Link
                            href={`/patients/${v.patients.npi}`}
                            className="font-semibold text-foreground hover:text-medical-green transition-colors"
                          >
                            {v.patients.nom} {v.patients.prenom}
                          </Link>
                          <span className="text-xs font-mono text-muted-foreground">
                            {v.patients.npi}
                          </span>
                        </div>
                      </TableCell>

                      {/* Vaccin + dose */}
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <Syringe className="h-3.5 w-3.5 text-medical-green shrink-0" />
                            <span className="font-medium text-sm">
                              {v.vaccin}
                            </span>
                          </div>
                          {v.dose && (
                            <span className="text-xs text-muted-foreground ml-5">
                              {v.dose}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Date vaccination */}
                      <TableCell className="text-sm">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          {formatDate(v.date_vaccination)}
                        </span>
                      </TableCell>

                      {/* Prochain rappel */}
                      <TableCell className="text-sm">
                        {v.prochain_rappel ? (
                          <span
                            className={`flex items-center gap-1.5 ${
                              isOverdue
                                ? "text-orange-600 font-medium"
                                : "text-muted-foreground"
                            }`}
                          >
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            {formatDate(v.prochain_rappel)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge variant={cfg.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {cfg.label}
                        </Badge>
                      </TableCell>

                      {/* Établissement */}
                      <TableCell className="text-sm">
                        {v.etablissements ? (
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Building2 className="h-3.5 w-3.5 shrink-0" />
                            {v.etablissements.nom}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>

                      {/* Lot */}
                      <TableCell>
                        {v.lot ? (
                          <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">
                            {v.lot}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
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
