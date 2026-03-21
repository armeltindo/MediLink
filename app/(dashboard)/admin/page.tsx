"use client";
import { useEffect, useState, useCallback } from "react";
import { useUser } from "@/hooks/use-user";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Users, Stethoscope, BedDouble, Building2,
  Download, TrendingUp, Activity, UserPlus, Shield,
  MapPin, Phone, Mail, Loader2, UserCheck, UserX, Syringe, Settings2, ExternalLink,
  Search, BarChart2, Pill, FlaskConical, X, Pencil, PowerOff, Power, UserCog,
} from "lucide-react";
import { getRoleBadge, cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";

const COLORS = ["#0D7A5F", "#0EA5E9", "#F59E0B", "#DC2626", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"];

const ROLE_AVATAR: Record<string, string> = {
  super_admin: "bg-rose-100 text-rose-600",
  admin_etablissement: "bg-purple-100 text-purple-600",
  medecin: "bg-emerald-100 text-emerald-700",
  infirmier: "bg-blue-100 text-blue-600",
  pharmacien: "bg-amber-100 text-amber-700",
  laborantin: "bg-teal-100 text-teal-600",
};

const TYPE_ETAB_BADGE: Record<string, string> = {
  CHU: "bg-rose-100 text-rose-700",
  CSP: "bg-emerald-100 text-emerald-700",
  hopital: "bg-blue-100 text-blue-700",
  clinique: "bg-purple-100 text-purple-700",
  cabinet: "bg-amber-100 text-amber-700",
};

interface UserRow {
  id: string;
  nom: string;
  prenom: string;
  role: string;
  specialite?: string;
  telephone?: string;
  etablissement_id?: string;
  numero_ordre?: string;
  titre?: string;
  created_at: string;
  deleted_at?: string;
  etablissements?: { nom: string } | null;
  user_etablissements?: { etablissement_id: string; etablissements: { id: string; nom: string } }[];
}

const PARAMEDICAL_ROLES = ["medecin", "infirmier", "laborantin", "pharmacien"];
const MULTI_ETAB_ROLES = ["medecin", "infirmier", "laborantin"];

const ROLE_DEFS = [
  { id: "medecin",             label: "Médecin",        icon: Stethoscope,  iconColor: "text-emerald-600", iconBg: "bg-emerald-100", activeBorder: "border-emerald-500", activeBg: "bg-emerald-50/60" },
  { id: "infirmier",           label: "Infirmier(e)",   icon: Syringe,      iconColor: "text-blue-600",    iconBg: "bg-blue-100",    activeBorder: "border-blue-500",    activeBg: "bg-blue-50/60"    },
  { id: "pharmacien",          label: "Pharmacien(ne)", icon: Pill,         iconColor: "text-amber-600",   iconBg: "bg-amber-100",   activeBorder: "border-amber-500",   activeBg: "bg-amber-50/60"   },
  { id: "laborantin",          label: "Laborantin(e)",  icon: FlaskConical, iconColor: "text-teal-600",    iconBg: "bg-teal-100",    activeBorder: "border-teal-500",    activeBg: "bg-teal-50/60"    },
  { id: "admin_etablissement", label: "Admin établ.",   icon: Building2,    iconColor: "text-purple-600",  iconBg: "bg-purple-100",  activeBorder: "border-purple-500",  activeBg: "bg-purple-50/60"  },
];
const SUPER_ADMIN_ROLE = { id: "super_admin", label: "Super Admin", icon: Shield, iconColor: "text-rose-600", iconBg: "bg-rose-100", activeBorder: "border-rose-500", activeBg: "bg-rose-50/60" };

interface EtablissementRow {
  id: string;
  nom: string;
  type: string;
  ville: string;
  region: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  deleted_at?: string | null;
}

interface PersonnelRow {
  id: string; // junction id
  user_id: string;
  suspended_at: string | null;
  created_at: string;
  users_profiles: {
    id: string;
    nom: string;
    prenom: string;
    role: string;
    specialite?: string;
    titre?: string;
    telephone?: string;
    deleted_at?: string | null;
  } | null;
}

const typeEtabLabels: Record<string, string> = {
  CHU: "CHU",
  CSP: "Centre de Santé",
  clinique: "Clinique",
  hopital: "Hôpital",
  cabinet: "Cabinet médical",
};

export default function AdminPage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalConsultations: 0,
    totalHospitalisations: 0,
    hospitalisationsEnCours: 0,
    totalEtablissements: 0,
    topDiagnostics: [] as { code: string; libelle: string; count: number }[],
    repartitionSexe: [
      { name: "Hommes", value: 0 },
      { name: "Femmes", value: 0 },
    ],
    activiteMedecins: [] as { nom: string; consultations: number }[],
  });

  // Users management state
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [newUserLoading, setNewUserLoading] = useState(false);
  const [etablissements, setEtablissements] = useState<EtablissementRow[]>([]);
  const [newUserForm, setNewUserForm] = useState({
    nom: "", prenom: "", role: "", specialite: "",
    telephone: "", etablissement_id: "", etablissement_ids: [] as string[], numero_ordre: "", titre: "",
  });
  const [etabSearch, setEtabSearch] = useState("");

  // Etablissements state
  const [etabRows, setEtabRows] = useState<EtablissementRow[]>([]);
  const [etabLoading, setEtabLoading] = useState(false);
  const [newEtabOpen, setNewEtabOpen] = useState(false);
  const [newEtabLoading, setNewEtabLoading] = useState(false);
  const [newEtabForm, setNewEtabForm] = useState({
    nom: "", type: "", ville: "", region: "",
    adresse: "", telephone: "", email: "",
  });

  // Edit etablissement state (super_admin)
  const [editEtabOpen, setEditEtabOpen] = useState(false);
  const [editEtabLoading, setEditEtabLoading] = useState(false);
  const [editEtabForm, setEditEtabForm] = useState<EtablissementRow | null>(null);

  // Personnel state (admin_etablissement)
  const [personnel, setPersonnel] = useState<PersonnelRow[]>([]);
  const [personnelLoading, setPersonnelLoading] = useState(false);
  const [personnelSearch, setPersonnelSearch] = useState("");

  useEffect(() => {
    loadStats();
    loadEtablissements();
  }, []);

  async function loadStats() {
    const res = await fetch("/api/admin/stats");
    if (res.ok) setStats(await res.json());
    setLoading(false);
  }

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
    setUsersLoading(false);
  }, []);

  async function loadEtablissements() {
    const res = await fetch("/api/admin/etablissements");
    if (res.ok) {
      const data = await res.json();
      setEtablissements(data);
      setEtabRows(data);
    }
    setEtabLoading(false);
  }

  async function handleNewUser(e: React.FormEvent) {
    e.preventDefault();
    setNewUserLoading(true);
    try {
      const isParamedical = PARAMEDICAL_ROLES.includes(newUserForm.role);
      const payload = {
        ...newUserForm,
        etablissement_ids: isParamedical ? newUserForm.etablissement_ids : undefined,
        etablissement_id: isParamedical ? undefined : newUserForm.etablissement_id,
      };
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: "Profil utilisateur créé", description: `${newUserForm.prenom} ${newUserForm.nom}` });
      setNewUserOpen(false);
      setNewUserForm({ nom: "", prenom: "", role: "", specialite: "", telephone: "", etablissement_id: "", etablissement_ids: [], numero_ordre: "", titre: "" });
      setEtabSearch("");
      loadUsers();
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Erreur", description: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setNewUserLoading(false);
    }
  }

  async function handleToggleUser(userId: string, currentDeleted: string | undefined) {
    const update = currentDeleted ? { deleted_at: null } : { deleted_at: new Date().toISOString() };
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: userId, ...update }),
    });
    if (res.ok) {
      toast({ title: currentDeleted ? "Compte réactivé" : "Compte désactivé" });
      loadUsers();
    }
  }

  async function handleNewEtab(e: React.FormEvent) {
    e.preventDefault();
    setNewEtabLoading(true);
    try {
      const res = await fetch("/api/admin/etablissements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEtabForm),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: "Établissement créé", description: newEtabForm.nom });
      setNewEtabOpen(false);
      setNewEtabForm({ nom: "", type: "", ville: "", region: "", adresse: "", telephone: "", email: "" });
      loadEtablissements();
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Erreur", description: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setNewEtabLoading(false);
    }
  }

  async function handleEditEtab(e: React.FormEvent) {
    e.preventDefault();
    if (!editEtabForm) return;
    setEditEtabLoading(true);
    try {
      const { id, deleted_at: _skip, ...fields } = editEtabForm;
      const res = await fetch("/api/admin/etablissements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...fields }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: "Établissement mis à jour", description: editEtabForm.nom });
      setEditEtabOpen(false);
      loadEtablissements();
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Erreur", description: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setEditEtabLoading(false);
    }
  }

  async function handleToggleEtab(etab: EtablissementRow) {
    const isActive = !etab.deleted_at;
    const res = await fetch("/api/admin/etablissements", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: etab.id, deleted_at: isActive ? new Date().toISOString() : null }),
    });
    if (res.ok) {
      toast({ title: isActive ? "Établissement désactivé" : "Établissement réactivé" });
      loadEtablissements();
    } else {
      const { error } = await res.json();
      toast({ variant: "destructive", title: "Erreur", description: error });
    }
  }

  const loadPersonnel = useCallback(async () => {
    setPersonnelLoading(true);
    const res = await fetch("/api/admin/personnel");
    if (res.ok) setPersonnel(await res.json());
    setPersonnelLoading(false);
  }, []);

  async function handleTogglePersonnel(junction: PersonnelRow) {
    const suspend = !junction.suspended_at;
    const res = await fetch("/api/admin/personnel", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ junction_id: junction.id, suspend }),
    });
    if (res.ok) {
      toast({ title: suspend ? "Accès suspendu" : "Accès rétabli" });
      loadPersonnel();
    } else {
      const { error } = await res.json();
      toast({ variant: "destructive", title: "Erreur", description: error });
    }
  }

  // Escape a CSV field: prevent formula injection and handle special characters
  function escapeCSVField(value: unknown): string {
    const str = String(value ?? "");
    // Neutralise Excel/LibreOffice formula injection (=, +, -, @, TAB, CR)
    const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
    // Wrap in double-quotes if field contains delimiter, quotes or newlines
    if (safe.includes(";") || safe.includes('"') || safe.includes("\n") || safe.includes("\r")) {
      return `"${safe.replace(/"/g, '""')}"`;
    }
    return safe;
  }

  async function exportCSV() {
    const res = await fetch("/api/admin/export/patients");
    if (!res.ok) return;
    type PatientRow = { imu: string; nom: string; prenom: string; date_naissance: string; sexe: string; groupe_sanguin?: string; rhesus?: string; nationalite?: string; created_at: string };
    const data = (await res.json()) as PatientRow[];
    if (!data) return;
    const headers = ["IMU", "Nom", "Prénom", "Date naissance", "Sexe", "Groupe sanguin", "Nationalité", "Créé le"];
    const rows = data.map((p: PatientRow) => [
      p.imu, p.nom, p.prenom, p.date_naissance, p.sexe,
      `${p.groupe_sanguin ?? ""}${p.rhesus ?? ""}`,
      p.nationalite ?? "",
      new Date(p.created_at).toLocaleDateString("fr-FR"),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCSVField).join(";"))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medilink-patients-${new Date().toISOString().split("T")[0]}.csv`;
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

  const filteredUsers = users.filter((u) =>
    !userSearch || `${u.prenom} ${u.nom} ${u.role} ${u.specialite || ""}`.toLowerCase().includes(userSearch.toLowerCase())
  );

  const kpiCards = [
    { title: "Patients enregistrés", value: stats.totalPatients, icon: Users, iconBg: "bg-emerald-100", iconColor: "text-emerald-600", borderColor: "border-l-emerald-500" },
    { title: "Consultations", value: stats.totalConsultations, icon: Stethoscope, iconBg: "bg-blue-100", iconColor: "text-blue-600", borderColor: "border-l-blue-500" },
    { title: "Hospitalisations", value: stats.totalHospitalisations, icon: BedDouble, iconBg: "bg-purple-100", iconColor: "text-purple-600", borderColor: "border-l-purple-500" },
    { title: "En cours", value: stats.hospitalisationsEnCours, icon: BedDouble, iconBg: "bg-red-100", iconColor: "text-red-500", borderColor: "border-l-red-500" },
    { title: "Établissements", value: stats.totalEtablissements, icon: Building2, iconBg: "bg-orange-100", iconColor: "text-orange-600", borderColor: "border-l-orange-500" },
  ];

  return (
    <div className="flex flex-col min-h-full bg-slate-50/40">
      <Header title="Administration" />

      {/* ── Admin identity strip ── */}
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-slate-100 border border-slate-200">
            <Shield className="h-4 w-4 text-slate-500" />
          </div>
          <div>
            <p className="text-sm font-medium leading-none">
              {user?.role === "super_admin" ? "Super Administrateur" : "Administrateur établissement"}
              {(user?.prenom || user?.nom) && (
                <span className="text-muted-foreground font-normal"> — {user?.prenom} {user?.nom}</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Gestion des utilisateurs, établissements et statistiques</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5 text-xs h-8">
          <Download className="h-3.5 w-3.5" />
          Exporter CSV patients
        </Button>
      </div>

      <div className="p-6 space-y-5">
        <Tabs defaultValue="stats">
          <TabsList className="h-10 gap-0.5 bg-slate-100/80">
            <TabsTrigger value="stats" className="gap-1.5 text-sm data-[state=active]:text-medical-green">
              <BarChart2 className="h-3.5 w-3.5" />
              Statistiques
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5 text-sm data-[state=active]:text-medical-green" onClick={() => { if (users.length === 0) loadUsers(); }}>
              <Users className="h-3.5 w-3.5" />
              Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="etablissements" className="gap-1.5 text-sm data-[state=active]:text-medical-green">
              <Building2 className="h-3.5 w-3.5" />
              Établissements
            </TabsTrigger>
            <TabsTrigger value="personnel" className="gap-1.5 text-sm data-[state=active]:text-medical-green" onClick={() => { if (personnel.length === 0) loadPersonnel(); }}>
              <UserCog className="h-3.5 w-3.5" />
              Personnel
            </TabsTrigger>
            <TabsTrigger value="configuration" className="gap-1.5 text-sm data-[state=active]:text-medical-green">
              <Settings2 className="h-3.5 w-3.5" />
              Configuration
            </TabsTrigger>
          </TabsList>

          {/* ── STATS TAB ── */}
          <TabsContent value="stats" className="space-y-5 mt-5">
            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {kpiCards.map(({ title, value, icon: Icon, iconBg, iconColor, borderColor }) => (
                <Card key={title} className={`border-l-4 ${borderColor} shadow-sm`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        {loading
                          ? <Skeleton className="h-7 w-14 mb-1" />
                          : <p className="text-2xl font-bold tracking-tight">{value.toLocaleString()}</p>
                        }
                        <p className="text-xs text-muted-foreground leading-snug mt-0.5">{title}</p>
                      </div>
                      <div className={`p-2 rounded-lg shrink-0 ${iconBg}`}>
                        <Icon className={`h-4 w-4 ${iconColor}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card className="shadow-sm">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <div className="p-1 rounded bg-emerald-100"><TrendingUp className="h-3.5 w-3.5 text-emerald-600" /></div>
                    Top 10 diagnostics CIM-10
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  {loading
                    ? <div className="space-y-2">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-7 w-full" />)}</div>
                    : stats.topDiagnostics.length === 0
                      ? <p className="text-sm text-muted-foreground py-8 text-center">Aucune donnée disponible</p>
                      : (
                        <ResponsiveContainer width="100%" height={260}>
                          <BarChart data={stats.topDiagnostics} layout="vertical" margin={{ left: 20, right: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis type="number" tick={{ fontSize: 11 }} />
                            <YAxis type="category" dataKey="code" width={60} tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={{ fontSize: 12 }} />
                            <Bar dataKey="count" fill="#0D7A5F" name="Consultations" radius={[0, 3, 3, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )
                  }
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <div className="p-1 rounded bg-blue-100"><Activity className="h-3.5 w-3.5 text-blue-600" /></div>
                    Répartition par sexe
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  {loading
                    ? <Skeleton className="h-48 w-full" />
                    : (
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={stats.repartitionSexe}
                            cx="50%" cy="50%"
                            innerRadius={50} outerRadius={80}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                            labelLine={false}
                          >
                            {stats.repartitionSexe.map((_, index) => (
                              <Cell key={index} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Tooltip contentStyle={{ fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )
                  }
                </CardContent>
              </Card>

              <Card className="lg:col-span-2 shadow-sm">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <div className="p-1 rounded bg-purple-100"><Users className="h-3.5 w-3.5 text-purple-600" /></div>
                    Activité par médecin (consultations)
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  {loading
                    ? <div className="space-y-2">{[1,2,3,4].map((i) => <Skeleton key={i} className="h-7 w-full" />)}</div>
                    : stats.activiteMedecins.length === 0
                      ? <p className="text-sm text-muted-foreground py-8 text-center">Aucune donnée disponible</p>
                      : (
                        <ResponsiveContainer width="100%" height={260}>
                          <BarChart data={stats.activiteMedecins} layout="vertical" margin={{ left: 10, right: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis type="number" tick={{ fontSize: 11 }} />
                            <YAxis type="category" dataKey="nom" width={130} tick={{ fontSize: 10 }} />
                            <Tooltip contentStyle={{ fontSize: 12 }} />
                            <Bar dataKey="consultations" fill="#0EA5E9" name="Consultations" radius={[0, 3, 3, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )
                  }
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── USERS TAB ── */}
          <TabsContent value="users" className="space-y-4 mt-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Gestion des utilisateurs</h2>
                {!usersLoading && users.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">{users.length} profil{users.length > 1 ? "s" : ""} enregistré{users.length > 1 ? "s" : ""}</p>
                )}
              </div>
              <Dialog open={newUserOpen} onOpenChange={setNewUserOpen}>
                <DialogTrigger asChild>
                  <Button variant="medical" size="sm" className="gap-1.5">
                    <UserPlus className="h-4 w-4" />
                    Ajouter un profil
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2.5 text-base">
                      <div className="p-2 rounded-lg bg-medical-green/10 shrink-0">
                        <UserPlus className="h-4 w-4 text-medical-green" />
                      </div>
                      Nouveau profil utilisateur
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Créez le profil d&apos;un nouveau membre de l&apos;équipe médicale.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleNewUser} className="space-y-5 pt-1">

                    {/* ── Section 1 : Identité ─────────────────────────────── */}
                    <div className="space-y-3">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Identité</p>
                      <div className="grid grid-cols-6 gap-3">
                        <div className="col-span-2 space-y-1.5">
                          <Label className="text-xs">Titre</Label>
                          <Select value={newUserForm.titre} onValueChange={(v) => setNewUserForm({ ...newUserForm, titre: v })}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Dr.">Dr.</SelectItem>
                              <SelectItem value="Pr.">Pr.</SelectItem>
                              <SelectItem value="M.">M.</SelectItem>
                              <SelectItem value="Mme">Mme</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2 space-y-1.5">
                          <Label className="text-xs">Prénom <span className="text-red-500">*</span></Label>
                          <Input className="h-9" value={newUserForm.prenom} onChange={(e) => setNewUserForm({ ...newUserForm, prenom: e.target.value })} required placeholder="Jean" />
                        </div>
                        <div className="col-span-2 space-y-1.5">
                          <Label className="text-xs">Nom <span className="text-red-500">*</span></Label>
                          <Input className="h-9 uppercase" value={newUserForm.nom} onChange={(e) => setNewUserForm({ ...newUserForm, nom: e.target.value })} required placeholder="DUPONT" />
                        </div>
                        <div className="col-span-3 space-y-1.5">
                          <Label className="text-xs">Téléphone</Label>
                          <Input className="h-9" value={newUserForm.telephone} onChange={(e) => setNewUserForm({ ...newUserForm, telephone: e.target.value })} placeholder="+229 97 00 00 00" />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-dashed" />

                    {/* ── Section 2 : Rôle & Compétences ──────────────────── */}
                    <div className="space-y-3">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Rôle & Compétences</p>

                      {/* Role cards */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">Rôle <span className="text-red-500">*</span></Label>
                        <div className="grid grid-cols-3 gap-2">
                          {[...ROLE_DEFS, ...(user?.role === "super_admin" ? [SUPER_ADMIN_ROLE] : [])].map((def) => {
                            const Icon = def.icon;
                            const isSelected = newUserForm.role === def.id;
                            return (
                              <button
                                key={def.id}
                                type="button"
                                onClick={() => setNewUserForm({ ...newUserForm, role: def.id, etablissement_id: "", etablissement_ids: [] })}
                                className={cn(
                                  "flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all duration-150",
                                  isSelected
                                    ? `${def.activeBorder} ${def.activeBg}`
                                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                                )}
                              >
                                <div className={cn("p-1.5 rounded-lg shrink-0 transition-colors", isSelected ? def.iconBg : "bg-slate-100")}>
                                  <Icon className={cn("h-3.5 w-3.5 transition-colors", isSelected ? def.iconColor : "text-slate-400")} />
                                </div>
                                <span className={cn("text-xs font-medium leading-tight", isSelected ? "text-slate-800" : "text-slate-500")}>
                                  {def.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Spécialité</Label>
                          <Input className="h-9" value={newUserForm.specialite} onChange={(e) => setNewUserForm({ ...newUserForm, specialite: e.target.value })} placeholder="Cardiologie, Pédiatrie…" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">N° Ordre médical</Label>
                          <Input className="h-9" value={newUserForm.numero_ordre} onChange={(e) => setNewUserForm({ ...newUserForm, numero_ordre: e.target.value })} placeholder="BJ-2024-001" />
                        </div>
                      </div>
                    </div>

                    {/* ── Section 3 : Rattachement ─────────────────────────── */}
                    {newUserForm.role && (
                      <>
                        <div className="border-t border-dashed" />
                        <div className="space-y-3">
                          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Rattachement</p>

                          {/* Admin roles: single establishment */}
                          {!PARAMEDICAL_ROLES.includes(newUserForm.role) && (
                            <div className="space-y-1.5">
                              <Label className="text-xs">Établissement</Label>
                              <Select value={newUserForm.etablissement_id} onValueChange={(v) => setNewUserForm({ ...newUserForm, etablissement_id: v })}>
                                <SelectTrigger className="h-9"><SelectValue placeholder="Sélectionner un établissement…" /></SelectTrigger>
                                <SelectContent>
                                  {etablissements.map((e) => <SelectItem key={e.id} value={e.id}>{e.nom}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {/* Pharmacien: optional single */}
                          {newUserForm.role === "pharmacien" && (
                            <div className="space-y-1.5">
                              <Label className="text-xs">
                                Pharmacie / Établissement
                                <span className="text-muted-foreground font-normal ml-1">(optionnel)</span>
                              </Label>
                              <Select
                                value={newUserForm.etablissement_ids[0] ?? "__none__"}
                                onValueChange={(v) => setNewUserForm({ ...newUserForm, etablissement_ids: v === "__none__" ? [] : [v] })}
                              >
                                <SelectTrigger className="h-9"><SelectValue placeholder="Aucun établissement" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">Aucun établissement</SelectItem>
                                  {etablissements.map((e) => <SelectItem key={e.id} value={e.id}>{e.nom}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {/* Multi-etab roles: searchable checkbox list */}
                          {MULTI_ETAB_ROLES.includes(newUserForm.role) && (
                            <div className="space-y-2">
                              <Label className="text-xs">
                                Établissements rattachés
                                <span className="text-muted-foreground font-normal ml-1">(plusieurs possibles)</span>
                              </Label>

                              {/* Search */}
                              <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                                <Input
                                  className="h-8 pl-8 text-xs"
                                  placeholder="Filtrer les établissements…"
                                  value={etabSearch}
                                  onChange={(e) => setEtabSearch(e.target.value)}
                                />
                              </div>

                              {/* Checkbox list */}
                              <div className="border rounded-lg divide-y max-h-44 overflow-y-auto">
                                {etablissements
                                  .filter((e) => !etabSearch || e.nom.toLowerCase().includes(etabSearch.toLowerCase()) || e.ville?.toLowerCase().includes(etabSearch.toLowerCase()))
                                  .map((e) => {
                                    const checked = newUserForm.etablissement_ids.includes(e.id);
                                    return (
                                      <label key={e.id} className={cn("flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors", checked ? "bg-medical-green/5" : "hover:bg-slate-50")}>
                                        <input
                                          type="checkbox"
                                          className="accent-medical-green h-3.5 w-3.5 shrink-0"
                                          checked={checked}
                                          onChange={() => {
                                            const ids = checked
                                              ? newUserForm.etablissement_ids.filter((id) => id !== e.id)
                                              : [...newUserForm.etablissement_ids, e.id];
                                            setNewUserForm({ ...newUserForm, etablissement_ids: ids });
                                          }}
                                        />
                                        <div className="min-w-0 flex-1">
                                          <p className="text-sm font-medium leading-none truncate">{e.nom}</p>
                                          {(e.ville || e.type) && (
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                              {[typeEtabLabels[e.type] || e.type, e.ville].filter(Boolean).join(" · ")}
                                            </p>
                                          )}
                                        </div>
                                        {checked && (
                                          <div className="h-4 w-4 rounded-full bg-medical-green flex items-center justify-center shrink-0">
                                            <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                          </div>
                                        )}
                                      </label>
                                    );
                                  })}
                                {etablissements.filter((e) => !etabSearch || e.nom.toLowerCase().includes(etabSearch.toLowerCase())).length === 0 && (
                                  <p className="text-xs text-muted-foreground px-3 py-4 text-center">Aucun établissement trouvé</p>
                                )}
                              </div>

                              {/* Selected tags */}
                              {newUserForm.etablissement_ids.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {newUserForm.etablissement_ids.map((id) => {
                                    const etab = etablissements.find((e) => e.id === id);
                                    if (!etab) return null;
                                    return (
                                      <span key={id} className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-medical-green/10 text-medical-green border border-medical-green/20">
                                        {etab.nom}
                                        <button
                                          type="button"
                                          onClick={() => setNewUserForm({ ...newUserForm, etablissement_ids: newUserForm.etablissement_ids.filter((eid) => eid !== id) })}
                                          className="ml-0.5 hover:text-red-500 transition-colors"
                                        >
                                          <X className="h-2.5 w-2.5" />
                                        </button>
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* Note */}
                    <div className="flex gap-2.5 rounded-lg bg-amber-50 border border-amber-200 p-3">
                      <Shield className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800 leading-relaxed">
                        <strong>Compte de connexion :</strong> Ce formulaire crée le profil utilisateur.
                        Pour activer la connexion, invitez l&apos;utilisateur par email via la console Supabase Auth.
                      </p>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <Button type="button" variant="outline" onClick={() => { setNewUserOpen(false); setEtabSearch(""); }}>
                        Annuler
                      </Button>
                      <Button type="submit" variant="medical" disabled={newUserLoading || !newUserForm.nom || !newUserForm.prenom || !newUserForm.role} className="gap-2">
                        {newUserLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                        Créer le profil
                      </Button>
                    </div>

                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Search bar */}
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Rechercher par nom, rôle, spécialité..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {usersLoading ? (
              <div className="space-y-2">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-[60px] w-full rounded-lg" />)}</div>
            ) : (
              <Card className="shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <div className="divide-y">
                    {filteredUsers.length === 0 ? (
                      <div className="text-center py-14 text-muted-foreground">
                        <Shield className="h-9 w-9 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">Aucun utilisateur trouvé</p>
                      </div>
                    ) : filteredUsers.map((u) => {
                      const roleBadge = getRoleBadge(u.role);
                      const isInactive = !!u.deleted_at;
                      const avatarClass = ROLE_AVATAR[u.role] ?? "bg-slate-100 text-slate-600";
                      return (
                        <div key={u.id} className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50/60 ${isInactive ? "opacity-50" : ""}`}>
                          <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 font-semibold text-sm ${avatarClass}`}>
                            {u.prenom?.[0]?.toUpperCase()}{u.nom?.[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium text-sm">{u.titre ? `${u.titre} ` : ""}{u.prenom} {u.nom}</span>
                              <Badge className={`text-xs px-1.5 py-0 h-4 ${roleBadge.color}`} variant="outline">
                                {roleBadge.label}
                              </Badge>
                              {isInactive && <Badge variant="danger" className="text-xs h-4">Désactivé</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {u.specialite && <span className="font-medium text-foreground/60">{u.specialite} — </span>}
                              {u.user_etablissements && u.user_etablissements.length > 0
                                ? u.user_etablissements.map((ue) => ue.etablissements?.nom).filter(Boolean).join(", ")
                                : (u.etablissements as { nom: string } | null)?.nom || "Aucun établissement"
                              }
                              {u.numero_ordre && ` · N° ${u.numero_ordre}`}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleUser(u.id, u.deleted_at)}
                            className={`h-8 px-2.5 text-xs gap-1.5 ${isInactive ? "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700" : "text-red-500 hover:bg-red-50 hover:text-red-600"}`}
                            title={isInactive ? "Réactiver le compte" : "Désactiver le compte"}
                          >
                            {isInactive ? <UserCheck className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
                            <span className="hidden sm:inline">{isInactive ? "Réactiver" : "Désactiver"}</span>
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── ETABLISSEMENTS TAB ── */}
          <TabsContent value="etablissements" className="space-y-4 mt-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Établissements de santé</h2>
                {etabRows.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">{etabRows.length} établissement{etabRows.length > 1 ? "s" : ""}</p>
                )}
              </div>
              {user?.role === "super_admin" && (
                <Dialog open={newEtabOpen} onOpenChange={setNewEtabOpen}>
                  <DialogTrigger asChild>
                    <Button variant="medical" size="sm" className="gap-1.5">
                      <Building2 className="h-4 w-4" />
                      Nouvel établissement
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Nouvel établissement</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleNewEtab} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1 col-span-2">
                          <Label>Nom *</Label>
                          <Input value={newEtabForm.nom} onChange={(e) => setNewEtabForm({ ...newEtabForm, nom: e.target.value })} required placeholder="Hôpital de Zone de Cotonou" />
                        </div>
                        <div className="space-y-1">
                          <Label>Type *</Label>
                          <Select onValueChange={(v) => setNewEtabForm({ ...newEtabForm, type: v })} required>
                            <SelectTrigger><SelectValue placeholder="Type..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CHU">CHU</SelectItem>
                              <SelectItem value="CSP">Centre de Santé</SelectItem>
                              <SelectItem value="hopital">Hôpital</SelectItem>
                              <SelectItem value="clinique">Clinique</SelectItem>
                              <SelectItem value="cabinet">Cabinet médical</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label>Ville *</Label>
                          <Input value={newEtabForm.ville} onChange={(e) => setNewEtabForm({ ...newEtabForm, ville: e.target.value })} required placeholder="Cotonou" />
                        </div>
                        <div className="space-y-1">
                          <Label>Région *</Label>
                          <Input value={newEtabForm.region} onChange={(e) => setNewEtabForm({ ...newEtabForm, region: e.target.value })} required placeholder="Atlantique" />
                        </div>
                        <div className="space-y-1">
                          <Label>Téléphone</Label>
                          <Input value={newEtabForm.telephone} onChange={(e) => setNewEtabForm({ ...newEtabForm, telephone: e.target.value })} placeholder="+229 21 00 00 00" />
                        </div>
                        <div className="space-y-1 col-span-2">
                          <Label>Adresse</Label>
                          <Input value={newEtabForm.adresse} onChange={(e) => setNewEtabForm({ ...newEtabForm, adresse: e.target.value })} placeholder="Rue 123, Quartier..." />
                        </div>
                        <div className="space-y-1 col-span-2">
                          <Label>Email</Label>
                          <Input type="email" value={newEtabForm.email} onChange={(e) => setNewEtabForm({ ...newEtabForm, email: e.target.value })} placeholder="contact@hopital.bj" />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setNewEtabOpen(false)}>Annuler</Button>
                        <Button type="submit" variant="medical" disabled={newEtabLoading}>
                          {newEtabLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Créer
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {etabLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1,2,3].map((i) => <Skeleton key={i} className="h-36 w-full rounded-lg" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {etabRows.map((e) => {
                  const isDisabled = !!e.deleted_at;
                  return (
                  <Card key={e.id} className={cn("shadow-sm hover:shadow-md transition-shadow group", isDisabled && "opacity-55")}>
                    <CardHeader className="pb-2 pt-4 px-4">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-medical-green/10 flex items-center justify-center shrink-0 group-hover:bg-medical-green/20 transition-colors">
                          <Building2 className="h-5 w-5 text-medical-green" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <CardTitle className="text-sm font-semibold leading-snug">{e.nom}</CardTitle>
                            {isDisabled && <Badge variant="danger" className="text-xs h-4 px-1.5">Désactivé</Badge>}
                          </div>
                          <span className={`inline-block mt-1 text-xs font-medium px-1.5 py-0.5 rounded ${TYPE_ETAB_BADGE[e.type] ?? "bg-slate-100 text-slate-600"}`}>
                            {typeEtabLabels[e.type] || e.type}
                          </span>
                        </div>
                        {user?.role === "super_admin" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Modifier"
                            onClick={() => { setEditEtabForm({ ...e }); setEditEtabOpen(true); }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-3 space-y-1.5">
                      <div className="flex items-start gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" />
                        <span>{e.ville}{e.region ? `, ${e.region}` : ""}</span>
                      </div>
                      {e.telephone && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <a href={`tel:${e.telephone}`} className="hover:text-foreground transition-colors">{e.telephone}</a>
                        </div>
                      )}
                      {e.email && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <a href={`mailto:${e.email}`} className="hover:text-foreground transition-colors truncate">{e.email}</a>
                        </div>
                      )}
                      {user?.role === "super_admin" && (
                        <div className="pt-1 border-t mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleEtab(e)}
                            className={cn("h-7 text-xs gap-1.5 w-full justify-start", isDisabled ? "text-emerald-600 hover:bg-emerald-50" : "text-red-500 hover:bg-red-50")}
                          >
                            {isDisabled ? <Power className="h-3 w-3" /> : <PowerOff className="h-3 w-3" />}
                            {isDisabled ? "Réactiver l'établissement" : "Désactiver l'établissement"}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  );
                })}
                {etabRows.length === 0 && (
                  <div className="col-span-full text-center py-16 text-muted-foreground">
                    <Building2 className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Aucun établissement enregistré</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── EDIT ETABLISSEMENT DIALOG ── */}
          <Dialog open={editEtabOpen} onOpenChange={setEditEtabOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-medical-green/10">
                    <Pencil className="h-4 w-4 text-medical-green" />
                  </div>
                  Modifier l&apos;établissement
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Modifiez les informations de l&apos;établissement.
                </DialogDescription>
              </DialogHeader>
              {editEtabForm && (
                <form onSubmit={handleEditEtab} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs">Nom *</Label>
                      <Input value={editEtabForm.nom} onChange={(e) => setEditEtabForm({ ...editEtabForm, nom: e.target.value })} required />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Type *</Label>
                      <Select value={editEtabForm.type} onValueChange={(v) => setEditEtabForm({ ...editEtabForm, type: v })}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CHU">CHU</SelectItem>
                          <SelectItem value="CSP">Centre de Santé</SelectItem>
                          <SelectItem value="hopital">Hôpital</SelectItem>
                          <SelectItem value="clinique">Clinique</SelectItem>
                          <SelectItem value="cabinet">Cabinet médical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Ville *</Label>
                      <Input value={editEtabForm.ville} onChange={(e) => setEditEtabForm({ ...editEtabForm, ville: e.target.value })} required />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Région *</Label>
                      <Input value={editEtabForm.region} onChange={(e) => setEditEtabForm({ ...editEtabForm, region: e.target.value })} required />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Téléphone</Label>
                      <Input value={editEtabForm.telephone ?? ""} onChange={(e) => setEditEtabForm({ ...editEtabForm, telephone: e.target.value })} placeholder="+229 21 00 00 00" />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs">Adresse</Label>
                      <Input value={editEtabForm.adresse ?? ""} onChange={(e) => setEditEtabForm({ ...editEtabForm, adresse: e.target.value })} />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs">Email</Label>
                      <Input type="email" value={editEtabForm.email ?? ""} onChange={(e) => setEditEtabForm({ ...editEtabForm, email: e.target.value })} placeholder="contact@hopital.bj" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setEditEtabOpen(false)}>Annuler</Button>
                    <Button type="submit" variant="medical" disabled={editEtabLoading}>
                      {editEtabLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Enregistrer
                    </Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>

          {/* ── PERSONNEL TAB ── */}
          <TabsContent value="personnel" className="space-y-4 mt-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Accès du personnel</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Suspendre ou rétablir l&apos;accès d&apos;un membre du personnel à cet établissement
                </p>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={loadPersonnel}>
                <Loader2 className={cn("h-3.5 w-3.5", personnelLoading && "animate-spin")} />
                Actualiser
              </Button>
            </div>

            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Rechercher par nom, rôle..."
                value={personnelSearch}
                onChange={(e) => setPersonnelSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {personnelLoading ? (
              <div className="space-y-2">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-[60px] w-full rounded-lg" />)}</div>
            ) : (
              <Card className="shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <div className="divide-y">
                    {personnel
                      .filter((p) => {
                        const u = p.users_profiles;
                        if (!u) return false;
                        if (!personnelSearch) return true;
                        return `${u.prenom} ${u.nom} ${u.role} ${u.specialite ?? ""}`.toLowerCase().includes(personnelSearch.toLowerCase());
                      })
                      .length === 0 && !personnelLoading ? (
                      <div className="text-center py-14 text-muted-foreground">
                        <UserCog className="h-9 w-9 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">Aucun personnel trouvé</p>
                        <p className="text-xs mt-1">Cliquez sur &quot;Actualiser&quot; pour charger la liste</p>
                      </div>
                    ) : personnel
                      .filter((p) => {
                        const u = p.users_profiles;
                        if (!u) return false;
                        if (!personnelSearch) return true;
                        return `${u.prenom} ${u.nom} ${u.role} ${u.specialite ?? ""}`.toLowerCase().includes(personnelSearch.toLowerCase());
                      })
                      .map((p) => {
                        const u = p.users_profiles!;
                        const isSuspended = !!p.suspended_at;
                        const isGloballyDisabled = !!u.deleted_at;
                        const roleBadge = getRoleBadge(u.role);
                        const avatarClass = ROLE_AVATAR[u.role] ?? "bg-slate-100 text-slate-600";
                        return (
                          <div key={p.id} className={cn("flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50/60", (isSuspended || isGloballyDisabled) && "opacity-55")}>
                            <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 font-semibold text-sm ${avatarClass}`}>
                              {u.prenom?.[0]?.toUpperCase()}{u.nom?.[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-medium text-sm">{u.titre ? `${u.titre} ` : ""}{u.prenom} {u.nom}</span>
                                <Badge className={`text-xs px-1.5 py-0 h-4 ${roleBadge.color}`} variant="outline">
                                  {roleBadge.label}
                                </Badge>
                                {isSuspended && <Badge variant="danger" className="text-xs h-4">Suspendu</Badge>}
                                {isGloballyDisabled && <Badge variant="secondary" className="text-xs h-4">Compte désactivé</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {u.specialite && <span className="font-medium text-foreground/60">{u.specialite}</span>}
                                {isSuspended && p.suspended_at && (
                                  <span className="ml-1 text-red-400">· Suspendu le {new Date(p.suspended_at).toLocaleDateString("fr-FR")}</span>
                                )}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTogglePersonnel(p)}
                              disabled={isGloballyDisabled}
                              className={cn("h-8 px-2.5 text-xs gap-1.5", isSuspended ? "text-emerald-600 hover:bg-emerald-50" : "text-amber-600 hover:bg-amber-50")}
                              title={isSuspended ? "Rétablir l'accès" : "Suspendre l'accès"}
                            >
                              {isSuspended ? <UserCheck className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
                              <span className="hidden sm:inline">{isSuspended ? "Rétablir" : "Suspendre"}</span>
                            </Button>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── CONFIGURATION TAB ── */}
          <TabsContent value="configuration" className="space-y-5 mt-5">
            <div>
              <h2 className="text-lg font-semibold">Configuration système</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Paramètres médicaux et cliniques de la plateforme</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* PEV */}
              <Card className="shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-emerald-500">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-lg bg-emerald-100 shrink-0">
                      <Syringe className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm">Calendrier vaccinal PEV</h4>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        Configurer le Programme Élargi de Vaccination — ajouter, modifier ou désactiver des vaccins selon le programme national.
                      </p>
                      <Button variant="outline" size="sm" className="mt-3 h-7 text-xs gap-1.5" asChild>
                        <Link href="/admin/configuration/pev">
                          <Settings2 className="h-3.5 w-3.5" />
                          Gérer le calendrier
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Seuils d'alerte */}
              <Card className="shadow-sm border-l-4 border-l-orange-300 opacity-60">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-lg bg-orange-100 shrink-0">
                      <Activity className="h-5 w-5 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm">Seuils d&apos;alerte constantes</h4>
                        <Badge variant="outline" className="text-xs h-4 px-1.5">Bientôt</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        Configurer les valeurs limites pour TA, FC, SpO₂ et température déclenchant les alertes cliniques.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
