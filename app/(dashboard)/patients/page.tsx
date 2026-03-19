"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Patient } from "@/types";
import { formatDate, formatAge, getBloodGroupColor, cn } from "@/lib/utils";
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
  ArrowUpDown, Clock,
} from "lucide-react";
import { useUser } from "@/hooks/use-user";

// ─── Types ────────────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [25, 50, 100];

type SortOption = "created_desc" | "created_asc" | "nom_asc" | "nom_desc" | "age_asc" | "age_desc";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "created_desc", label: "Plus récents" },
  { value: "created_asc",  label: "Plus anciens" },
  { value: "nom_asc",      label: "Nom A → Z"    },
  { value: "nom_desc",     label: "Nom Z → A"    },
  { value: "age_asc",      label: "Plus âgés"    },
  { value: "age_desc",     label: "Plus jeunes"  },
];

const SORT_MAP: Record<SortOption, { column: string; ascending: boolean }> = {
  created_desc: { column: "created_at",    ascending: false },
  created_asc:  { column: "created_at",    ascending: true  },
  nom_asc:      { column: "nom",           ascending: true  },
  nom_desc:     { column: "nom",           ascending: false },
  age_asc:      { column: "date_naissance", ascending: true  },
  age_desc:     { column: "date_naissance", ascending: false },
};

