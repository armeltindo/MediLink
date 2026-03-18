"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Users, Stethoscope, BedDouble, Building2,
  Download, TrendingUp, Activity,
} from "lucide-react";

const COLORS = ["#0D7A5F", "#0EA5E9", "#F59E0B", "#DC2626", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"];

export default function AdminPage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalConsultations: 0,
    totalHospitalisations: 0,
    hospitalisationsEnCours: 0,
    totalEtablissements: 0,
    consultationsParMois: [] as { mois: string; count: number }[],
    topDiagnostics: [] as { code: string; libelle: string; count: number }[],
    repartitionSexe: [
      { name: "Hommes", value: 0 },
      { name: "Femmes", value: 0 },
    ],
    activiteMedecins: [] as { nom: string; consultations: number }[],
  });

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const [patientsRes, consultRes, hospitRes, hospitEnCoursRes, etablRes, diagRes, medecinConsultRes] = await Promise.all([
      supabase.from("patients").select("id, sexe", { count: "exact" }).is("deleted_at", null),
      supabase.from("consultations").select("id", { count: "exact" }).is("deleted_at", null),
      supabase.from("hospitalisations").select("id", { count: "exact" }).is("deleted_at", null),
      supabase.from("hospitalisations").select("id", { count: "exact" }).is("date_sortie", null).is("deleted_at", null),
      supabase.from("etablissements").select("id", { count: "exact" }).is("deleted_at", null),
      supabase.from("consultations")
        .select("diagnostic_cim10")
        .not("diagnostic_cim10", "is", null)
        .is("deleted_at", null)
        .limit(500),
      supabase.from("consultations")
        .select("medecin_id, users_profiles(nom, prenom)")
        .is("deleted_at", null)
        .limit(500),
    ]);

    // Compute top diagnostics
    const diagCount: Record<string, number> = {};
    (diagRes.data || []).forEach((c: { diagnostic_cim10?: string }) => {
      if (c.diagnostic_cim10) {
        diagCount[c.diagnostic_cim10] = (diagCount[c.diagnostic_cim10] || 0) + 1;
      }
    });
    const topDiagnostics = Object.entries(diagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([code, count]) => ({ code, libelle: code, count }));

    // Sex breakdown
    const patients = patientsRes.data || [];
    const hommes = patients.filter((p: { sexe: string }) => p.sexe === "M").length;
    const femmes = patients.filter((p: { sexe: string }) => p.sexe === "F").length;

    // Activity by doctor
    const medecinCount: Record<string, { nom: string; count: number }> = {};
    (medecinConsultRes.data || []).forEach((c: { medecin_id: unknown; users_profiles?: unknown }) => {
      const medecinId = c.medecin_id as string;
      if (medecinId) {
        if (!medecinCount[medecinId]) {
          const profiles = c.users_profiles as { nom: string; prenom: string }[] | { nom: string; prenom: string } | null;
          const profile = Array.isArray(profiles) ? profiles[0] : profiles;
          medecinCount[medecinId] = {
            nom: profile ? `Dr. ${profile.prenom} ${profile.nom}` : medecinId.slice(0, 8),
            count: 0,
          };
        }
        medecinCount[medecinId].count++;
      }
    });
    const activiteMedecins = Object.values(medecinCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map((m) => ({ nom: m.nom, consultations: m.count }));

    setStats({
      totalPatients: patientsRes.count || 0,
      totalConsultations: consultRes.count || 0,
      totalHospitalisations: hospitRes.count || 0,
      hospitalisationsEnCours: hospitEnCoursRes.count || 0,
      totalEtablissements: etablRes.count || 0,
      consultationsParMois: [],
      topDiagnostics,
      repartitionSexe: [
        { name: "Hommes", value: hommes },
        { name: "Femmes", value: femmes },
      ],
      activiteMedecins,
    });
    setLoading(false);
  }

  async function exportCSV() {
    const { data } = await supabase
      .from("patients")
      .select("npi, nom, prenom, date_naissance, sexe, groupe_sanguin, rhesus, nationalite, created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (!data) return;

    const headers = ["NPI", "Nom", "Prénom", "Date naissance", "Sexe", "Groupe sanguin", "Nationalité", "Créé le"];
    const rows = data.map((p) => [
      p.npi, p.nom, p.prenom, p.date_naissance, p.sexe,
      `${p.groupe_sanguin || ""}${p.rhesus || ""}`, p.nationalite || "",
      new Date(p.created_at).toLocaleDateString("fr-FR"),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medilink-patients-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  }

  if (user?.role !== "super_admin" && user?.role !== "admin_etablissement") {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Accès refusé</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Administration" />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-serif font-bold">Statistiques établissement</h2>
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exporter CSV patients
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { title: "Patients enregistrés", value: stats.totalPatients, icon: Users, color: "text-medical-green" },
            { title: "Consultations totales", value: stats.totalConsultations, icon: Stethoscope, color: "text-medical-blue" },
            { title: "Hospitalisations totales", value: stats.totalHospitalisations, icon: BedDouble, color: "text-purple-600" },
            { title: "Hospitalisations en cours", value: stats.hospitalisationsEnCours, icon: BedDouble, color: "text-red-500" },
            { title: "Établissements", value: stats.totalEtablissements, icon: Building2, color: "text-orange-600" },
          ].map(({ title, value, icon: Icon, color }) => (
            <Card key={title}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    {loading ? <Skeleton className="h-8 w-16 mb-1" /> : (
                      <p className="text-2xl font-bold">{value.toLocaleString()}</p>
                    )}
                    <p className="text-sm text-muted-foreground">{title}</p>
                  </div>
                  <Icon className={`h-8 w-8 ${color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top diagnostics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-medical-green" />
                Top 10 diagnostics CIM-10
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : stats.topDiagnostics.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune donnée disponible</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats.topDiagnostics} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="code" width={60} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0D7A5F" name="Consultations" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Sex distribution */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-medical-blue" />
                Répartition par sexe
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={stats.repartitionSexe}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {stats.repartitionSexe.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Activité par médecin */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                Activité par médecin (consultations)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">{[1,2,3,4].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : stats.activiteMedecins.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune donnée disponible</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats.activiteMedecins} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="nom" width={120} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="consultations" fill="#0EA5E9" name="Consultations" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
