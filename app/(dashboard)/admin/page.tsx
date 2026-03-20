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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Users, Stethoscope, BedDouble, Building2,
  Download, TrendingUp, Activity, UserPlus, Shield,
  MapPin, Phone, Mail, Loader2, UserCheck, UserX, Syringe, Settings2, ExternalLink,
  Search, BarChart2,
} from "lucide-react";
import { getRoleBadge } from "@/lib/utils";
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
}

interface EtablissementRow {
  id: string;
  nom: string;
  type: string;
  ville: string;
  region: string;
  adresse?: string;
  telephone?: string;
  email?: string;
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
    telephone: "", etablissement_id: "", numero_ordre: "", titre: "",
  });

  // Etablissements state
  const [etabRows, setEtabRows] = useState<EtablissementRow[]>([]);
  const [etabLoading, setEtabLoading] = useState(false);
  const [newEtabOpen, setNewEtabOpen] = useState(false);
  const [newEtabLoading, setNewEtabLoading] = useState(false);
  const [newEtabForm, setNewEtabForm] = useState({
    nom: "", type: "", ville: "", region: "",
    adresse: "", telephone: "", email: "",
  });

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
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUserForm),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: "Profil utilisateur créé", description: `${newUserForm.prenom} ${newUserForm.nom}` });
      setNewUserOpen(false);
      setNewUserForm({ nom: "", prenom: "", role: "", specialite: "", telephone: "", etablissement_id: "", numero_ordre: "", titre: "" });
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
    type PatientRow = { npi: string; nom: string; prenom: string; date_naissance: string; sexe: string; groupe_sanguin?: string; rhesus?: string; nationalite?: string; created_at: string };
    const data = (await res.json()) as PatientRow[];
    if (!data) return;
    const headers = ["NPI", "Nom", "Prénom", "Date naissance", "Sexe", "Groupe sanguin", "Nationalité", "Créé le"];
    const rows = data.map((p: PatientRow) => [
      p.npi, p.nom, p.prenom, p.date_naissance, p.sexe,
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
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Nouveau profil utilisateur</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleNewUser} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Prénom *</Label>
                        <Input value={newUserForm.prenom} onChange={(e) => setNewUserForm({ ...newUserForm, prenom: e.target.value })} required placeholder="Jean" />
                      </div>
                      <div className="space-y-1">
                        <Label>Nom *</Label>
                        <Input value={newUserForm.nom} onChange={(e) => setNewUserForm({ ...newUserForm, nom: e.target.value })} required placeholder="DUPONT" className="uppercase" />
                      </div>
                      <div className="space-y-1">
                        <Label>Titre</Label>
                        <Select onValueChange={(v) => setNewUserForm({ ...newUserForm, titre: v })}>
                          <SelectTrigger><SelectValue placeholder="Titre..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Dr.">Dr.</SelectItem>
                            <SelectItem value="Pr.">Pr.</SelectItem>
                            <SelectItem value="M.">M.</SelectItem>
                            <SelectItem value="Mme">Mme</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Rôle *</Label>
                        <Select onValueChange={(v) => setNewUserForm({ ...newUserForm, role: v })} required>
                          <SelectTrigger><SelectValue placeholder="Rôle..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="medecin">Médecin</SelectItem>
                            <SelectItem value="infirmier">Infirmier(e)</SelectItem>
                            <SelectItem value="pharmacien">Pharmacien(ne)</SelectItem>
                            <SelectItem value="laborantin">Laborantin(e)</SelectItem>
                            <SelectItem value="admin_etablissement">Admin établissement</SelectItem>
                            {user?.role === "super_admin" && <SelectItem value="super_admin">Super admin</SelectItem>}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Spécialité</Label>
                        <Input value={newUserForm.specialite} onChange={(e) => setNewUserForm({ ...newUserForm, specialite: e.target.value })} placeholder="Cardiologie, Pédiatrie..." />
                      </div>
                      <div className="space-y-1">
                        <Label>N° Ordre médical</Label>
                        <Input value={newUserForm.numero_ordre} onChange={(e) => setNewUserForm({ ...newUserForm, numero_ordre: e.target.value })} placeholder="BJ-2024-001" />
                      </div>
                      <div className="space-y-1">
                        <Label>Téléphone</Label>
                        <Input value={newUserForm.telephone} onChange={(e) => setNewUserForm({ ...newUserForm, telephone: e.target.value })} placeholder="+229 97 00 00 00" />
                      </div>
                      <div className="space-y-1">
                        <Label>Établissement</Label>
                        <Select onValueChange={(v) => setNewUserForm({ ...newUserForm, etablissement_id: v })}>
                          <SelectTrigger><SelectValue placeholder="Établissement..." /></SelectTrigger>
                          <SelectContent>
                            {etablissements.map((e) => <SelectItem key={e.id} value={e.id}>{e.nom}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs text-blue-700">
                        <strong>Note :</strong> Ce formulaire crée le profil. Pour créer le compte de connexion,
                        utilisez la console Supabase Auth pour inviter l&apos;utilisateur par email.
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setNewUserOpen(false)}>Annuler</Button>
                      <Button type="submit" variant="medical" disabled={newUserLoading || !newUserForm.nom || !newUserForm.prenom || !newUserForm.role}>
                        {newUserLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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
                              {(u.etablissements as { nom: string } | null)?.nom || "Aucun établissement"}
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
                {etabRows.map((e) => (
                  <Card key={e.id} className="shadow-sm hover:shadow-md transition-shadow group">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-medical-green/10 flex items-center justify-center shrink-0 group-hover:bg-medical-green/20 transition-colors">
                          <Building2 className="h-5 w-5 text-medical-green" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-sm font-semibold leading-snug">{e.nom}</CardTitle>
                          <span className={`inline-block mt-1 text-xs font-medium px-1.5 py-0.5 rounded ${TYPE_ETAB_BADGE[e.type] ?? "bg-slate-100 text-slate-600"}`}>
                            {typeEtabLabels[e.type] || e.type}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-1.5">
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
                    </CardContent>
                  </Card>
                ))}
                {etabRows.length === 0 && (
                  <div className="col-span-full text-center py-16 text-muted-foreground">
                    <Building2 className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Aucun établissement enregistré</p>
                  </div>
                )}
              </div>
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
