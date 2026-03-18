"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Pill,
  Search,
  Filter,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  FlaskConical,
} from "lucide-react";

interface PrescriptionRow {
  id: string;
  consultation_id: string;
  patient_id: string;
  medecin_id: string;
  medicament_dci: string;
  medicament_commercial: string | null;
  dosage: string;
  forme: string | null;
  posologie: string;
  duree: string;
  instructions: string | null;
  statut: "prescrit" | "dispense" | "en_cours" | "termine" | "annule";
  dispense_par: string | null;
  date_dispensation: string | null;
  substitution_generique: string | null;
  date_prescription: string;
  date_expiration: string | null;
  patients: {
    npi: string;
    nom: string;
    prenom: string;
  };
}

type FilterTab = "toutes" | "actives" | "dispensees" | "expirees";

const STATUT_LABELS: Record<string, string> = {
  prescrit: "Prescrit",
  en_cours: "En cours",
  dispense: "Dispensé",
  termine: "Terminé",
  annule: "Annulé",
};

const STATUT_VARIANTS: Record<
  string,
  "info" | "success" | "secondary" | "danger" | "default"
> = {
  prescrit: "info",
  en_cours: "success",
  dispense: "default",
  termine: "default",
  annule: "danger",
};

function isExpiringWithin7Days(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const exp = new Date(dateStr).getTime();
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return exp > now && exp - now <= sevenDays;
}

function isExpired(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr).getTime() < Date.now();
}

function PrescriptionSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-lg border bg-card">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-52" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-64" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-28" />
      </div>
    </div>
  );
}

