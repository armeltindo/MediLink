"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
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
} from "lucide-react";
import { getRoleBadge } from "@/lib/utils";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";

const COLORS = ["#0D7A5F", "#0EA5E9", "#F59E0B", "#DC2626", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"];

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
    // Promise.allSettled : une requête qui échoue n'annule pas les autres
    const results = await Promise.allSettled([
      supabase.from("patients").select("id, sexe", { count: "exact" }).is("deleted_at", null),
      supabase.from("consultations").select("id", { count: "exact" }).is("deleted_at", null),
      supabase.from("hospitalisations").select("id", { count: "exact" }).is("deleted_at", null),
      supabase.from("hospitalisations").select("id", { count: "exact" }).is("date_sortie", null).is("deleted_at", null),
      supabase.from("etablissements").select("id", { count: "exact" }).is("deleted_at", null),
      supabase.from("consultations").select("diagnostic_cim10").not("diagnostic_cim10", "is", null).is("deleted_at", null).limit(500),
      supabase.from("consultations").select("medecin_id, users_profiles(nom, prenom)").is("deleted_at", null).limit(500),
    ]);

    const getValue = <T,>(result: PromiseSettledResult<T>, fallback: T): T =>
      result.status === "fulfilled" ? result.value : fallback;

    const emptyRes = { data: [], count: 0, error: null, status: 200, statusText: "OK" } as const;
    const [patientsRes, consultRes, hospitRes, hospitEnCoursRes, etablRes, diagRes, medecinConsultRes] = [
      getValue(results[0], emptyRes),
      getValue(results[1], emptyRes),
      getValue(results[2], emptyRes),
      getValue(results[3], emptyRes),
      getValue(results[4], emptyRes),
      getValue(results[5], emptyRes),
      getValue(results[6], emptyRes),
    ];

    const diagCount: Record<string, number> = {};
    (diagRes.data || []).forEach((c: { diagnostic_cim10?: string }) => {
      if (c.diagnostic_cim10) diagCount[c.diagnostic_cim10] = (diagCount[c.diagnostic_cim10] || 0) + 1;
    });
    const topDiagnostics = Object.entries(diagCount)
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([code, count]) => ({ code, libelle: code, count }));

    const patients = patientsRes.data || [];
    const hommes = patients.filter((p: { sexe: string }) => p.sexe === "M").length;
    const femmes = patients.filter((p: { sexe: string }) => p.sexe === "F").length;

    const medecinCount: Record<string, { nom: string; count: number }> = {};
    (medecinConsultRes.data || []).forEach((c: { medecin_id: unknown; users_profiles?: unknown }) => {
      const medecinId = c.medecin_id as string;
      if (medecinId) {
        if (!medecinCount[medecinId]) {
          const profiles = c.users_profiles as { nom: string; prenom: string }[] | { nom: string; prenom: string } | null;
          const profile = Array.isArray(profiles) ? profiles[0] : profiles;
          medecinCount[medecinId] = { nom: profile ? `Dr. ${profile.prenom} ${profile.nom}` : medecinId.slice(0, 8), count: 0 };
        }
        medecinCount[medecinId].count++;
      }
    });
    const activiteMedecins = Object.values(medecinCount)
      .sort((a, b) => b.count - a.count).slice(0, 8)
      .map((m) => ({ nom: m.nom, consultations: m.count }));

    setStats({
      totalPatients: patientsRes.count || 0,
      totalConsultations: consultRes.count || 0,
      totalHospitalisations: hospitRes.count || 0,
      hospitalisationsEnCours: hospitEnCoursRes.count || 0,
      totalEtablissements: etablRes.count || 0,
      topDiagnostics,
      repartitionSexe: [{ name: "Hommes", value: hommes }, { name: "Femmes", value: femmes }],
      activiteMedecins,
    });
    setLoading(false);
  }

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
    setUsersLoading(false);
  }, []);

  async function loadEtablissements() {
    const { data } = await supabase.from("etablissements").select("id, nom, type, ville, region, adresse, telephone, email").is("deleted_at", null).order("nom");
    setEtablissements((data as EtablissementRow[]) || []);
    setEtabRows((data as EtablissementRow[]) || []);
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
      const { error } = await supabase.from("etablissements").insert(newEtabForm);
      if (error) throw error;
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
    const { data } = await supabase
      .from("patients")
      .select("npi, nom, prenom, date_naissance, sexe, groupe_sanguin, rhesus, nationalite, created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (!data) return;
    const headers = ["NPI", "Nom", "Prénom", "Date naissance", "Sexe", "Groupe sanguin", "Nationalité", "Créé le"];
    const rows = data.map((p) => [
      p.npi, p.nom, p.prenom, p.date_naissance, p.sexe,
      `${p.groupe_sanguin || ""}${p.rhesus || ""}`,
      p.nationalite || "",
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

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Administration" />
      <div className="p-6 space-y-6">
        <Tabs defaultValue="stats">
          <TabsList>
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
            <TabsTrigger value="users" onClick={() => { if (users.length === 0) loadUsers(); }}>
              Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="etablissements">Établissements</TabsTrigger>
            <TabsTrigger value="configuration">Configuration</TabsTrigger>
          </TabsList>

          {/* ── STATS TAB ── */}
          <TabsContent value="stats" className="space-y-6 mt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-serif font-bold">Statistiques établissement</h2>
              <Button variant="outline" onClick={exportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Exporter CSV patients
              </Button>
            </div>

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
                        {loading ? <Skeleton className="h-8 w-16 mb-1" /> : <p className="text-2xl font-bold">{value.toLocaleString()}</p>}
                        <p className="text-sm text-muted-foreground">{title}</p>
                      </div>
                      <Icon className={`h-8 w-8 ${color}`} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-medical-green" />
                    Top 10 diagnostics CIM-10
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? <div className="space-y-2">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
                  : stats.topDiagnostics.length === 0 ? <p className="text-sm text-muted-foreground">Aucune donnée disponible</p>
                  : (
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

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-medical-blue" />
                    Répartition par sexe
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? <Skeleton className="h-48 w-full" /> : (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={stats.repartitionSexe} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          {stats.repartitionSexe.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Legend /><Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-600" />
                    Activité par médecin (consultations)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? <div className="space-y-2">{[1,2,3,4].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
                  : stats.activiteMedecins.length === 0 ? <p className="text-sm text-muted-foreground">Aucune donnée disponible</p>
                  : (
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
          </TabsContent>

          {/* ── USERS TAB ── */}
          <TabsContent value="users" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-serif font-bold">Gestion des utilisateurs</h2>
              <Dialog open={newUserOpen} onOpenChange={setNewUserOpen}>
                <DialogTrigger asChild>
                  <Button variant="medical">
                    <UserPlus className="h-4 w-4 mr-2" />
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

            {/* Search */}
            <div className="relative max-w-md">
              <Input
                placeholder="Rechercher par nom, rôle, spécialité..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-4"
              />
            </div>

            {usersLoading ? (
              <div className="space-y-2">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {filteredUsers.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p>Aucun utilisateur trouvé</p>
                      </div>
                    ) : filteredUsers.map((u) => {
                      const roleBadge = getRoleBadge(u.role);
                      const isInactive = !!u.deleted_at;
                      return (
                        <div key={u.id} className={`flex items-center gap-4 px-4 py-3 ${isInactive ? "opacity-50" : ""}`}>
                          <div className="h-10 w-10 rounded-full bg-medical-green/10 flex items-center justify-center shrink-0">
                            <span className="text-medical-green font-semibold text-sm">
                              {u.prenom?.[0]}{u.nom?.[0]}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{u.titre ? `${u.titre} ` : ""}{u.prenom} {u.nom}</span>
                              <Badge className={`text-xs px-1.5 py-0 ${roleBadge.color}`} variant="outline">
                                {roleBadge.label}
                              </Badge>
                              {isInactive && <Badge variant="danger" className="text-xs">Désactivé</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {u.specialite && `${u.specialite} — `}
                              {(u.etablissements as { nom: string } | null)?.nom || "Aucun établissement"}
                              {u.numero_ordre && ` — N° ${u.numero_ordre}`}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleUser(u.id, u.deleted_at)}
                            className={isInactive ? "text-green-600 hover:text-green-700" : "text-red-500 hover:text-red-600"}
                            title={isInactive ? "Réactiver le compte" : "Désactiver le compte"}
                          >
                            {isInactive ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
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
          <TabsContent value="etablissements" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-serif font-bold">Établissements de santé</h2>
              {user?.role === "super_admin" && (
                <Dialog open={newEtabOpen} onOpenChange={setNewEtabOpen}>
                  <DialogTrigger asChild>
                    <Button variant="medical">
                      <Building2 className="h-4 w-4 mr-2" />
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
                {[1,2,3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {etabRows.map((e) => (
                  <Card key={e.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-medical-green/10 flex items-center justify-center shrink-0">
                          <Building2 className="h-5 w-5 text-medical-green" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{e.nom}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">{typeEtabLabels[e.type] || e.type}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-1.5">
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span>{e.ville}{e.region ? `, ${e.region}` : ""}</span>
                      </div>
                      {e.telephone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <a href={`tel:${e.telephone}`} className="hover:text-foreground">{e.telephone}</a>
                        </div>
                      )}
                      {e.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <a href={`mailto:${e.email}`} className="hover:text-foreground truncate">{e.email}</a>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {etabRows.length === 0 && (
                  <div className="col-span-full text-center py-16 text-muted-foreground">
                    <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p>Aucun établissement enregistré</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── CONFIGURATION TAB ── */}
          <TabsContent value="configuration" className="space-y-4 mt-4">
            <h3 className="text-base font-semibold">Configuration système</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* PEV Configuration */}
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-lg bg-medical-green-light">
                      <Syringe className="h-5 w-5 text-medical-green" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">Calendrier vaccinal PEV</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Configurer le Programme Élargi de Vaccination — ajouter, modifier ou désactiver des vaccins selon le programme national.
                      </p>
                      <Button variant="outline" size="sm" className="mt-3 h-7 text-xs" asChild>
                        <Link href="/admin/configuration/pev">
                          <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                          Gérer le calendrier
                          <ExternalLink className="h-3 w-3 ml-1.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* Seuils d'alerte */}
              <Card className="hover:shadow-md transition-shadow opacity-60">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-lg bg-orange-100">
                      <Activity className="h-5 w-5 text-orange-500" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">Seuils d&apos;alerte constantes</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Configurer les valeurs limites pour TA, FC, SpO₂ et température déclenchant les alertes cliniques.
                      </p>
                      <Badge variant="outline" className="mt-3 text-xs">Bientôt disponible</Badge>
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
