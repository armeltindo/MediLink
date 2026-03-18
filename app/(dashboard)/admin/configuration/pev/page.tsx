"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Syringe, Plus, Loader2, Pencil, ChevronLeft } from "lucide-react";
import Link from "next/link";

interface PEVVaccin {
  id: string;
  nom: string;
  age_cible_mois: number;
  nb_doses: number;
  intervalle_rappel_mois: number | null;
  actif: boolean;
  pays: string;
  created_at: string;
  updated_at: string;
}

const EMPTY_FORM = {
  nom: "",
  age_cible_mois: "",
  nb_doses: "1",
  intervalle_rappel_mois: "",
  pays: "BJ",
  actif: true,
};

export default function PEVConfigPage() {
  const { user } = useUser();
  const [vaccins, setVaccins] = useState<PEVVaccin[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PEVVaccin | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const canEdit = user?.role === "super_admin" || user?.role === "admin_etablissement";

  const loadVaccins = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("pev_reference")
      .select("*")
      .order("age_cible_mois", { ascending: true });
    setVaccins(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadVaccins(); }, [loadVaccins]);

  function openAdd() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(v: PEVVaccin) {
    setEditTarget(v);
    setForm({
      nom: v.nom,
      age_cible_mois: String(v.age_cible_mois),
      nb_doses: String(v.nb_doses),
      intervalle_rappel_mois: v.intervalle_rappel_mois !== null ? String(v.intervalle_rappel_mois) : "",
      pays: v.pays,
      actif: v.actif,
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        nom: form.nom,
        age_cible_mois: parseInt(form.age_cible_mois),
        nb_doses: parseInt(form.nb_doses),
        intervalle_rappel_mois: form.intervalle_rappel_mois ? parseInt(form.intervalle_rappel_mois) : null,
        pays: form.pays,
        actif: form.actif,
        updated_at: new Date().toISOString(),
      };

      if (editTarget) {
        const { error } = await supabase.from("pev_reference").update(payload).eq("id", editTarget.id);
        if (error) throw error;
        toast({ title: "Vaccin mis à jour" });
      } else {
        const { error } = await supabase.from("pev_reference").insert({ ...payload, created_at: new Date().toISOString() });
        if (error) throw error;
        toast({ title: "Vaccin ajouté au PEV" });
      }
      setDialogOpen(false);
      loadVaccins();
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Erreur", description: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActif(v: PEVVaccin) {
    const { error } = await supabase
      .from("pev_reference")
      .update({ actif: !v.actif, updated_at: new Date().toISOString() })
      .eq("id", v.id);
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    } else {
      toast({ title: v.actif ? "Vaccin désactivé" : "Vaccin activé" });
      loadVaccins();
    }
  }

  function formatAge(mois: number) {
    if (mois === 0) return "Naissance";
    if (mois < 12) return `${mois} mois`;
    const annees = Math.floor(mois / 12);
    const reste = mois % 12;
    return reste > 0 ? `${annees} an${annees > 1 ? "s" : ""} ${reste} mois` : `${annees} an${annees > 1 ? "s" : ""}`;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Configuration PEV" subtitle="Programme Élargi de Vaccination — calendrier de référence" />
      <main className="flex-1 p-6 space-y-6 max-w-5xl mx-auto w-full">

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin"><ChevronLeft className="h-4 w-4 mr-1" />Administration</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Syringe className="h-5 w-5 text-medical-green" />
                Calendrier vaccinal PEV
                <Badge variant="outline">{vaccins.filter((v) => v.actif).length} actifs</Badge>
              </CardTitle>
              {canEdit && (
                <Button variant="medical" size="sm" onClick={openAdd}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Ajouter vaccin
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : vaccins.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Syringe className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Aucun vaccin configuré dans le PEV</p>
                {canEdit && (
                  <Button variant="medical" size="sm" className="mt-4" onClick={openAdd}>
                    <Plus className="h-4 w-4 mr-1.5" />Ajouter le premier vaccin
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="text-left py-2 px-3 font-medium">Vaccin</th>
                      <th className="text-left py-2 px-3 font-medium">Âge cible</th>
                      <th className="text-center py-2 px-3 font-medium">Doses</th>
                      <th className="text-left py-2 px-3 font-medium">Rappel</th>
                      <th className="text-left py-2 px-3 font-medium">Pays</th>
                      <th className="text-center py-2 px-3 font-medium">Statut</th>
                      {canEdit && <th className="text-right py-2 px-3 font-medium">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {vaccins.map((v) => (
                      <tr key={v.id} className={`border-b hover:bg-muted/30 ${!v.actif ? "opacity-50" : ""}`}>
                        <td className="py-3 px-3 font-semibold">{v.nom}</td>
                        <td className="py-3 px-3 text-muted-foreground">{formatAge(v.age_cible_mois)}</td>
                        <td className="py-3 px-3 text-center">
                          <Badge variant="outline">{v.nb_doses} dose{v.nb_doses > 1 ? "s" : ""}</Badge>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {v.intervalle_rappel_mois
                            ? `Tous les ${formatAge(v.intervalle_rappel_mois)}`
                            : <span className="italic text-xs">Aucun rappel</span>}
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant="outline" className="text-xs">{v.pays}</Badge>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {canEdit ? (
                            <Switch
                              checked={v.actif}
                              onCheckedChange={() => toggleActif(v)}
                              className="data-[state=checked]:bg-medical-green"
                            />
                          ) : (
                            <Badge variant={v.actif ? "success" : "outline"}>
                              {v.actif ? "Actif" : "Désactivé"}
                            </Badge>
                          )}
                        </td>
                        {canEdit && (
                          <td className="py-3 px-3 text-right">
                            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => openEdit(v)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add / Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editTarget ? "Modifier le vaccin PEV" : "Ajouter un vaccin PEV"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label>Nom du vaccin *</Label>
                <Input
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  placeholder="Ex: BCG, DTCHepB-Hib, VPO..."
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Âge cible (mois) *</Label>
                  <Input
                    type="number" min={0}
                    value={form.age_cible_mois}
                    onChange={(e) => setForm({ ...form, age_cible_mois: e.target.value })}
                    placeholder="0 = naissance"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>Nombre de doses *</Label>
                  <Input
                    type="number" min={1} max={10}
                    value={form.nb_doses}
                    onChange={(e) => setForm({ ...form, nb_doses: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Intervalle rappel (mois)</Label>
                  <Input
                    type="number" min={1}
                    value={form.intervalle_rappel_mois}
                    onChange={(e) => setForm({ ...form, intervalle_rappel_mois: e.target.value })}
                    placeholder="Laisser vide si aucun"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Pays (code ISO)</Label>
                  <Input
                    value={form.pays}
                    onChange={(e) => setForm({ ...form, pays: e.target.value.toUpperCase().substring(0, 2) })}
                    placeholder="BJ"
                    maxLength={2}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.actif}
                  onCheckedChange={(v) => setForm({ ...form, actif: v })}
                  className="data-[state=checked]:bg-medical-green"
                />
                <Label className="cursor-pointer">Vaccin actif dans le calendrier</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
                <Button type="submit" variant="medical" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                  {editTarget ? "Mettre à jour" : "Ajouter"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
}
