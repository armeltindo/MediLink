"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useUser } from "@/hooks/use-user";
import { getRoleBadge } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Users, Stethoscope, Pill, FlaskConical, AlertTriangle,
  Clock, UserPlus, Activity, CalendarDays, ArrowUpRight,
  BedDouble, Eye, Package, Syringe, Video, ClipboardCheck,
  Zap, AlertOctagon, ChevronRight, TrendingUp, FileText,
  RefreshCw,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface RdvItem {
  id: string;
  date_heure: string;
  type_rdv: string;
  statut: string;
  patientNom: string;
}

interface DashboardStats {
  patientsToday: number;
  consultationsWeek: number;
  prescriptionsExpiring: number;
  analysesEnAttente: number;
  rendezVousAujourdhui: number;
  hospitalisationsEnCours: number;
  recentActivity: Array<{ action: string; patientNom: string; timestamp: string }>;
  rendezVousDuJour: RdvItem[];
}

// ─── Metadata maps ────────────────────────────────────────────────────────────

const ACTION_META: Record<string, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
}> = {
  view_patient:          { label: "Dossier consulté",      icon: Eye,          iconColor: "text-blue-600",    iconBg: "bg-blue-100"    },
  create_patient:        { label: "Patient enregistré",    icon: UserPlus,     iconColor: "text-emerald-600", iconBg: "bg-emerald-100" },
  create_consultation:   { label: "Consultation créée",    icon: Stethoscope,  iconColor: "text-violet-600",  iconBg: "bg-violet-100"  },
  create_prescription:   { label: "Prescription émise",    icon: Pill,         iconColor: "text-amber-600",   iconBg: "bg-amber-100"   },
  dispense_medication:   { label: "Médicament dispensé",   icon: Package,      iconColor: "text-rose-600",    iconBg: "bg-rose-100"    },
  create_analyse:        { label: "Analyse prescrite",     icon: FlaskConical, iconColor: "text-cyan-600",    iconBg: "bg-cyan-100"    },
  create_vaccination:    { label: "Vaccination réalisée",  icon: Syringe,      iconColor: "text-teal-600",    iconBg: "bg-teal-100"    },
  update_patient:        { label: "Dossier mis à jour",    icon: FileText,     iconColor: "text-slate-600",   iconBg: "bg-slate-100"   },
  emergency_access:      { label: "Accès d'urgence",       icon: AlertOctagon, iconColor: "text-red-600",     iconBg: "bg-red-100"     },
};

const TYPE_RDV_META: Record<string, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  dotColor: string;
  badgeBg: string;
}> = {
  consultation:     { label: "Consultation",   icon: Stethoscope,    dotColor: "bg-blue-500",    badgeBg: "bg-blue-50 text-blue-700"    },
  suivi:            { label: "Suivi",          icon: ClipboardCheck, dotColor: "bg-emerald-500", badgeBg: "bg-emerald-50 text-emerald-700" },
  urgence:          { label: "Urgence",        icon: Zap,            dotColor: "bg-red-500",     badgeBg: "bg-red-50 text-red-700"      },
  teleconsultation: { label: "Téléconsult.",   icon: Video,          dotColor: "bg-violet-500",  badgeBg: "bg-violet-50 text-violet-700" },
  bilan:            { label: "Bilan",          icon: FlaskConical,   dotColor: "bg-amber-500",   badgeBg: "bg-amber-50 text-amber-700"  },
};

