"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";
import { toast } from "@/hooks/use-toast";
import { Header } from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Users,
  Plus,
  Pencil,
  Loader2,
  Hospital,
  ExternalLink,
} from "lucide-react";
import type { Etablissement } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type EtablissementType = "CHU" | "hopital" | "clinique" | "CSP" | "cabinet";

interface EtablissementWithCount extends Etablissement {
  staff_count?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  EtablissementType,
  { label: string; className: string }
> = {
  CHU: {
    label: "CHU",
    className:
      "bg-medical-red/10 text-medical-red border border-medical-red/20",
  },
  hopital: {
    label: "Hôpital",
    className:
      "bg-medical-blue/10 text-medical-blue border border-medical-blue/20",
  },
  clinique: {
    label: "Clinique",
    className:
      "bg-medical-green/10 text-medical-green border border-medical-green/20",
  },
  CSP: {
    label: "CSP",
    className:
      "bg-medical-orange/10 text-medical-orange border border-medical-orange/20",
  },
  cabinet: {
    label: "Cabinet",
    className:
      "bg-medical-slate/10 text-medical-slate border border-medical-slate/20",
  },
};

const ETABLISSEMENT_TYPES: EtablissementType[] = [
  "CHU",
  "hopital",
  "clinique",
  "CSP",
  "cabinet",
];

const DEFAULT_FORM = {
  nom: "",
  type: "" as EtablissementType | "",
  ville: "",
  region: "",
  pays: "Côte d'Ivoire",
  adresse: "",
  telephone: "",
  email: "",
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function EtablissementSkeleton() {
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-20 rounded-full" />
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-3 w-28" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-8 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Add / Edit Dialog ────────────────────────────────────────────────────────

interface EtablissementDialogProps {
  mode: "add" | "edit";
  initial?: EtablissementWithCount;
  onSuccess: () => void;
  trigger: React.ReactNode;
}

function EtablissementDialog({
  mode,
  initial,
  onSuccess,
  trigger,
}: EtablissementDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(
    initial
      ? {
          nom: initial.nom,
          type: initial.type as EtablissementType | "",
          ville: initial.ville,
          region: initial.region,
          pays: initial.pays,
          adresse: initial.adresse ?? "",
          telephone: initial.telephone ?? "",
          email: initial.email ?? "",
        }
      : { ...DEFAULT_FORM }
  );

  // Reset form when dialog opens in add mode
  function handleOpenChange(value: boolean) {
    if (value && mode === "add") setForm({ ...DEFAULT_FORM });
    setOpen(value);
  }

  function set(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.type) {
      toast({
        variant: "destructive",
        title: "Champ requis",
        description: "Veuillez sélectionner un type d'établissement.",
      });
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "add") {
        const { error } = await supabase.from("etablissements").insert({
          nom: form.nom,
          type: form.type as EtablissementType,
          ville: form.ville,
          region: form.region,
          pays: form.pays,
          adresse: form.adresse || null,
          telephone: form.telephone || null,
          email: form.email || null,
          logo_url: null,
          deleted_at: null,
        });
        if (error) throw error;
        toast({
          title: "Établissement ajouté",
          description: `« ${form.nom} » a été créé avec succès.`,
        });
      } else if (initial) {
        const { error } = await supabase
          .from("etablissements")
          .update({
            nom: form.nom,
            type: form.type as EtablissementType,
            ville: form.ville,
            region: form.region,
            pays: form.pays,
            adresse: form.adresse || null,
            telephone: form.telephone || null,
            email: form.email || null,
          })
          .eq("id", initial.id);
        if (error) throw error;
        toast({
          title: "Établissement mis à jour",
          description: `« ${form.nom} » a été modifié.`,
        });
      }
      setOpen(false);
      onSuccess();
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "add"
              ? "Ajouter un établissement"
              : `Modifier — ${initial?.nom}`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom de l'établissement *</Label>
            <Input
              id="nom"
              placeholder="Ex : CHU de Cocody"
              value={form.nom}
              onChange={(e) => set("nom", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Type *</Label>
            <Select
              value={form.type}
              onValueChange={(v) => set("type", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un type…" />
              </SelectTrigger>
              <SelectContent>
                {ETABLISSEMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TYPE_CONFIG[t].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ville">Ville *</Label>
              <Input
                id="ville"
                placeholder="Ex : Abidjan"
                value={form.ville}
                onChange={(e) => set("ville", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">Région *</Label>
              <Input
                id="region"
                placeholder="Ex : Lagunes"
                value={form.region}
                onChange={(e) => set("region", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pays">Pays *</Label>
            <Input
              id="pays"
              value={form.pays}
              onChange={(e) => set("pays", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adresse">Adresse</Label>
            <Input
              id="adresse"
              placeholder="Adresse complète"
              value={form.adresse}
              onChange={(e) => set("adresse", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="telephone">Téléphone</Label>
              <Input
                id="telephone"
                placeholder="+225 XX XX XX XX XX"
                value={form.telephone}
                onChange={(e) => set("telephone", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="contact@etablissement.ci"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" variant="medical" disabled={submitting}>
              {submitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {mode === "add" ? "Créer l'établissement" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EtablissementsPage() {
  const { user, loading: userLoading } = useUser();
  const [etablissements, setEtablissements] = useState<
    EtablissementWithCount[]
  >([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = user?.role === "super_admin";
  const isAdmin = user?.role === "admin_etablissement";
  const canManage = isSuperAdmin || isAdmin;

  const fetchEtablissements = useCallback(async () => {
    setLoading(true);
    const { data: etablData, error } = await supabase
      .from("etablissements")
      .select("*")
      .is("deleted_at", null)
      .order("nom");

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur de chargement",
        description: error.message,
      });
      setLoading(false);
      return;
    }

    const etabs = (etablData as Etablissement[]) || [];

    // Count staff per établissement in one query
    const { data: staffData } = await supabase
      .from("users_profiles")
      .select("etablissement_id")
      .is("deleted_at", null)
      .not("etablissement_id", "is", null);

    const staffCountMap: Record<string, number> = {};
    (staffData || []).forEach((row: { etablissement_id: string | null }) => {
      if (row.etablissement_id) {
        staffCountMap[row.etablissement_id] =
          (staffCountMap[row.etablissement_id] || 0) + 1;
      }
    });

    setEtablissements(
      etabs.map((e) => ({
        ...e,
        staff_count: staffCountMap[e.id] ?? 0,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!userLoading) fetchEtablissements();
  }, [userLoading, fetchEtablissements]);

  // ── Access guard ──────────────────────────────────────────────────────────

  if (!userLoading && !canManage) {
    return (
      <div className="flex flex-col min-h-full">
        <Header title="Établissements de Santé" />
        <div className="flex items-center justify-center flex-1">
          <p className="text-muted-foreground">
            Accès réservé aux administrateurs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Établissements de Santé" />

      <div className="p-6 space-y-6 flex-1">
        {/* ── Top bar ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-serif font-bold">
              Réseau d'établissements
            </h2>
            <p className="text-sm text-muted-foreground">
              {loading
                ? "Chargement…"
                : `${etablissements.length} établissement${
                    etablissements.length !== 1 ? "s" : ""
                  } enregistré${etablissements.length !== 1 ? "s" : ""}`}
            </p>
          </div>

          {isSuperAdmin && (
            <EtablissementDialog
              mode="add"
              onSuccess={fetchEtablissements}
              trigger={
                <Button variant="medical">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un établissement
                </Button>
              }
            />
          )}
        </div>

        {/* ── Stats cards ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card className="border-l-4 border-l-medical-blue col-span-2 sm:col-span-1">
            <CardContent className="p-4">
              {loading ? (
                <Skeleton className="h-8 w-12 mb-1" />
              ) : (
                <p className="text-2xl font-bold">
                  {etablissements.length}
                </p>
              )}
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>

          {ETABLISSEMENT_TYPES.map((t) => {
            const cfg = TYPE_CONFIG[t];
            const count = loading
              ? null
              : etablissements.filter((e) => e.type === t).length;
            return (
              <Card key={t}>
                <CardContent className="p-4">
                  {count === null ? (
                    <Skeleton className="h-8 w-12 mb-1" />
                  ) : (
                    <p className="text-2xl font-bold">{count}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {cfg.label}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ── Grid of cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <EtablissementSkeleton key={i} />
              ))
            : etablissements.length === 0
            ? (
              <div className="col-span-full text-center py-16">
                <Hospital className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
                <h3 className="font-semibold text-lg">
                  Aucun établissement trouvé
                </h3>
                <p className="text-muted-foreground text-sm">
                  Ajoutez le premier établissement du réseau.
                </p>
              </div>
            )
            : etablissements.map((etab) => {
                const typeCfg =
                  TYPE_CONFIG[etab.type as EtablissementType] ??
                  TYPE_CONFIG.cabinet;

                return (
                  <Card
                    key={etab.id}
                    className="hover:shadow-md transition-shadow flex flex-col"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base leading-snug">
                            {etab.nom}
                          </CardTitle>
                          <div className="mt-1.5">
                            <span
                              className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${typeCfg.className}`}
                            >
                              {typeCfg.label}
                            </span>
                          </div>
                        </div>

                        {/* Edit button — super_admin only */}
                        {isSuperAdmin && (
                          <EtablissementDialog
                            mode="edit"
                            initial={etab}
                            onSuccess={fetchEtablissements}
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                title="Modifier"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            }
                          />
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0 flex-1 flex flex-col gap-2">
                      {/* Location */}
                      <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>
                          {etab.ville}
                          {etab.region ? `, ${etab.region}` : ""}
                          {etab.pays ? ` — ${etab.pays}` : ""}
                        </span>
                      </div>

                      {/* Address */}
                      {etab.adresse && (
                        <p className="text-xs text-muted-foreground pl-5">
                          {etab.adresse}
                        </p>
                      )}

                      {/* Contact */}
                      <div className="space-y-1">
                        {etab.telephone && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            <span>{etab.telephone}</span>
                          </div>
                        )}
                        {etab.email && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{etab.email}</span>
                          </div>
                        )}
                      </div>

                      {/* Staff count */}
                      {typeof etab.staff_count === "number" && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Users className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            {etab.staff_count} membre
                            {etab.staff_count !== 1 ? "s" : ""} du personnel
                          </span>
                        </div>
                      )}

                      {/* Action */}
                      <div className="mt-auto pt-3">
                        <Button asChild variant="outline" size="sm" className="w-full">
                          <Link
                            href={`/patients?etablissement=${etab.id}`}
                          >
                            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                            Voir les patients
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
        </div>
      </div>
    </div>
  );
}
