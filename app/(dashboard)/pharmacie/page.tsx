"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useUser } from "@/hooks/use-user";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pill, Package, Clock, CheckCircle2, AlertTriangle, AlertOctagon,
  ChevronRight, ArrowLeftRight, Store, RefreshCw, CalendarDays,
  TrendingUp, Archive, User,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrdonnanceUrgente {
  id: string;
  medicament_dci: string;
  statut: string;
  date_expiration: string | null;
  quantite: number | null;
  unite: string | null;
  patientNom: string;
  patientImu: string | null;
}

interface DispensationRecente {
  id: string;
  medicament_dci: string;
  date_dispensation: string;
  substitution_generique: string | null;
  patientNom: string;
  pharmacieNom: string;
}

interface PharmacieStats {
  pharmacieId: string | null;
  enAttente: number;
  partiellement: number;
  dispensees_auj: number;
  expirant_urgent: number;
  stock_faible: number;
  ordonnances_urgentes: OrdonnanceUrgente[];
  dispensations_recentes: DispensationRecente[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function formatRelativeTime(iso: string): string {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diffMin < 1)   return "À l'instant";
  if (diffMin < 60)  return `Il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24)    return `Il y a ${diffH}h`;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" })
    .format(new Date(iso));
}

function ExpiryBadge({ date }: { date: string | null }) {
  const days = daysUntil(date);
  if (days === null) return null;
  if (days < 0)  return <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Expirée</span>;
  if (days === 0) return <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">Aujourd&apos;hui</span>;
  if (days <= 3)  return <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Dans {days}j</span>;
  return <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Dans {days}j</span>;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  value: number;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  href?: string;
  alert?: "warning" | "danger" | null;
  loading?: boolean;
}

function KpiCard({ title, value, sub, icon: Icon, iconBg, iconColor, href, alert, loading }: KpiCardProps) {
  const border =
    alert === "danger"  ? "border-red-200 bg-red-50/60"   :
    alert === "warning" ? "border-amber-200 bg-amber-50/60" :
    "border-border bg-card";
  const num =
    alert === "danger"  ? "text-red-700"   :
    alert === "warning" ? "text-amber-700" :
    "text-foreground";

  const card = (
    <Card className={`group relative overflow-hidden border transition-all hover:shadow-md ${border} ${href ? "cursor-pointer" : ""}`}>
      {alert && (
        <span className={`absolute top-3 right-3 h-2 w-2 rounded-full ${alert === "danger" ? "bg-red-500" : "bg-amber-500"} animate-pulse`} />
      )}
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {loading ? (
              <>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32 mb-1.5" />
                <Skeleton className="h-3 w-20" />
              </>
            ) : (
              <>
                <p className={`text-3xl font-bold tracking-tight tabular-nums ${num}`}>{value.toLocaleString("fr-FR")}</p>
                <p className="text-sm font-medium text-foreground/80 mt-1 leading-tight">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
              </>
            )}
          </div>
          <div className={`p-2.5 rounded-xl shrink-0 ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
        {href && !loading && (
          <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
            <span>Voir détails</span>
            <ChevronRight className="h-3 w-3" />
          </div>
        )}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PharmacieDashboardPage() {
  const { user, loading: userLoading } = useUser();
  const [stats, setStats]       = useState<PharmacieStats | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [refreshing, setRefresh] = useState(false);

  const loadStats = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefresh(true);
    setError(false);
    try {
      const res = await fetch("/api/pharmacie/stats");
      if (res.ok) setStats(await res.json());
      else setError(true);
    } catch { setError(true); }
    finally { setLoading(false); setRefresh(false); }
  }, []);

