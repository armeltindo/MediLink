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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Stethoscope,
  Search,
  Filter,
  Calendar,
  Building2,
  User,
  UserPlus,
  ClipboardList,
} from "lucide-react";

interface ConsultationRow {
  id: string;
  patient_id: string;
  medecin_id: string;
  etablissement_id: string;
  date_consultation: string;
  motif: string;
  diagnostic_principal: string | null;
  diagnostic_cim10: string | null;
  type_consultation: "externe" | "urgence" | "hospitalisation" | "teleconsultation";
  patients: {
    npi: string;
    nom: string;
    prenom: string;
  };
  etablissements: {
    nom: string;
  } | null;
  users_profiles: {
    nom: string;
    prenom: string;
    specialite: string | null;
  } | null;
}

const TYPE_LABELS: Record<string, string> = {
  externe: "Externe",
  urgence: "Urgence",
  hospitalisation: "Hospitalisation",
  teleconsultation: "Téléconsultation",
};

const TYPE_VARIANTS: Record<string, "default" | "danger" | "info" | "warning" | "medical"> = {
  externe: "medical",
  urgence: "danger",
  hospitalisation: "info",
  teleconsultation: "warning",
};

function ConsultationSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-3 w-28" />
      </div>
    </div>
  );
}

export default function ConsultationsPage() {
  const { user, loading: userLoading } = useUser();
  const [consultations, setConsultations] = useState<ConsultationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [etablissementFilter, setEtablissementFilter] = useState("");

  const isAdmin =
    user?.role === "super_admin" || user?.role === "admin_etablissement";

  const fetchConsultations = useCallback(
    async (query: string, from: string, to: string, etab: string) => {
      if (!user) return;
      setLoading(true);

      let req = supabase
        .from("consultations")
        .select(
          "*, patients!inner(npi, nom, prenom), etablissements(nom), users_profiles!consultations_medecin_id_fkey(nom, prenom, specialite)"
        )
        .is("deleted_at", null)
        .order("date_consultation", { ascending: false })
        .limit(50);

      if (!isAdmin) {
        req = req.eq("medecin_id", user.id);
      }

      if (query.trim()) {
        req = req.or(
          `patients.npi.ilike.%${query}%,patients.nom.ilike.%${query}%,patients.prenom.ilike.%${query}%`
        );
      }

      if (from) {
        req = req.gte("date_consultation", new Date(from).toISOString());
      }

      if (to) {
        const endOfDay = new Date(to);
        endOfDay.setHours(23, 59, 59, 999);
        req = req.lte("date_consultation", endOfDay.toISOString());
      }

      if (etab.trim()) {
        req = req.ilike("etablissements.nom", `%${etab}%`);
      }

      const { data } = await req;
      setConsultations((data as unknown as ConsultationRow[]) || []);
      setLoading(false);
    },
    [user, isAdmin]
  );

  useEffect(() => {
    if (user) {
      fetchConsultations("", "", "", "");
    }
  }, [user, fetchConsultations]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchConsultations(searchQuery, dateFrom, dateTo, etablissementFilter);
  }

  function handleReset() {
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
    setEtablissementFilter("");
    fetchConsultations("", "", "", "");
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Consultations" />

      <div className="p-6 space-y-5 flex-1">
        {/* Toolbar */}
        <div className="flex flex-wrap items-end gap-3">
          <form
            onSubmit={handleSearch}
            className="flex flex-wrap items-end gap-3 flex-1"
          >
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="NPI, nom ou prénom du patient..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
                title="Date de début"
              />
              <span className="text-muted-foreground text-sm">–</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
                title="Date de fin"
              />
            </div>
            <div className="relative min-w-[180px]">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Établissement..."
                value={etablissementFilter}
                onChange={(e) => setEtablissementFilter(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="outline">
              <Filter className="h-4 w-4 mr-1.5" />
              Filtrer
            </Button>
            {(searchQuery || dateFrom || dateTo || etablissementFilter) && (
              <Button type="button" variant="ghost" onClick={handleReset}>
                Réinitialiser
              </Button>
            )}
          </form>

          <Button asChild variant="medical">
            <Link href="/patients">
              <UserPlus className="h-4 w-4 mr-2" />
              Nouvelle consultation
            </Link>
          </Button>
        </div>

        {/* Results count */}
        {!loading && (
          <p className="text-sm text-muted-foreground">
            {consultations.length} consultation
            {consultations.length !== 1 ? "s" : ""} trouvée
            {consultations.length !== 1 ? "s" : ""}
            {!isAdmin && (
              <span className="ml-1 text-medical-green font-medium">
                (vos consultations)
              </span>
            )}
          </p>
        )}

        {/* List */}
        <div className="grid gap-3">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <ConsultationSkeleton key={i} />
            ))
          ) : consultations.length === 0 ? (
            <div className="text-center py-16">
              <Stethoscope className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg">Aucune consultation trouvée</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {searchQuery || dateFrom || dateTo || etablissementFilter
                  ? "Aucun résultat pour ces critères de recherche."
                  : "Les consultations apparaîtront ici une fois créées depuis les dossiers patients."}
              </p>
              <Button asChild variant="medical">
                <Link href="/patients">
                  <Search className="h-4 w-4 mr-2" />
                  Rechercher un patient
                </Link>
              </Button>
            </div>
          ) : (
            consultations.map((consultation) => {
              const medecin = consultation.users_profiles;
              const etab = consultation.etablissements;
              const patient = consultation.patients;

              return (
                <Card
                  key={consultation.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                      {/* Left: patient + details */}
                      <div className="flex-1 min-w-0 space-y-2">
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
                              TYPE_VARIANTS[consultation.type_consultation] ??
                              "default"
                            }
                          >
                            {TYPE_LABELS[consultation.type_consultation] ??
                              consultation.type_consultation}
                          </Badge>
                        </div>

                        {/* Motif */}
                        <p className="text-sm text-foreground">
                          <span className="font-medium">Motif :</span>{" "}
                          {consultation.motif}
                        </p>

                        {/* Diagnostic */}
                        {consultation.diagnostic_principal && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm">
                              <span className="font-medium">Diagnostic :</span>{" "}
                              {consultation.diagnostic_principal}
                            </span>
                            {consultation.diagnostic_cim10 && (
                              <span className="text-xs font-mono bg-medical-blue/10 text-medical-blue border border-medical-blue/20 px-2 py-0.5 rounded">
                                {consultation.diagnostic_cim10}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Meta row */}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDateTime(consultation.date_consultation)}
                          </span>
                          {medecin && (
                            <span className="flex items-center gap-1">
                              <User className="h-3.5 w-3.5" />
                              Dr {medecin.prenom} {medecin.nom}
                              {medecin.specialite && (
                                <span className="text-muted-foreground/70">
                                  — {medecin.specialite}
                                </span>
                              )}
                            </span>
                          )}
                          {etab && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3.5 w-3.5" />
                              {etab.nom}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: link to patient file */}
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="shrink-0 self-start"
                      >
                        <Link href={`/patients/${patient.npi}`}>
                          <ClipboardList className="h-4 w-4 mr-1.5" />
                          Dossier
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
