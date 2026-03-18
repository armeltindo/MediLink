"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";
import { formatDateTime } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, Stethoscope, Pill, FlaskConical, TrendingUp,
  AlertTriangle, Clock, UserPlus, Activity,
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

function StatCard({ title, value, icon: Icon, color, href, loading }: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  href?: string;
  loading?: boolean;
}) {
  const content = (
    <Card className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${color}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            {loading ? (
              <Skeleton className="h-8 w-16 mb-1" />
            ) : (
              <p className="text-2xl font-bold">{value.toLocaleString()}</p>
            )}
            <p className="text-sm text-muted-foreground">{title}</p>
          </div>
          <div className={`p-3 rounded-full bg-opacity-10 ${color.replace("border-l-", "bg-")}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadStats();
  }, [user]);

  async function loadStats() {
    const now = new Date();
    // Fix: use separate Date objects to avoid mutation
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const [patientsRes, consultationsRes, prescriptionsRes, analysesRes, activityRes] = await Promise.all([
      // Patients created today
      supabase.from("patients").select("id", { count: "exact" })
        .gte("created_at", startOfDay).is("deleted_at", null),

      // Consultations this week
      supabase.from("consultations").select("id", { count: "exact" })
        .gte("date_consultation", startOfWeek)
        .is("deleted_at", null),

      // Prescriptions expiring in 7 days
      supabase.from("prescriptions").select("id", { count: "exact" })
        .in("statut", ["prescrit", "en_cours"])
        .lte("date_expiration", sevenDaysLater)
        .gte("date_expiration", now.toISOString()),

      // Analyses en attente
      supabase.from("analyses_prescrites").select("id", { count: "exact" })
        .in("statut", ["prescrit", "en_attente"]),

      // Recent audit activity — join patient name
      supabase.from("audit_logs")
        .select("action, timestamp, patients(prenom, nom)")
        .order("timestamp", { ascending: false })
        .limit(10),
    ]);

    setStats({
      patientsToday: patientsRes.count || 0,
      consultationsWeek: consultationsRes.count || 0,
      prescriptionsExpiring: prescriptionsRes.count || 0,
      analysesEnAttente: analysesRes.count || 0,
      recentActivity: (activityRes.data || []).map((a: {
        action: string;
        timestamp: string;
        // Supabase retourne les foreign key joins comme un tableau
        patients?: { prenom: string; nom: string }[] | { prenom: string; nom: string } | null;
      }) => {
        const p = Array.isArray(a.patients) ? a.patients[0] : a.patients;
        return {
          action: a.action,
          patientNom: p ? `${p.prenom} ${p.nom}` : "—",
          timestamp: a.timestamp,
        };
      }),
      topDiagnostics: [],
    });
    setLoading(false);
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Tableau de bord" />
      <div className="p-6 space-y-6">
        {/* Welcome */}
        <div className="flex items-center justify-between">
          <div>
            {userLoading ? (
              <Skeleton className="h-7 w-64" />
            ) : (
              <h2 className="text-xl font-serif font-bold">
                Bonjour, {user?.prenom} {user?.nom}
              </h2>
            )}
            <p className="text-muted-foreground text-sm mt-0.5">
              {new Date().toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <Button asChild variant="medical">
            <Link href="/patients/nouveau">
              <UserPlus className="h-4 w-4 mr-2" />
              Nouveau patient
            </Link>
          </Button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Patients enregistrés aujourd'hui"
            value={stats?.patientsToday || 0}
            icon={Users}
            color="border-l-medical-green"
            href="/patients"
            loading={loading}
          />
          <StatCard
            title="Consultations cette semaine"
            value={stats?.consultationsWeek || 0}
            icon={Stethoscope}
            color="border-l-medical-blue"
            href="/consultations"
            loading={loading}
          />
          <StatCard
            title="Ordonnances expirant bientôt"
            value={stats?.prescriptionsExpiring || 0}
            icon={Pill}
            color="border-l-medical-orange"
            href="/prescriptions"
            loading={loading}
          />
          <StatCard
            title="Analyses en attente"
            value={stats?.analysesEnAttente || 0}
            icon={FlaskConical}
            color="border-l-medical-red"
            href="/analyses"
            loading={loading}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick actions */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-medical-green" />
                Actions rapides
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { href: "/patients/nouveau", label: "Enregistrer un patient", icon: UserPlus, roles: ["medecin", "admin_etablissement", "super_admin"] },
                { href: "/patients", label: "Rechercher un patient", icon: Users, roles: ["medecin", "infirmier", "laborantin", "pharmacien", "super_admin", "admin_etablissement"] },
                { href: "/consultations", label: "Voir les consultations", icon: Stethoscope, roles: ["medecin"] },
                { href: "/prescriptions", label: "Gérer les prescriptions", icon: Pill, roles: ["pharmacien", "medecin"] },
                { href: "/analyses", label: "Saisir des résultats", icon: FlaskConical, roles: ["laborantin"] },
                { href: "/admin", label: "Statistiques établissement", icon: TrendingUp, roles: ["admin_etablissement", "super_admin"] },
              ]
                .filter((item) => !user || item.roles.includes(user.role))
                .map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href}>
                      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                        <Icon className="h-4 w-4 text-medical-green" />
                        <span className="text-sm">{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-medical-blue" />
                Activité récente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : stats?.recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune activité récente</p>
              ) : (
                <div className="space-y-2">
                  {stats?.recentActivity.slice(0, 8).map((activity, i) => {
                    const actionLabels: Record<string, string> = {
                      view_patient: "Consultation dossier patient",
                      create_patient: "Nouveau patient enregistré",
                      create_consultation: "Nouvelle consultation",
                      create_prescription: "Nouvelle prescription",
                      dispense_medication: "Médicament dispensé",
                    };
                    return (
                      <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0">
                        <div className="h-2 w-2 rounded-full bg-medical-green flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">
                            {actionLabels[activity.action] || activity.action}
                          </p>
                          {activity.patientNom !== "—" && (
                            <p className="text-xs text-muted-foreground truncate">{activity.patientNom}</p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDateTime(activity.timestamp)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Alert banner if expiring prescriptions */}
        {(stats?.prescriptionsExpiring || 0) > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-orange-800">
                {stats?.prescriptionsExpiring} ordonnance{(stats?.prescriptionsExpiring || 0) > 1 ? "s" : ""} expire{(stats?.prescriptionsExpiring || 0) > 1 ? "nt" : ""} dans les 7 jours
              </p>
              <p className="text-sm text-orange-700 mt-0.5">
                Ces patients ont besoin d&apos;un renouvellement de leur traitement chronique.
              </p>
              <Button variant="outline" size="sm" className="mt-2 border-orange-300 text-orange-700" asChild>
                <Link href="/prescriptions">Voir les ordonnances</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
