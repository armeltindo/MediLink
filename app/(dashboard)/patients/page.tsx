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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  UserPlus, Search, Filter, AlertTriangle, Calendar, Phone, User,
  ChevronLeft, ChevronRight, X,
} from "lucide-react";

const PAGE_SIZE_OPTIONS = [25, 50, 100];

interface Filters {
  sexe: string;
  groupe_sanguin: string;
  age_min: string;
  age_max: string;
}

export default function PatientsPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(initialQuery);
  const [allergiesCount, setAllergiesCount] = useState<Record<string, number>>({});

  // Filters
  const [filters, setFilters] = useState<Filters>({ sexe: "", groupe_sanguin: "", age_min: "", age_max: "" });
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  const fetchPatients = useCallback(async (q: string, f: Filters, p: number, ps: number) => {
    setLoading(true);
    let req = supabase
      .from("patients")
      .select("*", { count: "exact" })
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(p * ps, p * ps + ps - 1);

    if (q.trim()) {
      req = req.or(`npi.ilike.%${q}%,nom.ilike.%${q}%,prenom.ilike.%${q}%`);
    }
    if (f.sexe) req = req.eq("sexe", f.sexe);
    if (f.groupe_sanguin) req = req.eq("groupe_sanguin", f.groupe_sanguin);

    // Age filter: convert to date range
    if (f.age_min || f.age_max) {
      const today = new Date();
      if (f.age_max) {
        const minDate = new Date(today);
        minDate.setFullYear(today.getFullYear() - parseInt(f.age_max) - 1);
        req = req.gte("date_naissance", minDate.toISOString().split("T")[0]);
      }
      if (f.age_min) {
        const maxDate = new Date(today);
        maxDate.setFullYear(today.getFullYear() - parseInt(f.age_min));
        req = req.lte("date_naissance", maxDate.toISOString().split("T")[0]);
      }
    }

    const { data, count } = await req;
    setPatients(data || []);
    setTotalCount(count || 0);

    if (data && data.length > 0) {
      const ids = data.map((p) => p.id);
      const { data: allergies } = await supabase
        .from("allergies")
        .select("patient_id")
        .in("patient_id", ids)
        .eq("actif", true)
        .is("deleted_at", null);

      const counts: Record<string, number> = {};
      allergies?.forEach((a) => { counts[a.patient_id] = (counts[a.patient_id] || 0) + 1; });
      setAllergiesCount(counts);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPatients(query, filters, page, pageSize);
  }, [page, pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(0);
    fetchPatients(query, filters, 0, pageSize);
  }

  function handleApplyFilters() {
    setPage(0);
    fetchPatients(query, filters, 0, pageSize);
  }

  function handleResetFilters() {
    const empty = { sexe: "", groupe_sanguin: "", age_min: "", age_max: "" };
    setFilters(empty);
    setPage(0);
    fetchPatients(query, empty, 0, pageSize);
  }

  const hasActiveFilters = filters.sexe || filters.groupe_sanguin || filters.age_min || filters.age_max;
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="flex flex-col h-full">
      <Header title="Patients" />

      <div className="p-6 space-y-4 flex-1">
        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-0 max-w-lg">
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
              <Search className="h-4 w-4" />
            </Button>
          </form>
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtres
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-medical-green rounded-full text-[10px] text-white flex items-center justify-center">
                {[filters.sexe, filters.groupe_sanguin, filters.age_min || filters.age_max].filter(Boolean).length}
              </span>
            )}
          </Button>
          <div className="ml-auto">
            <Button asChild variant="medical">
              <Link href="/patients/nouveau">
                <UserPlus className="h-4 w-4 mr-2" />
                Nouveau patient
              </Link>
            </Button>
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="bg-muted/40 border rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Sexe</label>
                <Select value={filters.sexe} onValueChange={(v) => setFilters({ ...filters, sexe: v === "all" ? "" : v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Tous" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="M">Hommes</SelectItem>
                    <SelectItem value="F">Femmes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Groupe sanguin</label>
                <Select value={filters.groupe_sanguin} onValueChange={(v) => setFilters({ ...filters, groupe_sanguin: v === "all" ? "" : v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Tous" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    {["A", "B", "AB", "O"].map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Âge minimum</label>
                <Input
                  type="number" min="0" max="120" placeholder="ex: 18"
                  value={filters.age_min}
                  onChange={(e) => setFilters({ ...filters, age_min: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Âge maximum</label>
                <Input
                  type="number" min="0" max="120" placeholder="ex: 65"
                  value={filters.age_max}
                  onChange={(e) => setFilters({ ...filters, age_max: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="medical" onClick={handleApplyFilters}>
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                Appliquer
              </Button>
              {hasActiveFilters && (
                <Button size="sm" variant="ghost" onClick={handleResetFilters}>
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Réinitialiser
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Results count + page size */}
        {!loading && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {totalCount.toLocaleString()} patient{totalCount > 1 ? "s" : ""}
              {query ? ` pour « ${query} »` : ""}
              {hasActiveFilters ? " (filtrés)" : ""}
              {totalPages > 1 ? ` — page ${page + 1}/${totalPages}` : ""}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Par page :</span>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}>
                <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
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
                      <span className="font-semibold text-foreground">{patient.prenom} {patient.nom}</span>
                      <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{patient.npi}</span>
                      {patient.groupe_sanguin && (
                        <span className={`text-xs text-white px-2 py-0.5 rounded-full font-bold ${getBloodGroupColor(patient.groupe_sanguin + patient.rhesus)}`}>
                          {patient.groupe_sanguin}{patient.rhesus}
                        </span>
                      )}
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
                {query || hasActiveFilters ? "Aucun résultat pour ces critères." : "Commencez par enregistrer un patient."}
              </p>
              {(query || hasActiveFilters) && (
                <Button variant="outline" onClick={handleResetFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Effacer les filtres
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Pagination controls */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              variant="outline" size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i;
                if (totalPages > 5) {
                  if (page <= 2) pageNum = i;
                  else if (page >= totalPages - 3) pageNum = totalPages - 5 + i;
                  else pageNum = page - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === page ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-8 p-0 text-xs"
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum + 1}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline" size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