const QUICK_ACTIONS = [
  { href: "/patients/nouveau", label: "Nouveau patient",    icon: UserPlus,    roles: ["medecin", "admin_etablissement", "super_admin"],                                            iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
  { href: "/patients",         label: "Rechercher patient", icon: Users,       roles: ["medecin", "infirmier", "laborantin", "pharmacien", "super_admin", "admin_etablissement"],   iconColor: "text-blue-600",    iconBg: "bg-blue-50"    },
  { href: "/rendez-vous",      label: "Rendez-vous",        icon: CalendarDays,roles: ["medecin", "infirmier", "super_admin", "admin_etablissement"],                              iconColor: "text-violet-600",  iconBg: "bg-violet-50"  },
  { href: "/consultations",    label: "Consultations",      icon: Stethoscope, roles: ["medecin"],                                                                                 iconColor: "text-violet-600",  iconBg: "bg-violet-50"  },
  { href: "/prescriptions",    label: "Prescriptions",      icon: Pill,        roles: ["pharmacien", "medecin"],                                                                   iconColor: "text-amber-600",   iconBg: "bg-amber-50"   },
  { href: "/analyses",         label: "Saisir résultats",   icon: FlaskConical,roles: ["laborantin"],                                                                              iconColor: "text-rose-600",    iconBg: "bg-rose-50"    },
  { href: "/admin",            label: "Administration",     icon: TrendingUp,  roles: ["admin_etablissement", "super_admin"],                                                      iconColor: "text-indigo-600",  iconBg: "bg-indigo-50"  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(timestamp: string): string {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  if (diffMin < 1)   return "À l'instant";
  if (diffMin < 60)  return `Il y a ${diffMin} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(new Date(timestamp));
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: number;
  period: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  href?: string;
  loading?: boolean;
  alertLevel?: "warning" | "danger" | null;
}

function StatCard({ title, value, period, icon: Icon, iconBg, iconColor, href, loading, alertLevel }: StatCardProps) {
  const borderClass =
    alertLevel === "danger"  ? "border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/20" :
    alertLevel === "warning" ? "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20" :
    "border-border bg-card";

  const numClass =
    alertLevel === "danger"  ? "text-red-700 dark:text-red-400" :
    alertLevel === "warning" ? "text-amber-700 dark:text-amber-400" :
    "text-foreground";

  const card = (
    <Card className={`group relative overflow-hidden transition-all duration-200 hover:shadow-md border ${borderClass} ${href ? "cursor-pointer" : ""}`}>
      {alertLevel && (
        <span className={`absolute top-3 right-3 h-2 w-2 rounded-full ${alertLevel === "danger" ? "bg-red-500" : "bg-amber-500"} animate-pulse`} />
      )}
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {loading ? (
              <>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-28 mb-1.5" />
                <Skeleton className="h-3 w-16" />
              </>
            ) : (
              <>
                <p className={`text-3xl font-bold tracking-tight tabular-nums ${numClass}`}>
                  {value.toLocaleString("fr-FR")}
                </p>
                <p className="text-sm font-medium text-foreground/80 mt-1 leading-tight">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{period}</p>
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
            <ArrowUpRight className="h-3 w-3" />
          </div>
        )}
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{card}</Link> : card;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const [stats, setStats]   = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(false);
    try {
      const res = await fetch("/api/dashboard/stats");
      if (res.ok) setStats(await res.json());
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { if (user) loadStats(); }, [user, loadStats]);

  const visibleActions = QUICK_ACTIONS.filter((a) => !user || a.roles.includes(user.role));
  const roleBadge = user ? getRoleBadge(user.role) : null;
  const showRdvPanel = user && ["medecin", "infirmier", "admin_etablissement", "super_admin"].includes(user.role);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Bonjour";
    if (h < 18) return "Bon après-midi";
    return "Bonsoir";
  })();

  const todayLong = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const hasAlerts =
    (stats?.prescriptionsExpiring ?? 0) > 0 ||
    (stats?.analysesEnAttente ?? 0) > 0;

  return (
    <div className="flex flex-col min-h-full bg-muted/20">
      <Header title="Tableau de bord" />

      <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto w-full">

        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <div className="rounded-2xl bg-gradient-to-br from-medical-green via-medical-green to-teal-700 text-white overflow-hidden relative shadow-md">
          <div
            className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 15% 55%, white 1.5px, transparent 1.5px), radial-gradient(circle at 75% 15%, white 1.5px, transparent 1.5px)",
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
                    {greeting},{" "}
                    {user?.titre ? <span className="opacity-90">{user.titre} </span> : null}
                    {user?.prenom} {user?.nom}
                  </h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    {roleBadge && (
                      <span className="text-xs bg-white/20 text-white px-2.5 py-0.5 rounded-full font-medium backdrop-blur-sm border border-white/20">
                        {roleBadge.label}
                      </span>
                    )}
                    {user?.specialite && (
                      <span className="text-xs text-white/75">{user.specialite}</span>
                    )}
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-white/65 pt-0.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {todayLong}
                  </p>
                </>
              )}
            </div>

            {/* Role-aware CTA */}
            {!userLoading && user && (
              <div className="shrink-0">
                {(user.role === "medecin" || user.role === "admin_etablissement" || user.role === "super_admin") && (
                  <Button asChild className="bg-white text-medical-green hover:bg-white/90 font-semibold shadow-none">
                    <Link href="/patients/nouveau">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Nouveau patient
                    </Link>
                  </Button>
                )}
                {user.role === "laborantin" && (
                  <Button asChild className="bg-white text-medical-green hover:bg-white/90 font-semibold shadow-none">
                    <Link href="/analyses">
                      <FlaskConical className="h-4 w-4 mr-2" />
                      Saisir résultats
                    </Link>
                  </Button>
                )}
                {user.role === "pharmacien" && (
                  <Button asChild className="bg-white text-medical-green hover:bg-white/90 font-semibold shadow-none">
                    <Link href="/prescriptions">
                      <Pill className="h-4 w-4 mr-2" />
                      Prescriptions
                    </Link>
                  </Button>
                )}
                {user.role === "infirmier" && (
                  <Button asChild className="bg-white text-medical-green hover:bg-white/90 font-semibold shadow-none">
                    <Link href="/patients">
                      <Users className="h-4 w-4 mr-2" />
                      Rechercher patient
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── ALERT STRIP ───────────────────────────────────────────────── */}
        {!loading && hasAlerts && (
          <div className="flex flex-col sm:flex-row gap-3">
            {(stats?.prescriptionsExpiring ?? 0) > 0 && (
              <Link href="/prescriptions" className="flex-1">
                <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3.5 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors">
                  <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900 shrink-0">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                      {stats?.prescriptionsExpiring} ordonnance{(stats?.prescriptionsExpiring ?? 0) > 1 ? "s expirent" : " expire"} dans 7 jours
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400">Renouvellement à planifier</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-amber-500 shrink-0" />
                </div>
              </Link>
            )}
            {(stats?.analysesEnAttente ?? 0) > 0 && (
              <Link href="/analyses" className="flex-1">
                <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 p-3.5 hover:bg-rose-100 dark:hover:bg-rose-950/50 transition-colors">
                  <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900 shrink-0">
                    <FlaskConical className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-rose-900 dark:text-rose-200">
                      {stats?.analysesEnAttente} analyse{(stats?.analysesEnAttente ?? 0) > 1 ? "s" : ""} en attente de résultat
                    </p>
                    <p className="text-xs text-rose-700 dark:text-rose-400">Résultats à saisir dans le système</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-rose-500 shrink-0" />
                </div>
              </Link>
            )}
          </div>
        )}

        {/* ── KPI GRID ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
          <StatCard
            title="Patients enregistrés"
            period="Aujourd'hui"
            value={stats?.patientsToday ?? 0}
            icon={Users}
            iconBg="bg-emerald-100"
            iconColor="text-emerald-600"
            href="/patients"
            loading={loading}
          />
          <StatCard
            title="Consultations"
            period="7 derniers jours"
            value={stats?.consultationsWeek ?? 0}
            icon={Stethoscope}
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
            href="/consultations"
            loading={loading}
          />
          <StatCard
            title="Rendez-vous"
            period="Aujourd'hui"
            value={stats?.rendezVousAujourdhui ?? 0}
            icon={CalendarDays}
            iconBg="bg-violet-100"
            iconColor="text-violet-600"
            href="/rendez-vous"
            loading={loading}
          />
          <StatCard
            title="Ordonnances expirant"
            period="Dans les 7 prochains jours"
            value={stats?.prescriptionsExpiring ?? 0}
            icon={Pill}
            iconBg={(stats?.prescriptionsExpiring ?? 0) > 0 ? "bg-amber-100" : "bg-amber-50"}
            iconColor="text-amber-600"
            href="/prescriptions"
            loading={loading}
            alertLevel={(stats?.prescriptionsExpiring ?? 0) > 0 ? "warning" : null}
          />
          <StatCard
            title="Analyses en attente"
            period="À traiter"
            value={stats?.analysesEnAttente ?? 0}
            icon={FlaskConical}
            iconBg={(stats?.analysesEnAttente ?? 0) > 0 ? "bg-rose-100" : "bg-rose-50"}
            iconColor="text-rose-600"
            href="/analyses"
            loading={loading}
            alertLevel={(stats?.analysesEnAttente ?? 0) > 0 ? "danger" : null}
          />
          <StatCard
            title="Hospitalisations"
            period="En cours"
            value={stats?.hospitalisationsEnCours ?? 0}
            icon={BedDouble}
            iconBg="bg-indigo-100"
            iconColor="text-indigo-600"
            href="/hospitalisations"
            loading={loading}
          />
        </div>

        {/* ── MAIN CONTENT ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* LEFT COL ─ Quick actions + RDV du jour */}
          <div className="space-y-4">

            {/* Quick actions */}
            <Card className="shadow-sm border-border/60">
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5" />
                  Accès rapides
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-3 pt-1">
                {visibleActions.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href}>
                      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors group">
                        <div className={`p-2 rounded-lg ${item.iconBg} shrink-0 group-hover:scale-105 transition-transform duration-150`}>
                          <Icon className={`h-3.5 w-3.5 ${item.iconColor}`} />
                        </div>
                        <span className="text-sm font-medium">{item.label}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  );
                })}
              </CardContent>
            </Card>

            {/* Rendez-vous du jour */}
            {showRdvPanel && (
              <Card className="shadow-sm border-border/60">
                <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Rendez-vous du jour
                  </CardTitle>
                  <Link href="/rendez-vous">
                    <Button variant="ghost" size="sm" className="h-6 text-xs gap-0.5 text-muted-foreground hover:text-foreground px-2">
                      Tout voir
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="px-2 pb-3 pt-1">
                  {loading ? (
                    <div className="space-y-1 px-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3 py-2">
                          <Skeleton className="h-8 w-10 rounded" />
                          <div className="flex-1 space-y-1">
                            <Skeleton className="h-3 w-28" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : !stats?.rendezVousDuJour?.length ? (
                    <div className="flex flex-col items-center justify-center py-7 text-muted-foreground">
                      <CalendarDays className="h-7 w-7 mb-1.5 opacity-20" />
                      <p className="text-xs">Aucun rendez-vous aujourd&apos;hui</p>
                    </div>
                  ) : (
                    stats.rendezVousDuJour.map((rdv) => {
                      const meta = TYPE_RDV_META[rdv.type_rdv];
                      const RdvIcon = meta?.icon ?? CalendarDays;
                      return (
                        <Link key={rdv.id} href="/rendez-vous">
                          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors group">
                            <div className="text-center shrink-0 w-10">
                              <p className="text-sm font-bold tabular-nums leading-none">{formatTime(rdv.date_heure)}</p>
                            </div>
                            <div className={`p-1.5 rounded-md shrink-0 ${meta?.badgeBg?.split(" ")[0] ?? "bg-muted"}`}>
                              <RdvIcon className={`h-3 w-3 ${meta?.badgeBg?.split(" ")[1] ?? "text-muted-foreground"}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate">{rdv.patientNom}</p>
                              <p className="text-xs text-muted-foreground">{meta?.label ?? rdv.type_rdv}</p>
                            </div>
                            {rdv.statut === "confirmé" && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full shrink-0 font-medium">
                                Confirmé
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* RIGHT COL ─ Activity feed */}
          <Card className="lg:col-span-2 shadow-sm border-border/60">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                Activité récente
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] font-normal px-2 py-0.5">
                  Temps réel
                </Badge>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => loadStats(true)}
                  disabled={refreshing}
                  className="h-6 w-6"
                  title="Actualiser"
                >
                  <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-40" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-3 w-16 shrink-0" />
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mb-2 opacity-40 text-amber-500" />
                  <p className="text-sm font-medium">Erreur de chargement</p>
                  <p className="text-xs mt-1 opacity-60 mb-3">Impossible de récupérer les données</p>
                  <Button variant="outline" size="sm" onClick={() => loadStats()} className="text-xs">
                    <RefreshCw className="h-3 w-3 mr-1.5" />
                    Réessayer
                  </Button>
                </div>
              ) : !stats?.recentActivity.length ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Clock className="h-10 w-10 mb-2.5 opacity-15" />
                  <p className="text-sm font-medium">Aucune activité récente</p>
                  <p className="text-xs mt-1 opacity-60">Les actions apparaîtront ici en temps réel</p>
                </div>
              ) : (
                <ul>
                  {stats.recentActivity.slice(0, 9).map((activity, i) => {
                    const meta = ACTION_META[activity.action];
                    const Icon = meta?.icon ?? Activity;
                    return (
                      <li
                        key={i}
                        className="flex items-center gap-3 px-4 py-3.5 border-b last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <div className={`p-2 rounded-lg shrink-0 ${meta?.iconBg ?? "bg-gray-100"}`}>
                          <Icon className={`h-3.5 w-3.5 ${meta?.iconColor ?? "text-gray-500"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate leading-tight">
                            {meta?.label ?? activity.action}
                          </p>
                          {activity.patientNom !== "—" && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {activity.patientNom}
                            </p>
                          )}
                        </div>
                        <time className="text-xs text-muted-foreground shrink-0 tabular-nums">
                          {formatRelativeTime(activity.timestamp)}
                        </time>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
