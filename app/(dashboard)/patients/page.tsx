"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Patient } from "@/types";
import { formatDate, formatAge, getBloodGroupColor } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  UserPlus, Search, Filter, AlertTriangle, Calendar, Phone, User,
} from "lucide-react";

export default function PatientsPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(initialQuery);
  const [allergiesCount, setAllergiesCount] = useState<Record<string, number>>({});

  const fetchPatients = useCallback(async (q: string) => {
    setLoading(true);
    let req = supabase
      .from("patients")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (q.trim()) {
      req = req.or(
        `npi.ilike.%${q}%,nom.ilike.%${q}%,prenom.ilike.%${q}%`
      );
    }

    const { data } = await req;
    setPatients(data || []);

    if (data && data.length > 0) {
      const ids = data.map((p) => p.id);
      const { data: allergies } = await supabase
        .from("allergies")
        .select("patient_id")
        .in("patient_id", ids)
        .eq("actif", true)
        .is("deleted_at", null);

      const counts: Record<string, number> = {};
      allergies?.forEach((a) => {
        counts[a.patient_id] = (counts[a.patient_id] || 0) + 1;
      });
      setAllergiesCount(counts);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPatients(initialQuery);
  }, [initialQuery, fetchPatients]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchPatients(query);
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Patients" />

      <div className="p-6 space-y-4 flex-1">
        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2 max-w-lg">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="NPI, nom, prénom..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="outline">
              <Filter className="h-4 w-4 mr-1" />
              Filtrer
            </Button>
          </form>
          <div className="ml-auto">
            <Button asChild variant="medical">
              <Link href="/patients/nouveau">
                <UserPlus className="h-4 w-4 mr-2" />
                Nouveau patient
              </Link>
            </Button>
          </div>
        </div>

        {/* Results count */}
        {!loading && (
          <p className="text-sm text-muted-foreground">
            {patients.length} patient{patients.length > 1 ? "s" : ""} trouvé{patients.length > 1 ? "s" : ""}
            {query ? ` pour « ${query} »` : ""}
          </p>
        )}

        {/* Patient list */}
        <div className="grid gap-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg border bg-card">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))
            : patients.map((patient) => (
                <Link
                  key={patient.id}
                  href={`/patients/${patient.npi}`}
                  className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent transition-colors group"
                >
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarImage src={patient.photo_url || ""} alt={patient.nom} />
                    <AvatarFallback className="bg-medical-green-light text-medical-green font-semibold">
                      {patient.prenom?.[0]}{patient.nom?.[0]}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">
                        {patient.prenom} {patient.nom}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        {patient.npi}
                      </span>
                      {/* Blood group badge */}
                      {patient.groupe_sanguin && (
                        <span className={`text-xs text-white px-2 py-0.5 rounded-full font-bold ${getBloodGroupColor(patient.groupe_sanguin + patient.rhesus)}`}>
                          {patient.groupe_sanguin}{patient.rhesus}
                        </span>
                      )}
                      {/* Allergie warning */}
                      {allergiesCount[patient.id] > 0 && (
                        <Badge variant="danger" className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {allergiesCount[patient.id]} allergie{allergiesCount[patient.id] > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {patient.sexe === "M" ? "Homme" : "Femme"} — {formatAge(patient.date_naissance)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Né le {formatDate(patient.date_naissance)}
                      </span>
                      {patient.contact_urgence_tel && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          {patient.contact_urgence_tel}
                        </span>
                      )}
                    </div>
                  </div>

                  <Button variant="outline" size="sm" className="shrink-0 group-hover:border-medical-green group-hover:text-medical-green">
                    Voir dossier
                  </Button>
                </Link>
              ))}

          {!loading && patients.length === 0 && (
            <div className="text-center py-16">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg">Aucun patient trouvé</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {query ? `Aucun résultat pour « ${query} »` : "Commencez par enregistrer un patient."}
              </p>
              <Button asChild variant="medical">
                <Link href="/patients/nouveau">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Enregistrer un patient
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