  useEffect(() => { if (user) loadStats(); }, [user, loadStats]);

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir";
  })();

  const todayLong = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const hasUrgent = (stats?.expirant_urgent ?? 0) > 0;
  const hasStockAlert = (stats?.stock_faible ?? 0) > 0;

  return (
    <div className="flex flex-col min-h-full bg-muted/20">
      <Header title="Ma pharmacie" />

      <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto w-full">

        {/* ── HERO ──────────────────────────────────────────────────────────── */}
        <div className="rounded-2xl bg-gradient-to-br from-purple-700 via-purple-700 to-violet-800 text-white overflow-hidden relative shadow-md">
          <div
            className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 60%, white 1.5px, transparent 1.5px), radial-gradient(circle at 80% 20%, white 1.5px, transparent 1.5px)",
              backgroundSize: "48px 48px",
            }}
          />
          <div className="relative p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              {userLoading ? (
                <>
                  <Skeleton className="h-7 w-64 bg-white/20" />
                  <Skeleton className="h-5 w-48 bg-white/15 mt-1" />
                </>
              ) : (
                <>
                  <h2 className="text-xl sm:text-2xl font-bold leading-tight">
                    {greeting}, {user?.prenom} {user?.nom}
                  </h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs bg-white/20 text-white px-2.5 py-0.5 rounded-full font-medium border border-white/20">
                      Pharmacien
                    </span>
                    {!loading && stats?.pharmacieId && (
                      <span className="text-xs bg-white/15 text-white/80 px-2.5 py-0.5 rounded-full border border-white/10 flex items-center gap-1">
                        <Store className="h-3 w-3" />
                        Pharmacie active
                      </span>
                    )}
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-white/65 pt-0.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {todayLong}
                  </p>
                </>
              )}
            </div>
            <div className="flex gap-2 shrink-0 flex-wrap">
              <Button asChild className="bg-white text-purple-700 hover:bg-white/90 font-semibold shadow-none">
                <Link href="/prescriptions">
                  <Pill className="h-4 w-4 mr-2" />
                  Ordonnances
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-white/30 text-white hover:bg-white/10 bg-transparent font-semibold shadow-none">
                <Link href="/inventaire">
                  <Archive className="h-4 w-4 mr-2" />
                  Inventaire
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* ── ALERTES ───────────────────────────────────────────────────────── */}
        {!loading && (hasUrgent || hasStockAlert) && (
          <div className="flex flex-col sm:flex-row gap-3">
            {hasUrgent && (
              <Link href="/prescriptions" className="flex-1">
                <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3.5 hover:bg-amber-100 transition-colors">
                  <div className="p-1.5 rounded-lg bg-amber-100 shrink-0">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-900">
                      {stats?.expirant_urgent} ordonnance{(stats?.expirant_urgent ?? 0) > 1 ? "s expirent" : " expire"} dans 3 jours
                    </p>
                    <p className="text-xs text-amber-700">Dispensation urgente requise</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-amber-500 shrink-0" />
                </div>
              </Link>
            )}
            {hasStockAlert && (
              <Link href="/inventaire" className="flex-1">
                <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 p-3.5 hover:bg-red-100 transition-colors">
                  <div className="p-1.5 rounded-lg bg-red-100 shrink-0">
                    <AlertOctagon className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-red-900">
                      {stats?.stock_faible} médicament{(stats?.stock_faible ?? 0) > 1 ? "s" : ""} en stock faible
                    </p>
                    <p className="text-xs text-red-700">Réapprovisionnement à planifier</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-red-500 shrink-0" />
                </div>
              </Link>
            )}
          </div>
        )}

        {/* ── KPIs ──────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard
            title="Ordonnances à dispenser"
            sub="En attente"
            value={stats?.enAttente ?? 0}
            icon={Pill}
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
            href="/prescriptions"
            alert={(stats?.enAttente ?? 0) > 0 ? "warning" : null}
            loading={loading}
          />
          <KpiCard
            title="Partiellement dispensées"
            sub="À compléter"
            value={stats?.partiellement ?? 0}
            icon={Package}
            iconBg="bg-amber-100"
            iconColor="text-amber-600"
            href="/prescriptions"
            alert={(stats?.partiellement ?? 0) > 0 ? "warning" : null}
            loading={loading}
          />
          <KpiCard
            title="Dispensées aujourd'hui"
            sub="Cette pharmacie"
            value={stats?.dispensees_auj ?? 0}
            icon={CheckCircle2}
            iconBg="bg-emerald-100"
            iconColor="text-emerald-600"
            loading={loading}
          />
          <KpiCard
            title="Stock faible"
            sub="Sous le seuil d'alerte"
            value={stats?.stock_faible ?? 0}
            icon={Archive}
            iconBg={(stats?.stock_faible ?? 0) > 0 ? "bg-red-100" : "bg-slate-100"}
            iconColor={(stats?.stock_faible ?? 0) > 0 ? "text-red-600" : "text-slate-500"}
            href="/inventaire"
            alert={(stats?.stock_faible ?? 0) > 0 ? "danger" : null}
            loading={loading}
          />
        </div>

        {/* ── MAIN ──────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* File d'attente urgente */}
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                Ordonnances urgentes (7j)
              </CardTitle>
              <Link href="/prescriptions">
                <Button variant="ghost" size="sm" className="h-6 text-xs gap-0.5 text-muted-foreground hover:text-foreground px-2">
                  Tout voir <ChevronRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="px-2 pb-3 pt-1">
              {loading ? (
                <div className="space-y-2 px-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="flex items-center gap-3 py-2">
                      <Skeleton className="h-8 w-8 rounded-lg" />
                      <div className="flex-1 space-y-1.5"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-3 w-24" /></div>
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                  <AlertTriangle className="h-4 w-4 mr-2 text-amber-400" />
                  Erreur de chargement
                </div>
              ) : !stats?.ordonnances_urgentes.length ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mb-2 opacity-20 text-emerald-500" />
                  <p className="text-sm font-medium">Aucune ordonnance urgente</p>
                  <p className="text-xs mt-1 opacity-60">Toutes les ordonnances sont à jour</p>
                </div>
              ) : (
                stats.ordonnances_urgentes.map(o => (
                  <Link key={o.id} href="/prescriptions">
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors group">
                      <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 shrink-0">
                        <Pill className="h-3.5 w-3.5 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{o.medicament_dci}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <User className="h-3 w-3" />{o.patientNom}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <ExpiryBadge date={o.date_expiration} />
                        {o.statut === "partiellement_dispense" && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Partiel</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          {/* Dispensations récentes */}
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5" />
                Dispensations récentes
              </CardTitle>
              <Button
                variant="ghost" size="icon-sm"
                onClick={() => loadStats(true)}
                disabled={refreshing}
                className="h-6 w-6"
                title="Actualiser"
              >
                <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                      <div className="flex-1 space-y-1.5"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-3 w-24" /></div>
                      <Skeleton className="h-3 w-16 shrink-0" />
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mb-2 opacity-40 text-amber-500" />
                  <p className="text-sm font-medium">Erreur de chargement</p>
                  <Button variant="outline" size="sm" onClick={() => loadStats()} className="mt-3 text-xs">
                    <RefreshCw className="h-3 w-3 mr-1.5" />Réessayer
                  </Button>
                </div>
              ) : !stats?.dispensations_recentes.length ? (
                <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
                  <Clock className="h-10 w-10 mb-2.5 opacity-15" />
                  <p className="text-sm font-medium">Aucune dispensation récente</p>
                  <p className="text-xs mt-1 opacity-60">Les dispensations apparaîtront ici</p>
                </div>
              ) : (
                <ul>
                  {stats.dispensations_recentes.map((d, i) => (
                    <li key={i} className="flex items-center gap-3 px-4 py-3.5 border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <div className="p-2 rounded-lg bg-purple-100 shrink-0">
                        <Package className="h-3.5 w-3.5 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{d.medicament_dci}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <p className="text-xs text-muted-foreground truncate">{d.patientNom}</p>
                          {d.substitution_generique && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
                              <ArrowLeftRight className="h-2.5 w-2.5" />
                              Substitution
                            </Badge>
                          )}
                        </div>
                      </div>
                      <time className="text-xs text-muted-foreground shrink-0 tabular-nums">
                        {formatRelativeTime(d.date_dispensation)}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
