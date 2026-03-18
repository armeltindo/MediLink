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

type PatientInfo = { npi?: string | null; nom?: string | null; prenom?: string | null };
type ConsultationExport = { date_consultation: string; motif?: string | null; diagnostic_principal?: string | null; diagnostic_cim10?: string | null; type_consultation?: string | null; patients?: PatientInfo | null };
type PrescriptionExport = { date_prescription: string; medicament_dci?: string | null; dosage?: string | null; posologie?: string | null; duree?: string | null; statut?: string | null; date_expiration?: string | null; patients?: PatientInfo | null };

export default function AdminPage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalConsultations: 0,
    totalHospitalisations: 0,
    totalEtablissements: 0,
    consultationsParMois: [] as { mois: string; count: number }[],
    topDiagnostics: [] as { code: string; libelle: string; count: number }[],
    repartitionSexe: [
      { name: "Hommes", value: 0 },
      { name: "Femmes", value: 0 },
    ],
  });

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const [patientsRes, consultRes, hospitRes, etablRes, diagRes] = await Promise.all([
      supabase.from("patients").select("id, sexe", { count: "exact" }).is("deleted_at", null),
      supabase.from("consultations").select("id", { count: "exact" }).is("deleted_at", null),
      supabase.from("hospitalisations").select("id", { count: "exact" }).is("deleted_at", null),
      supabase.from("etablissements").select("id", { count: "exact" }).is("deleted_at", null),
      supabase.from("consultations")
        .select("diagnostic_cim10")
        .not("diagnostic_cim10", "is", null)
        .is("deleted_at", null)
        .limit(500),
    ]);

    // Compute top diagnostics
    const diagCount: Record<string, number> = {};
    (diagRes.data || []).forEach((c) => {
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
    const hommes = patients.filter((p) => p.sexe === "M").length;
    const femmes = patients.filter((p) => p.sexe === "F").length;

    setStats({
      totalPatients: patientsRes.count || 0,
      totalConsultations: consultRes.count || 0,
      totalHospitalisations: hospitRes.count || 0,
      totalEtablissements: etablRes.count || 0,
      consultationsParMois: [],
      topDiagnostics,
      repartitionSexe: [
        { name: "Hommes", value: hommes },
        { name: "Femmes", value: femmes },
      ],
    });
    setLoading(false);
  }

  async function exportCSV(type: "patients" | "consultations" | "prescriptions") {
    if (type === "patients") {
      const { data } = await supabase
        .from("patients")
        .select("npi, nom, prenom, date_naissance, sexe, groupe_sanguin, rhesus, nationalite, profession, assurance_organisme, created_at")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (!data) return;
      const headers = ["NPI", "Nom", "Prénom", "Date naissance", "Sexe", "Groupe sanguin", "Nationalité", "Profession", "Assurance", "Créé le"];
      const rows = data.map((p) => [
        p.npi, p.nom, p.prenom, p.date_naissance, p.sexe === "M" ? "Masculin" : "Féminin",
        `${p.groupe_sanguin || ""}${p.rhesus || ""}`, p.nationalite || "", p.profession || "", p.assurance_organisme || "",
        new Date(p.created_at).toLocaleDateString("fr-FR"),
      ]);
      downloadCSV([headers, ...rows], `medilink-patients-${new Date().toISOString().split("T")[0]}.csv`);
    } else if (type === "consultations") {
      const { data } = await supabase
        .from("consultations")
        .select("date_consultation, motif, diagnostic_principal, diagnostic_cim10, type_consultation, patients!inner(npi, nom, prenom)")
        .is("deleted_at", null)
        .order("date_consultation", { ascending: false })
        .limit(1000);
      if (!data) return;
      const headers = ["Date", "Patient NPI", "Patient Nom", "Motif", "Diagnostic principal", "Code CIM-10", "Type"];
      const rows = (data as ConsultationExport[]).map((c) => [
        new Date(c.date_consultation).toLocaleDateString("fr-FR"),
        c.patients?.npi || "", `${c.patients?.prenom || ""} ${c.patients?.nom || ""}`,
        c.motif || "", c.diagnostic_principal || "", c.diagnostic_cim10 || "", c.type_consultation || "",
      ]);
      downloadCSV([headers, ...rows], `medilink-consultations-${new Date().toISOString().split("T")[0]}.csv`);
    } else if (type === "prescriptions") {
      const { data } = await supabase
        .from("prescriptions")
        .select("date_prescription, medicament_dci, dosage, posologie, duree, statut, date_expiration, patients!inner(npi, nom, prenom)")
        .is("deleted_at", null)
        .order("date_prescription", { ascending: false })
        .limit(1000);
      if (!data) return;
      const headers = ["Date prescription", "Patient NPI", "Patient Nom", "Médicament DCI", "Dosage", "Posologie", "Durée", "Statut", "Expiration"];
      const rows = (data as PrescriptionExport[]).map((p) => [
        new Date(p.date_prescription).toLocaleDateString("fr-FR"),
        p.patients?.npi || "", `${p.patients?.prenom || ""} ${p.patients?.nom || ""}`,
        p.medicament_dci || "", p.dosage || "", p.posologie || "", p.duree || "", p.statut || "",
        p.date_expiration ? new Date(p.date_expiration).toLocaleDateString("fr-FR") : "",
      ]);
      downloadCSV([headers, ...rows], `medilink-prescriptions-${new Date().toISOString().split("T")[0]}.csv`);
    }
  }

  function downloadCSV(rows: string[][], filename: string) {
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
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
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportCSV("patients")}>
              <Download className="h-4 w-4 mr-2" />
              CSV Patients
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportCSV("consultations")}>
              <Download className="h-4 w-4 mr-2" />
              CSV Consultations
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportCSV("prescriptions")}>
              <Download className="h-4 w-4 mr-2" />
              CSV Prescriptions
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: "Patients enregistrés", value: stats.totalPatients, icon: Users, color: "text-medical-green" },
            { title: "Consultations totales", value: stats.totalConsultations, icon: Stethoscope, color: "text-medical-blue" },
            { title: "Hospitalisations", value: stats.totalHospitalisations, icon: BedDouble, color: "text-purple-600" },
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
        </div>
      </div>
    </div>
  );
}
