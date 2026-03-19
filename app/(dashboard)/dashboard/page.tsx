"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@/hooks/use-user";
import { formatDateTime } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Users, Stethoscope, Pill, FlaskConical, TrendingUp,
  AlertTriangle, Clock, UserPlus, Activity, ChevronRight,
  CalendarDays, ArrowUpRight,
} from "lucide-react";

interface DashboardStats {
  patientsToday: number;
  consultationsWeek: number;
  prescriptionsExpiring: number;
  analysesEnAttente: number;
  recentActivity: Array<{
    action: string;
    patientNom: string;
    timestamp: string;
  }>;
  topDiagnostics: Array<{ code: string; count: number }>;
}

const ACTION_META: Record<string, { label: string; color: string }> = {
  view_patient:        { label: "Dossier consulté",    color: "bg-blue-500" },
  create_patient:      { label: "Patient enregistré",  color: "bg-emerald-500" },
  create_consultation: { label: "Consultation créée",  color: "bg-violet-500" },
  create_prescription: { label: "Prescription émise",  color: "bg-amber-500" },
  dispense_medication: { label: "Médicament dispensé", color: "bg-rose-500" },
};

function StatCard({
  title, value, icon: Icon, gradient, accent, href, loading,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  accent: string;
  href?: string;
  loading?: boolean;
}) {
  const content = (
    <Card className="group relative overflow-hidden hover:shadow-lg transition-all duration-200 border-0 shadow-sm">
      <div className={`absolute inset-0 opacity-[0.06] ${gradient}`} />
      <CardContent className="p-5 relative">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            {loading ? (
              <>
                <Skeleton className="h-8 w-20 mb-1" />
                <Skeleton className="h-4 w-36" />
              </>
            ) : (
              <>
                <p className="text-3xl font-bold tracking-tight">{value.toLocaleString("fr-FR")}</p>
                <p className="text-sm text-muted-foreground leading-tight">{title}</p>
              </>
            )}
          </div>
          <div className={`p-2.5 rounded-xl ${accent} shrink-0`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
        {href && (
          <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
            <span>Voir détails</span>
            <ArrowUpRight className="h-3 w-3" />
          </div>
        )}
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

const QUICK_ACTIONS = [
  { href: "/patients/nouveau", label: "Nouveau patient",     icon: UserPlus,    roles: ["medecin","admin_etablissement","super_admin"],                                              color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950" },
  { href: "/patients",         label: "Rechercher patient",  icon: Users,       roles: ["medecin","infirmier","laborantin","pharmacien","super_admin","admin_etablissement"],        color: "text-blue-600 bg-blue-50 dark:bg-blue-950" },
  { href: "/consultations",    label: "Consultations",        icon: Stethoscope, roles: ["medecin"],                                                                                color: "text-violet-600 bg-violet-50 dark:bg-violet-950" },
  { href: "/prescriptions",    label: "Prescriptions",        icon: Pill,        roles: ["pharmacien","medecin"],                                                                   color: "text-amber-600 bg-amber-50 dark:bg-amber-950" },
  { href: "/analyses",         label: "Saisir résultats",     icon: FlaskConical,roles: ["laborantin"],                                                                             color: "text-rose-600 bg-rose-50 dark:bg-rose-950" },
  { href: "/admin",            label: "Statistiques",         icon: TrendingUp,  roles: ["admin_etablissement","super_admin"],                                                      color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950" },
];

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadStats();
  }, [user]);

  async function loadStats() {
    const res = await fetch("/api/dashboard/stats");
    if (res.ok) setStats({ ...(await res.json()), topDiagnostics: [] });
    setLoading(false);
  }

  const visibleActions = QUICK_ACTIONS.filter(
    (item) => !user || item.roles.includes(user.role),
  );

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Bonjour";
    if (h < 18) return "Bon après-midi";
    return "Bonsoir";
  })();

  return (
    <div className="flex flex-col min-h-full bg-muted/20">
      <Header title="Tableau de bord" />

      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">

        {/* Welcome banner */}
        <div className="rounded-2xl bg-gradient-to-br from-medical-green/90 to-teal-600 text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
          <div className="space-y-1">
            {userLoading ? (
              <>
                <Skeleton className="h-7 w-56 bg-white/20" />
                <Skeleton className="h-4 w-40 bg-white/20 mt-1" />
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold">
                  {greeting}, {user?.prenom} {user?.nom} 👋
                </h2>
                <p className="text-white/80 text-sm flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {new Date().toLocaleDateString("fr-FR", {
                    weekday: "long", year: "numeric", month: "long", day: "numeric",
                  })}
                </p>
              </>
            )}
          </div>
          <Button
            asChild
            className="bg-white text-medical-green hover:bg-white/90 font-semibold shadow-none shrink-0"
          >
            <Link href="/patients/nouveau">
              <UserPlus className="h-4 w-4 mr-2" />
              Nouveau patient
            </Link>
          </Button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Patients enregistrés aujourd'hui"
            value={stats?.patientsToday ?? 0}
            icon={Users}
            gradient="bg-emerald-500"
            accent="bg-emerald-500"
            href="/patients"
            loading={loading}
          />
          <StatCard
            title="Consultations cette semaine"
            value={stats?.consultationsWeek ?? 0}
            icon={Stethoscope}
            gradient="bg-blue-500"
            accent="bg-blue-500"
            href="/consultations"
            loading={loading}
          />
          <StatCard
            title="Ordonnances expirant bientôt"
            value={stats?.prescriptionsExpiring ?? 0}
            icon={Pill}
            gradient="bg-amber-500"
            accent="bg-amber-500"
            href="/prescriptions"
            loading={loading}
          />
          <StatCard
            title="Analyses en attente"
            value={stats?.analysesEnAttente ?? 0}
            icon={FlaskConical}
            gradient="bg-rose-500"
            accent="bg-rose-500"
            href="/analyses"
            loading={loading}
          />
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Quick actions */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-xs font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                <Activity className="h-3.5 w-3.5" />
                Actions rapides
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-2 gap-2">
                {visibleActions.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href}>
                      <div className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted/60 transition-colors text-center group">
                        <div className={`p-2.5 rounded-xl ${item.color} transition-transform group-hover:scale-110 duration-150`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-medium leading-tight">{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card className="lg:col-span-2 border-0 shadow-sm">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                <Clock className="h-3.5 w-3.5" />
                Activité récente
              </CardTitle>
              <Badge variant="secondary" className="text-xs font-normal">
                Temps réel
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-2 w-2 rounded-full shrink-0" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-4 w-20 shrink-0" />
                    </div>
                  ))}
                </div>
              ) : !stats?.recentActivity.length ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Clock className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">Aucune activité récente</p>
                </div>
              ) : (
                <ul>
                  {stats.recentActivity.slice(0, 8).map((activity, i) => {
                    const meta = ACTION_META[activity.action];
                    return (
                      <li
                        key={i}
                        className="flex items-center gap-3 px-4 py-3 border-b last:border-0 hover:bg-muted/40 transition-colors"
                      >
                        <span className={`h-2 w-2 rounded-full shrink-0 ${meta?.color ?? "bg-gray-400"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {meta?.label ?? activity.action}
                          </p>
                          {activity.patientNom !== "—" && (
                            <p className="text-xs text-muted-foreground truncate">
                              {activity.patientNom}
                            </p>
                          )}
                        </div>
                        <time className="text-xs text-muted-foreground shrink-0 tabular-nums">
                          {formatDateTime(activity.timestamp)}
                        </time>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Alert banner */}
        {(stats?.prescriptionsExpiring ?? 0) > 0 && (
          <div className="flex items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900 shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-amber-900 dark:text-amber-200">
                {stats?.prescriptionsExpiring} ordonnance{(stats?.prescriptionsExpiring ?? 0) > 1 ? "s expirent" : " expire"} dans les 7 jours
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                Ces patients ont besoin d&apos;un renouvellement de leur traitement chronique.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300"
              asChild
            >
              <Link href="/prescriptions" className="flex items-center gap-1.5">
                Voir
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
