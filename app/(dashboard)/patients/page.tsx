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
  UserPlus, Search, SlidersHorizontal, AlertTriangle, Calendar,
  Phone, ChevronLeft, ChevronRight, X, Users, ArrowRight,
} from "lucide-react";

const PAGE_SIZE_OPTIONS = [25, 50, 100];

interface Filters {
  sexe: string;
  groupe_sanguin: string;
  age_min: string;
  age_max: string;
}

function PatientRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border bg-card">
      <Skeleton className="h-11 w-11 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-3 w-64" />
      </div>
      <Skeleton className="h-8 w-24 rounded-lg" />
    </div>
  );
}

export default function PatientsPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(initialQuery);
  const [allergiesCount, setAllergiesCount] = useState<Record<string, number>>({});

  const [filters, setFilters] = useState<Filters>({ sexe: "", groupe_sanguin: "", age_min: "", age_max: "" });
  const [showFilters, setShowFilters] = useState(false);

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
  const activeFilterCount = [filters.sexe, filters.groupe_sanguin, filters.age_min || filters.age_max].filter(Boolean).length;
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="flex flex-col h-full bg-muted/20">
      <Header title="Patients" />

      <div className="p-6 space-y-5 flex-1 max-w-7xl mx-auto w-full">

        {/* ── Toolbar ──────────────────────────────────────────── */}
        <div className="flex items-center gap-3 flex-wrap">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-0 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Rechercher par NPI, nom ou prénom…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 pr-8 bg-background"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(""); fetchPatients("", filters, 0, pageSize); setPage(0); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Button type="submit" variant="outline" className="shrink-0">
              Rechercher
            </Button>
          </form>

          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="relative gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtres
            {activeFilterCount > 0 && (
              <span className="h-5 w-5 rounded-full bg-white text-medical-green text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>

          <Button asChild variant="medical" className="ml-auto shrink-0">
            <Link href="/patients/nouveau">
              <UserPlus className="h-4 w-4 mr-2" />
              Nouveau patient
            </Link>
          </Button>
        </div>

        {/* ── Active filter chips ──────────────────────────────── */}
        {hasActiveFilters && !showFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Filtres actifs :</span>
            {filters.sexe && (
              <Badge variant="secondary" className="gap-1 pr-1">
                {filters.sexe === "M" ? "Hommes" : "Femmes"}
                <button onClick={() => { setFilters({ ...filters, sexe: "" }); handleApplyFilters(); }}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.groupe_sanguin && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Groupe {filters.groupe_sanguin}
                <button onClick={() => { setFilters({ ...filters, groupe_sanguin: "" }); handleApplyFilters(); }}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {(filters.age_min || filters.age_max) && (
              <Badge variant="secondary" className="gap-1 pr-1">
                {filters.age_min && filters.age_max
                  ? `${filters.age_min}–${filters.age_max} ans`
                  : filters.age_min
                  ? `≥ ${filters.age_min} ans`
                  : `≤ ${filters.age_max} ans`}
                <button onClick={() => { setFilters({ ...filters, age_min: "", age_max: "" }); handleApplyFilters(); }}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleResetFilters}>
              Tout effacer
            </Button>
          </div>
        )}

        {/* ── Filter panel ─────────────────────────────────────── */}
        {showFilters && (
          <div className="rounded-xl border bg-background shadow-sm p-4 space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filtres avancés</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Sexe</label>
                <Select value={filters.sexe || "all"} onValueChange={(v) => setFilters({ ...filters, sexe: v === "all" ? "" : v })}>
                  <SelectTrigger className="h-9 text-sm bg-muted/40"><SelectValue placeholder="Tous" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="M">Hommes</SelectItem>
                    <SelectItem value="F">Femmes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Groupe sanguin</label>
                <Select value={filters.groupe_sanguin || "all"} onValueChange={(v) => setFilters({ ...filters, groupe_sanguin: v === "all" ? "" : v })}>
                  <SelectTrigger className="h-9 text-sm bg-muted/40"><SelectValue placeholder="Tous" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    {["A", "B", "AB", "O"].map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Âge minimum</label>
                <Input
                  type="number" min="0" max="120" placeholder="ex: 18"
                  value={filters.age_min}
                  onChange={(e) => setFilters({ ...filters, age_min: e.target.value })}
                  className="h-9 text-sm bg-muted/40"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Âge maximum</label>
                <Input
                  type="number" min="0" max="120" placeholder="ex: 65"
                  value={filters.age_max}
                  onChange={(e) => setFilters({ ...filters, age_max: e.target.value })}
                  className="h-9 text-sm bg-muted/40"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" variant="medical" onClick={handleApplyFilters}>
                Appliquer les filtres
              </Button>
              {hasActiveFilters && (
                <Button size="sm" variant="ghost" onClick={handleResetFilters}>
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Réinitialiser
                </Button>
              )}
              <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setShowFilters(false)}>
                Fermer
              </Button>
            </div>
          </div>
        )}

        {/* ── Results meta ─────────────────────────────────────── */}
        {!loading && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>
                <strong className="text-foreground">{totalCount.toLocaleString("fr-FR")}</strong>{" "}
                patient{totalCount !== 1 ? "s" : ""}
                {query ? <> pour <em>« {query} »</em></> : ""}
                {hasActiveFilters ? " (filtrés)" : ""}
              </span>
              {totalPages > 1 && (
                <span className="text-xs bg-muted px-2 py-0.5 rounded-md">
                  Page {page + 1} / {totalPages}
                </span>
              )}
            </div>
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

        {/* ── Patient list ─────────────────────────────────────── */}
        <div className="space-y-2">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <PatientRowSkeleton key={i} />)
            : patients.map((patient) => {
                const isMale = patient.sexe === "M";
                const allergyCount = allergiesCount[patient.id] ?? 0;
                return (
                  <Link
                    key={patient.id}
                    href={`/patients/${patient.npi}`}
                    className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-accent hover:border-medical-green/30 transition-all duration-150 group shadow-sm hover:shadow-md"
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <Avatar className="h-11 w-11">
                        <AvatarImage src={patient.photo_url || ""} alt={patient.nom} />
                        <AvatarFallback
                          className={`font-semibold text-sm ${
                            isMale
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                              : "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300"
                          }`}
                        >
                          {patient.prenom?.[0]}{patient.nom?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      {/* Sex dot */}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card text-[8px] font-bold flex items-center justify-center text-white ${
                          isMale ? "bg-blue-500" : "bg-pink-500"
                        }`}
                      >
                        {patient.sexe}
                      </span>
                    </div>

                    {/* Identity */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">
                          {patient.prenom} {patient.nom}
                        </span>
                        <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                          {patient.npi}
                        </code>
                        {patient.groupe_sanguin && (
                          <span
                            className={`text-xs text-white px-2 py-0.5 rounded-full font-bold ${getBloodGroupColor(
                              patient.groupe_sanguin + patient.rhesus,
                            )}`}
                          >
                            {patient.groupe_sanguin}{patient.rhesus}
                          </span>
                        )}
                        {allergyCount > 0 && (
                          <Badge variant="danger" className="gap-1 text-xs">
                            <AlertTriangle className="h-3 w-3" />
                            {allergyCount} allergie{allergyCount > 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(patient.date_naissance)}
                          <span className="text-muted-foreground/60">·</span>
                          {formatAge(patient.date_naissance)}
                        </span>
                        {patient.contact_urgence_tel && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {patient.contact_urgence_tel}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* CTA */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-medical-green"
                    >
                      Dossier
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                );
              })}

          {/* Empty state */}
          {!loading && patients.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Aucun patient trouvé</h3>
              <p className="text-muted-foreground text-sm mb-5 max-w-xs">
                {query || hasActiveFilters
                  ? "Aucun résultat ne correspond à vos critères de recherche."
                  : "Commencez par enregistrer un premier patient."}
              </p>
              {query || hasActiveFilters ? (
                <Button variant="outline" onClick={handleResetFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Effacer les filtres
                </Button>
              ) : (
                <Button asChild variant="medical">
                  <Link href="/patients/nouveau">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Nouveau patient
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>

        {/* ── Pagination ───────────────────────────────────────── */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalCount)} sur {totalCount.toLocaleString("fr-FR")}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline" size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
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
                    variant={pageNum === page ? "default" : "ghost"}
                    size="sm"
                    className="h-8 w-8 p-0 text-xs"
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum + 1}
                  </Button>
                );
              })}
              <Button
                variant="outline" size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