export default function PrescriptionsPage() {
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();

  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("toutes");
  const [searchQuery, setSearchQuery] = useState("");

  const [dispensationTarget, setDispensationTarget] =
    useState<PrescriptionRow | null>(null);
  const [substitution, setSubstitution] = useState("");
  const [dispensing, setDispensing] = useState(false);

  const isPharmacien = user?.role === "pharmacien";
  const isMedecin = user?.role === "medecin";

  const fetchPrescriptions = useCallback(
    async (tab: FilterTab, query: string) => {
      if (!user) return;
      setLoading(true);

      let req = supabase
        .from("prescriptions")
        .select("*, patients!inner(npi, nom, prenom)")
        .is("deleted_at", null)
        .order("date_prescription", { ascending: false })
        .limit(100);

      if (isMedecin) {
        req = req.eq("medecin_id", user.id);
      }

      if (tab === "actives") {
        req = req.in("statut", ["prescrit", "en_cours"]);
      } else if (tab === "dispensees") {
        req = req.eq("statut", "dispense");
      } else if (tab === "expirees") {
        req = req
          .in("statut", ["prescrit", "en_cours"])
          .lt("date_expiration", new Date().toISOString());
      }

      const { data } = await req;
      let rows = (data as unknown as PrescriptionRow[]) || [];

      if (query.trim()) {
        const q = query.toLowerCase();
        rows = rows.filter(
          (p) =>
            p.medicament_dci.toLowerCase().includes(q) ||
            p.patients.npi.toLowerCase().includes(q) ||
            p.patients.nom.toLowerCase().includes(q) ||
            p.patients.prenom.toLowerCase().includes(q)
        );
      }

      setPrescriptions(rows);
      setLoading(false);
    },
    [user, isMedecin]
  );

  useEffect(() => {
    if (user) {
      fetchPrescriptions(activeTab, searchQuery);
    }
  }, [user, fetchPrescriptions, activeTab]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchPrescriptions(activeTab, searchQuery);
  }

  function handleTabChange(tab: FilterTab) {
    setActiveTab(tab);
    fetchPrescriptions(tab, searchQuery);
  }

  function openDispensationDialog(prescription: PrescriptionRow) {
    setDispensationTarget(prescription);
    setSubstitution(prescription.substitution_generique || "");
  }

  function closeDispensationDialog() {
    setDispensationTarget(null);
    setSubstitution("");
  }

  async function handleValiderDispensation() {
    if (!dispensationTarget || !user) return;
    setDispensing(true);

    const { error } = await supabase
      .from("prescriptions")
      .update({
        statut: "dispense",
        dispense_par: user.id,
        date_dispensation: new Date().toISOString(),
        substitution_generique: substitution.trim() || null,
      })
      .eq("id", dispensationTarget.id);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de valider la dispensation. Réessayez.",
        variant: "destructive",
      });
      setDispensing(false);
      return;
    }

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "dispense_medication",
      entity_type: "prescriptions",
      entity_id: dispensationTarget.id,
      patient_id: dispensationTarget.patient_id,
      details: {
        medicament_dci: dispensationTarget.medicament_dci,
        substitution_generique: substitution.trim() || null,
      },
    });

    toast({
      title: "Dispensation validée",
      description: `${dispensationTarget.medicament_dci} dispensé avec succès.`,
    });

    setDispensing(false);
    closeDispensationDialog();
    fetchPrescriptions(activeTab, searchQuery);
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Prescriptions & Pharmacie" />

      <div className="p-6 space-y-5 flex-1">
        {/* Filter tabs + search toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Tabs
            value={activeTab}
            onValueChange={(v) => handleTabChange(v as FilterTab)}
            className="shrink-0"
          >
            <TabsList>
              <TabsTrigger value="toutes">Toutes</TabsTrigger>
              <TabsTrigger value="actives">Actives</TabsTrigger>
              <TabsTrigger value="dispensees">Dispensées</TabsTrigger>
              <TabsTrigger value="expirees">Expirées</TabsTrigger>
            </TabsList>
          </Tabs>

          <form
            onSubmit={handleSearch}
            className="flex gap-2 flex-1 sm:max-w-md"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="NPI, nom du patient ou médicament DCI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="outline">
              <Filter className="h-4 w-4 mr-1.5" />
              Filtrer
            </Button>
          </form>
        </div>

        {/* Results count */}
        {!loading && (
          <p className="text-sm text-muted-foreground">
            {prescriptions.length} prescription
            {prescriptions.length !== 1 ? "s" : ""}
            {searchQuery ? ` pour « ${searchQuery} »` : ""}
            {isMedecin && (
              <span className="ml-1 text-medical-green font-medium">
                (vos prescriptions)
              </span>
            )}
          </p>
        )}

        {/* List */}
        <div className="grid gap-3">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <PrescriptionSkeleton key={i} />
            ))
          ) : prescriptions.length === 0 ? (
            <div className="text-center py-16">
              <Pill className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg">
                Aucune prescription trouvée
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                {searchQuery
                  ? `Aucun résultat pour « ${searchQuery} »`
                  : activeTab !== "toutes"
                  ? "Aucune prescription dans cette catégorie."
                  : "Les prescriptions apparaîtront ici une fois créées depuis les dossiers patients."}
              </p>
              <Button asChild variant="medical">
                <Link href="/patients">
                  <Search className="h-4 w-4 mr-2" />
                  Rechercher un patient
                </Link>
              </Button>
            </div>
          ) : (
            prescriptions.map((prescription) => {
              const patient = prescription.patients;
              const expiring = isExpiringWithin7Days(
                prescription.date_expiration
              );
              const expired =
                isExpired(prescription.date_expiration) &&
                (prescription.statut === "prescrit" ||
                  prescription.statut === "en_cours");
              const canDispense =
                isPharmacien && prescription.statut === "prescrit";

              return (
                <Card
                  key={prescription.id}
                  className={`hover:shadow-md transition-shadow ${
                    expired ? "border-medical-red/40 bg-red-50/30" : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                      {/* Left: main info */}
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Patient + status */}
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/patients/${patient.npi}`}
                            className="font-semibold text-foreground hover:text-medical-green transition-colors"
                          >
                            {patient.nom} {patient.prenom}
                          </Link>
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {patient.npi}
                          </span>
                          <Badge
                            variant={
                              STATUT_VARIANTS[prescription.statut] ?? "default"
                            }
                          >
                            {STATUT_LABELS[prescription.statut] ??
                              prescription.statut}
                          </Badge>
                        </div>

                        {/* Medicament */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-sm">
                            {prescription.medicament_dci}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {prescription.dosage}
                            {prescription.forme && ` — ${prescription.forme}`}
                          </span>
                        </div>

                        {/* Posologie + durée */}
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">
                            Posologie :
                          </span>{" "}
                          {prescription.posologie} —{" "}
                          <span className="font-medium text-foreground">
                            Durée :
                          </span>{" "}
                          {prescription.duree}
                        </p>

                        {/* Dates row */}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            Prescrit le{" "}
                            {formatDate(prescription.date_prescription)}
                          </span>
                          {prescription.date_expiration && (
                            <span
                              className={`flex items-center gap-1 ${
                                expired
                                  ? "text-medical-red font-medium"
                                  : expiring
                                  ? "text-medical-orange font-medium"
                                  : ""
                              }`}
                            >
                              {expired ? (
                                <AlertTriangle className="h-3.5 w-3.5" />
                              ) : expiring ? (
                                <AlertTriangle className="h-3.5 w-3.5" />
                              ) : (
                                <Clock className="h-3.5 w-3.5" />
                              )}
                              Expire le{" "}
                              {formatDate(prescription.date_expiration)}
                              {expiring && !expired && " — bientôt"}
                              {expired && " — expiré"}
                            </span>
                          )}
                          {prescription.date_dispensation && (
                            <span className="flex items-center gap-1 text-medical-green">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Dispensé le{" "}
                              {formatDate(prescription.date_dispensation)}
                            </span>
                          )}
                        </div>

                        {/* Substitution générique */}
                        {prescription.substitution_generique && (
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium">
                              Substitution générique :
                            </span>{" "}
                            {prescription.substitution_generique}
                          </p>
                        )}
                      </div>

                      {/* Right: actions */}
                      <div className="flex gap-2 shrink-0 self-start">
                        {canDispense && (
                          <Button
                            variant="medical"
                            size="sm"
                            onClick={() =>
                              openDispensationDialog(prescription)
                            }
                          >
                            <FlaskConical className="h-4 w-4 mr-1.5" />
                            Valider dispensation
                          </Button>
                        )}
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/patients/${patient.npi}`}>
                            <User className="h-4 w-4 mr-1.5" />
                            Dossier
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Dispensation dialog */}
      <Dialog
        open={!!dispensationTarget}
        onOpenChange={(open) => {
          if (!open) closeDispensationDialog();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-medical-green" />
              Valider la dispensation
            </DialogTitle>
            <DialogDescription>
              Confirmez la dispensation du médicament au patient.
            </DialogDescription>
          </DialogHeader>

          {dispensationTarget && (
            <div className="space-y-4 py-1">
              {/* Prescription summary */}
              <div className="rounded-lg bg-muted/60 p-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-base">
                    {dispensationTarget.medicament_dci}
                  </span>
                  <span className="text-muted-foreground">
                    {dispensationTarget.dosage}
                    {dispensationTarget.forme &&
                      ` — ${dispensationTarget.forme}`}
                  </span>
                </div>
                <p>
                  <span className="font-medium">Posologie :</span>{" "}
                  {dispensationTarget.posologie}
                </p>
                <p>
                  <span className="font-medium">Durée :</span>{" "}
                  {dispensationTarget.duree}
                </p>
                <div className="pt-1 border-t flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {dispensationTarget.patients.nom}{" "}
                    {dispensationTarget.patients.prenom}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground bg-background px-2 py-0.5 rounded">
                    {dispensationTarget.patients.npi}
                  </span>
                </div>
                <p className="text-muted-foreground">
                  Prescrit le{" "}
                  {formatDate(dispensationTarget.date_prescription)}
                </p>
              </div>

              {/* Substitution générique field */}
              <div className="space-y-1.5">
                <Label htmlFor="substitution_generique">
                  Substitution générique{" "}
                  <span className="text-muted-foreground font-normal">
                    (optionnel)
                  </span>
                </Label>
                <Textarea
                  id="substitution_generique"
                  placeholder="Nom du générique dispensé si différent du princeps..."
                  value={substitution}
                  onChange={(e) => setSubstitution(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeDispensationDialog}
              disabled={dispensing}
            >
              Annuler
            </Button>
            <Button
              variant="medical"
              onClick={handleValiderDispensation}
              disabled={dispensing}
            >
              {dispensing ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Validation...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirmer la dispensation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