interface Filters {
  sexe: string;
  groupe_sanguin: string;
  age_min: string;
  age_max: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeDate(iso: string): string {
  const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7)  return `Il y a ${diffDays} j`;
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} sem.`;
  return formatDate(iso);
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function PatientRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border bg-card">
      <Skeleton className="h-11 w-11 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-3 w-64" />
      </div>
      <Skeleton className="h-3 w-20 shrink-0" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PatientsPage() {
  const searchParams  = useSearchParams();
  const { user }      = useUser();
  const searchTimer   = useRef<ReturnType<typeof setTimeout>>();

  const [patients, setPatients]           = useState<Patient[]>([]);
  const [loading, setLoading]             = useState(true);
  const [query, setQuery]                 = useState(searchParams.get("q") || "");
  const [allergiesCount, setAllergiesCount] = useState<Record<string, number>>({});
  const [filters, setFilters]             = useState<Filters>({ sexe: "", groupe_sanguin: "", age_min: "", age_max: "" });
  const [showFilters, setShowFilters]     = useState(false);
  const [sort, setSort]                   = useState<SortOption>("created_desc");
  const [page, setPage]                   = useState(0);
  const [pageSize, setPageSize]           = useState(50);
  const [totalCount, setTotalCount]       = useState(0);

  const canCreate = user && ["medecin", "admin_etablissement", "super_admin"].includes(user.role);

  // ─── Fetch ──────────────────────────────────────────────────────────────────

  const fetchPatients = useCallback(async (
    q: string, f: Filters, p: number, ps: number, s: SortOption,
  ) => {
    setLoading(true);
    const { column, ascending } = SORT_MAP[s];

    let req = supabase
      .from("patients")
      .select("*", { count: "exact" })
      .is("deleted_at", null)
      .order(column, { ascending })
      .range(p * ps, p * ps + ps - 1);

    if (q.trim()) req = req.or(`npi.ilike.%${q}%,nom.ilike.%${q}%,prenom.ilike.%${q}%`);
    if (f.sexe)           req = req.eq("sexe", f.sexe);
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
    } else {
      setAllergiesCount({});
    }
    setLoading(false);
  }, []);

  // initial load + page/pageSize/sort changes
  useEffect(() => {
    fetchPatients(query, filters, page, pageSize, sort);
  }, [page, pageSize, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Handlers ───────────────────────────────────────────────────────────────

  /** Debounced search-as-you-type (350 ms) */
  function handleQueryChange(value: string) {
    setQuery(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(0);
      fetchPatients(value, filters, 0, pageSize, sort);
    }, 350);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    clearTimeout(searchTimer.current);
    setPage(0);
    fetchPatients(query, filters, 0, pageSize, sort);
  }

  /** Apply new filters immediately (avoids stale-closure bug) */
  function applyFilters(newFilters: Filters) {
    setFilters(newFilters);
    setPage(0);
    fetchPatients(query, newFilters, 0, pageSize, sort);
  }

  function handleResetFilters() {
    const empty: Filters = { sexe: "", groupe_sanguin: "", age_min: "", age_max: "" };
    applyFilters(empty);
  }

  function handleSortChange(s: SortOption) {
    setSort(s);
    setPage(0);
    // useEffect on sort will trigger the fetch
  }

  const hasActiveFilters   = !!(filters.sexe || filters.groupe_sanguin || filters.age_min || filters.age_max);
  const activeFilterCount  = [filters.sexe, filters.groupe_sanguin, filters.age_min || filters.age_max].filter(Boolean).length;
  const totalPages         = Math.ceil(totalCount / pageSize);

  // ─── Pill button helper ──────────────────────────────────────────────────────
  function PillButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "px-3 py-1 text-xs rounded-full border font-medium transition-all",
          active
            ? "bg-medical-green text-white border-medical-green shadow-sm"
            : "border-border text-muted-foreground hover:border-medical-green/60 hover:text-foreground",
        )}
      >
        {children}
      </button>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-full bg-muted/20">
      <Header title="Patients" />

      <div className="p-4 sm:p-6 space-y-4 flex-1 max-w-7xl mx-auto w-full">

        {/* ── Toolbar ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 flex-wrap">

          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-0 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Rechercher par NPI, nom ou prénom…"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                className="pl-9 pr-8 bg-background"
                autoComplete="off"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => handleQueryChange("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Effacer la recherche"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </form>

          {/* Filters toggle */}
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="relative gap-2 shrink-0"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtres
            {activeFilterCount > 0 && (
              <span className="h-5 w-5 rounded-full bg-white text-medical-green text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {/* Nouveau patient */}
          {canCreate && (
            <Button asChild variant="medical" className="ml-auto shrink-0">
              <Link href="/patients/nouveau">
                <UserPlus className="h-4 w-4 mr-2" />
                Nouveau patient
              </Link>
            </Button>
          )}
        </div>

        {/* ── Active filter chips ───────────────────────────────────── */}
        {hasActiveFilters && !showFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Filtres actifs :</span>
            {filters.sexe && (
              <Badge variant="secondary" className="gap-1 pr-1 text-xs">
                {filters.sexe === "M" ? "Hommes" : "Femmes"}
                <button
                  onClick={() => applyFilters({ ...filters, sexe: "" })}
                  className="hover:text-destructive transition-colors"
                  aria-label="Retirer filtre sexe"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.groupe_sanguin && (
              <Badge variant="secondary" className="gap-1 pr-1 text-xs">
                Groupe {filters.groupe_sanguin}
                <button
                  onClick={() => applyFilters({ ...filters, groupe_sanguin: "" })}
                  className="hover:text-destructive transition-colors"
                  aria-label="Retirer filtre groupe sanguin"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {(filters.age_min || filters.age_max) && (
              <Badge variant="secondary" className="gap-1 pr-1 text-xs">
                {filters.age_min && filters.age_max
                  ? `${filters.age_min}–${filters.age_max} ans`
                  : filters.age_min ? `≥ ${filters.age_min} ans` : `≤ ${filters.age_max} ans`}
                <button
                  onClick={() => applyFilters({ ...filters, age_min: "", age_max: "" })}
                  className="hover:text-destructive transition-colors"
                  aria-label="Retirer filtre âge"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={handleResetFilters}>
              Tout effacer
            </Button>
          </div>
        )}

        {/* ── Filter panel ──────────────────────────────────────────── */}
        {showFilters && (
          <div className="rounded-xl border bg-background shadow-sm p-5 space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Filtres avancés
              </p>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowFilters(false)}>
                <X className="h-3.5 w-3.5 mr-1" />
                Fermer
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

              {/* Sexe — pill buttons */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground/80">Sexe</label>
                <div className="flex gap-1.5 flex-wrap">
                  <PillButton active={filters.sexe === ""} onClick={() => setFilters({ ...filters, sexe: "" })}>Tous</PillButton>
                  <PillButton active={filters.sexe === "M"} onClick={() => setFilters({ ...filters, sexe: "M" })}>Hommes</PillButton>
                  <PillButton active={filters.sexe === "F"} onClick={() => setFilters({ ...filters, sexe: "F" })}>Femmes</PillButton>
                </div>
              </div>

              {/* Groupe sanguin — pill buttons */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground/80">Groupe sanguin</label>
                <div className="flex gap-1.5 flex-wrap">
                  {["", "A", "B", "AB", "O"].map((g) => (
                    <PillButton
                      key={g || "all"}
                      active={filters.groupe_sanguin === g}
                      onClick={() => setFilters({ ...filters, groupe_sanguin: g })}
                    >
                      {g || "Tous"}
                    </PillButton>
                  ))}
                </div>
              </div>

              {/* Âge minimum */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground/80">Âge minimum</label>
                <Input
                  type="number" min="0" max="120" placeholder="ex : 18"
                  value={filters.age_min}
                  onChange={(e) => setFilters({ ...filters, age_min: e.target.value })}
                  className="h-9 text-sm bg-muted/40"
                />
              </div>

              {/* Âge maximum */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground/80">Âge maximum</label>
                <Input
                  type="number" min="0" max="120" placeholder="ex : 65"
                  value={filters.age_max}
                  onChange={(e) => setFilters({ ...filters, age_max: e.target.value })}
                  className="h-9 text-sm bg-muted/40"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t">
              <Button size="sm" variant="medical" onClick={() => applyFilters(filters)}>
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

        {/* ── Meta bar ─────────────────────────────────────────────── */}
        {!loading && (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4 shrink-0" />
              <span>
                <strong className="text-foreground font-semibold">{totalCount.toLocaleString("fr-FR")}</strong>{" "}
                patient{totalCount !== 1 ? "s" : ""}
                {query && <> pour <em className="not-italic font-medium text-foreground">« {query} »</em></>}
                {hasActiveFilters && <span className="text-xs ml-1 text-muted-foreground">(filtré{totalCount > 1 ? "s" : ""})</span>}
              </span>
              {totalPages > 1 && (
                <span className="text-xs bg-muted px-2 py-0.5 rounded-md shrink-0">
                  Page {page + 1} / {totalPages}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 ml-auto flex-wrap">
              {/* Sort */}
              <div className="flex items-center gap-1.5">
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <Select value={sort} onValueChange={(v) => handleSortChange(v as SortOption)}>
                  <SelectTrigger className="h-7 text-xs w-36 border-0 bg-muted/60 focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Page size */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Par page :</span>
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}>
                  <SelectTrigger className="h-7 w-16 text-xs border-0 bg-muted/60 focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((s) => (
                      <SelectItem key={s} value={String(s)} className="text-xs">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* ── Patient list ──────────────────────────────────────────── */}
        <div className="space-y-2">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <PatientRowSkeleton key={i} />)
            : patients.map((patient) => {
                const isMale       = patient.sexe === "M";
                const allergyCount = allergiesCount[patient.id] ?? 0;
                const bloodFull    = patient.groupe_sanguin
                  ? `${patient.groupe_sanguin}${patient.rhesus ?? ""}`
                  : null;

                return (
                  <Link
                    key={patient.id}
                    href={`/patients/${patient.npi}`}
                    className="group flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-accent hover:border-medical-green/30 hover:shadow-md transition-all duration-150 shadow-sm"
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <Avatar className="h-11 w-11">
                        <AvatarImage src={patient.photo_url || ""} alt={patient.nom} />
                        <AvatarFallback
                          className={cn(
                            "font-semibold text-sm",
                            isMale
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                              : "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
                          )}
                        >
                          {patient.prenom?.[0]}{patient.nom?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card text-[8px] font-bold flex items-center justify-center text-white",
                          isMale ? "bg-blue-500" : "bg-pink-500",
                        )}
                        aria-label={isMale ? "Homme" : "Femme"}
                      >
                        {patient.sexe}
                      </span>
                    </div>

                    {/* Identity */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">
                          {patient.prenom} <span className="uppercase">{patient.nom}</span>
                        </span>
                        <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                          {patient.npi}
                        </code>
                        {bloodFull && (
                          <span className={cn(
                            "text-xs text-white px-2 py-0.5 rounded-full font-bold",
                            getBloodGroupColor(bloodFull),
                          )}>
                            {bloodFull}
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
                          <Calendar className="h-3 w-3 shrink-0" />
                          {formatDate(patient.date_naissance)}
                          <span className="text-muted-foreground/40 mx-0.5">·</span>
                          <span className="font-medium text-foreground/70">{formatAge(patient.date_naissance)}</span>
                        </span>
                        {patient.contact_urgence_tel && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 shrink-0" />
                            {patient.contact_urgence_tel}
                          </span>
                        )}
                        <span className="flex items-center gap-1 ml-auto sm:ml-0">
                          <Clock className="h-3 w-3 shrink-0" />
                          {formatRelativeDate(patient.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-medical-green opacity-0 group-hover:opacity-100 transition-opacity">
                      Dossier
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </Link>
                );
              })}

          {/* Empty state */}
          {!loading && patients.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-muted-foreground opacity-40" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Aucun patient trouvé</h3>
              <p className="text-muted-foreground text-sm mb-5 max-w-xs">
                {query && hasActiveFilters
                  ? "Aucun résultat pour cette recherche avec les filtres actifs."
                  : query
                  ? `Aucun patient correspondant à « ${query} ».`
                  : hasActiveFilters
                  ? "Aucun patient ne correspond aux filtres sélectionnés."
                  : "Commencez par enregistrer un premier patient dans le système."}
              </p>
              {(query || hasActiveFilters) ? (
                <Button variant="outline" onClick={() => { handleQueryChange(""); handleResetFilters(); }}>
                  <X className="h-4 w-4 mr-2" />
                  Effacer la recherche et les filtres
                </Button>
              ) : canCreate ? (
                <Button asChild variant="medical">
                  <Link href="/patients/nouveau">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Enregistrer un patient
                  </Link>
                </Button>
              ) : null}
            </div>
          )}
        </div>

        {/* ── Pagination ────────────────────────────────────────────── */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              {(page * pageSize + 1).toLocaleString("fr-FR")}–{Math.min((page + 1) * pageSize, totalCount).toLocaleString("fr-FR")} sur{" "}
              <strong>{totalCount.toLocaleString("fr-FR")}</strong>
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline" size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="h-8 w-8 p-0"
                aria-label="Page précédente"
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
                    aria-label={`Page ${pageNum + 1}`}
                    aria-current={pageNum === page ? "page" : undefined}
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
                aria-label="Page suivante"
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
