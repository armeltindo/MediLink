"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";
import { formatDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  BedDouble,
  Search,
  Calendar,
  Building2,
  User,
  Clock,
  ArrowUpRight,
  Loader2,
  Stethoscope,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface HospitalisationRow {
  id: string;
  patient_id: string;
  etablissement_id: string;
  medecin_referent_id: string | null;
  date_entree: string;
  date_sortie: string | null;
  service: string;
  motif: string;
  resume_sejour: string | null;
  mode_sortie: "domicile" | "transfert" | "deces" | "fugue" | null;
  patients: {
    npi: string;
    nom: string;
    prenom: string;
  };
  etablissements: {
    nom: string;
  } | null;
  users_profiles: {
    nom: string;
    prenom: string;
  } | null;
}

type FilterTab = "actives" | "toutes" | "sorties";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDuree(dateEntree: string, dateSortie: string | null): string {
  const entree = new Date(dateEntree);
  const sortie = dateSortie ? new Date(dateSortie) : new Date();
  const days = Math.max(
    0,
    Math.round((sortie.getTime() - entree.getTime()) / (1000 * 60 * 60 * 24))
  );
  if (days === 0) return "< 1 jour";
  return `${days} jour${days > 1 ? "s" : ""}`;
}

const MODE_SORTIE_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  domicile: {
    label: "Retour domicile",
    className:
      "bg-medical-green/10 text-medical-green border border-medical-green/20",
  },
  transfert: {
    label: "Transfert",
    className:
      "bg-medical-blue/10 text-medical-blue border border-medical-blue/20",
  },
  deces: {
    label: "Décès",
    className:
      "bg-medical-red/10 text-medical-red border border-medical-red/20",
  },
  fugue: {
    label: "Fugue",
    className:
      "bg-medical-orange/10 text-medical-orange border border-medical-orange/20",
  },
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function HospitalisationSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

// ─── Saisir Soins Dialog ──────────────────────────────────────────────────────

interface SoinsDialogProps {
  hospitalisation: HospitalisationRow;
  userId: string;
}

function SoinsInfirmiersDialog({ hospitalisation, userId }: SoinsDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    type_soin: "",
    description: "",
    medicament_administre: "",
    dose: "",
    heure_administration: new Date().toISOString().slice(0, 16),
  });

  function resetForm() {
    setForm({
      type_soin: "",
      description: "",
      medicament_administre: "",
      dose: "",
      heure_administration: new Date().toISOString().slice(0, 16),
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.from("soins_infirmiers").insert({
        hospitalisation_id: hospitalisation.id,
        patient_id: hospitalisation.patient_id,
        infirmier_id: userId,
        type_soin: form.type_soin,
        description: form.description,
        medicament_administre: form.medicament_administre || null,
        dose: form.dose || null,
        heure_administration: form.heure_administration
          ? new Date(form.heure_administration).toISOString()
          : null,
      });
      if (error) throw error;
      toast({
        title: "Soins infirmiers enregistrés",
        description: `Soin « ${form.type_soin} » ajouté avec succès.`,
      });
      resetForm();
      setOpen(false);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: err.message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="shrink-0">
          <Stethoscope className="h-3.5 w-3.5 mr-1.5" />
          Saisir soins
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Saisir soins infirmiers —{" "}
            {hospitalisation.patients.prenom} {hospitalisation.patients.nom}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type_soin">Type de soin *</Label>
            <Input
              id="type_soin"
              placeholder="Ex : Pansement, Perfusion, Prise de constantes…"
              value={form.type_soin}
              onChange={(e) => setForm({ ...form, type_soin: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Détail du soin effectué, observations…"
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="medicament">Médicament administré</Label>
              <Input
                id="medicament"
                placeholder="DCI ou nom commercial"
                value={form.medicament_administre}
                onChange={(e) =>
                  setForm({ ...form, medicament_administre: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dose">Dose</Label>
              <Input
                id="dose"
                placeholder="Ex : 500 mg, 1 comprimé…"
                value={form.dose}
                onChange={(e) => setForm({ ...form, dose: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="heure_administration">Heure d'administration *</Label>
            <Input
              id="heure_administration"
              type="datetime-local"
              value={form.heure_administration}
              onChange={(e) =>
                setForm({ ...form, heure_administration: e.target.value })
              }
              required
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                setOpen(false);
              }}
            >
              Annuler
            </Button>
            <Button type="submit" variant="medical" disabled={submitting}>
              {submitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HospitalisationsPage() {
  const { user, loading: userLoading } = useUser();
  const [hospitalisations, setHospitalisations] = useState<
    HospitalisationRow[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("actives");

  const isSuperAdmin = user?.role === "super_admin";
  const isAdmin = user?.role === "admin_etablissement";
  const isMedecin = user?.role === "medecin";
  const isInfirmier = user?.role === "infirmier";
  const canSaisirSoins = isMedecin || isInfirmier || isSuperAdmin || isAdmin;

  const fetchHospitalisations = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let req = supabase
      .from("hospitalisations")
      .select(
        "*, patients!inner(npi, nom, prenom), etablissements(nom), users_profiles!medecin_referent_id(nom, prenom)"
      )
      .is("deleted_at", null)
      .order("date_entree", { ascending: false })
      .limit(100);

    // Scope to établissement for non-super-admin
    if (!isSuperAdmin && user.etablissement_id) {
      req = req.eq("etablissement_id", user.etablissement_id);
    }

    const { data, error } = await req;
    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur de chargement",
        description: error.message,
      });
    } else {
      setHospitalisations((data as unknown as HospitalisationRow[]) || []);
    }
    setLoading(false);
  }, [user, isSuperAdmin]);

  useEffect(() => {
    if (user) fetchHospitalisations();
  }, [user, fetchHospitalisations]);

  // ── Stats ──────────────────────────────────────────────────────────────────

  const actives = hospitalisations.filter((h) => !h.date_sortie);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sortiesCeMois = hospitalisations.filter(
    (h) =>
      h.date_sortie && new Date(h.date_sortie) >= startOfMonth
  );
  const transferts = hospitalisations.filter(
    (h) => h.mode_sortie === "transfert"
  );

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filtered = hospitalisations.filter((h) => {
    // Tab filter
    if (activeTab === "actives" && h.date_sortie !== null) return false;
    if (activeTab === "sorties" && h.date_sortie === null) return false;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPatient =
        h.patients.nom.toLowerCase().includes(q) ||
        h.patients.prenom.toLowerCase().includes(q) ||
        h.patients.npi.toLowerCase().includes(q);
      const matchService = h.service.toLowerCase().includes(q);
      if (!matchPatient && !matchService) return false;
    }

    return true;
  });

  // ── Tabs ───────────────────────────────────────────────────────────────────

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "actives", label: "Actives", count: actives.length },
    { key: "toutes", label: "Toutes", count: hospitalisations.length },
    {
      key: "sorties",
      label: "Sorties",
      count: hospitalisations.filter((h) => h.date_sortie !== null).length,
    },
  ];

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Hospitalisations & Blocs Opératoires" />

      <div className="p-6 space-y-6 flex-1">
        {/* ── Stats Row ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: "Hospitalisations actives",
              value: loading ? null : actives.length,
              icon: BedDouble,
              colorClass: "border-l-medical-green text-medical-green",
              bgClass: "bg-medical-green/10",
            },
            {
              label: "Sorties ce mois",
              value: loading ? null : sortiesCeMois.length,
              icon: ArrowUpRight,
              colorClass: "border-l-medical-blue text-medical-blue",
              bgClass: "bg-medical-blue/10",
            },
            {
              label: "Transferts",
              value: loading ? null : transferts.length,
              icon: ArrowUpRight,
              colorClass: "border-l-medical-orange text-medical-orange",
              bgClass: "bg-medical-orange/10",
            },
          ].map(({ label, value, icon: Icon, colorClass, bgClass }) => (
            <Card
              key={label}
              className={`border-l-4 ${colorClass.split(" ")[0]}`}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    {value === null ? (
                      <Skeleton className="h-8 w-12 mb-1" />
                    ) : (
                      <p className="text-2xl font-bold">
                        {value.toLocaleString()}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">{label}</p>
                  </div>
                  <div className={`p-3 rounded-full ${bgClass}`}>
                    <Icon
                      className={`h-6 w-6 ${colorClass.split(" ")[1]}`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Toolbar ────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Filter tabs */}
          <div className="flex rounded-lg border overflow-hidden">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === tab.key
                    ? "bg-medical-green text-white"
                    : "bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                {tab.label}
                <span
                  className={`text-xs rounded-full px-1.5 py-0.5 font-mono ${
                    activeTab === tab.key
                      ? "bg-white/20 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par NPI, nom ou service…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* ── Results count ──────────────────────────────────────────────── */}
        {!loading && (
          <p className="text-sm text-muted-foreground -mt-2">
            {filtered.length} hospitalisation{filtered.length !== 1 ? "s" : ""}
          </p>
        )}

        {/* ── List ───────────────────────────────────────────────────────── */}
        <div className="grid gap-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <HospitalisationSkeleton key={i} />
            ))
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <BedDouble className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
              <h3 className="font-semibold text-lg">
                Aucune hospitalisation trouvée
              </h3>
              <p className="text-muted-foreground text-sm">
                {searchQuery
                  ? "Aucun résultat pour ce terme de recherche."
                  : activeTab === "actives"
                  ? "Aucune hospitalisation en cours."
                  : "Aucune hospitalisation enregistrée."}
              </p>
            </div>
          ) : (
            filtered.map((h) => {
              const isOngoing = !h.date_sortie;
              const modeSortie = h.mode_sortie
                ? MODE_SORTIE_CONFIG[h.mode_sortie]
                : null;
              const duree = getDuree(h.date_entree, h.date_sortie);
              const medecin = h.users_profiles;
              const etab = h.etablissements;

              return (
                <Card
                  key={h.id}
                  className={`hover:shadow-md transition-shadow ${
                    isOngoing ? "border-l-4 border-l-medical-green" : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                      {/* Left */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div
                          className={`p-2 rounded-full shrink-0 mt-0.5 ${
                            isOngoing
                              ? "bg-medical-green/10"
                              : "bg-muted"
                          }`}
                        >
                          <BedDouble
                            className={`h-5 w-5 ${
                              isOngoing
                                ? "text-medical-green"
                                : "text-muted-foreground"
                            }`}
                          />
                        </div>

                        <div className="flex-1 min-w-0 space-y-1.5">
                          {/* Patient name + badges */}
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/patients/${h.patients.npi}`}
                              className="font-semibold text-foreground hover:text-medical-green transition-colors"
                            >
                              {h.patients.nom} {h.patients.prenom}
                            </Link>
                            <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                              {h.patients.npi}
                            </span>

                            {/* Status badge */}
                            {isOngoing ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-medical-green/10 text-medical-green border border-medical-green/20">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-medical-green opacity-75" />
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-medical-green" />
                                </span>
                                En cours
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-medical-slate/10 text-medical-slate border border-medical-slate/20">
                                Sorti
                              </span>
                            )}

                            {/* Mode sortie */}
                            {modeSortie && (
                              <span
                                className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${modeSortie.className}`}
                              >
                                {modeSortie.label}
                              </span>
                            )}

                            {/* Durée */}
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {duree}
                            </Badge>
                          </div>

                          {/* Service */}
                          <p className="text-sm font-medium">{h.service}</p>

                          {/* Meta row */}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              Entrée&nbsp;: {formatDate(h.date_entree)}
                            </span>
                            {h.date_sortie && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                Sortie&nbsp;: {formatDate(h.date_sortie)}
                              </span>
                            )}
                            {medecin && (
                              <span className="flex items-center gap-1">
                                <User className="h-3.5 w-3.5" />
                                Dr {medecin.prenom} {medecin.nom}
                              </span>
                            )}
                            {etab && (
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5" />
                                {etab.nom}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: actions */}
                      <div className="flex items-center gap-2 self-start shrink-0">
                        {isOngoing && canSaisirSoins && user && (
                          <SoinsInfirmiersDialog
                            hospitalisation={h}
                            userId={user.id}
                          />
                        )}
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/patients/${h.patients.npi}`}>
                            Dossier
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
