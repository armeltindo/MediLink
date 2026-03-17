"use client";
import { useState } from "react";
import { Patient, Hospitalisation } from "@/types";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge, BadgeVariant } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BedDouble, Plus, Loader2, Calendar } from "lucide-react";

const SERVICES = [
  "Médecine interne", "Chirurgie générale", "Maternité / Obstétrique",
  "Pédiatrie", "Cardiologie", "Pneumologie", "Neurologie", "Urologie",
  "Orthopédie / Traumatologie", "Oncologie", "Réanimation / USI",
  "Soins intensifs néonatals", "Psychiatrie", "Dermatologie",
  "ORL", "Ophtalmologie", "Urgences",
];

interface HospitalisationsTabProps {
  patient: Patient;
  hospitalisations: Hospitalisation[];
  onRefresh: () => void;
}

export function HospitalisationsTab({ patient, hospitalisations, onRefresh }: HospitalisationsTabProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  const canCreate = user?.role === "medecin" || user?.role === "super_admin" || user?.role === "admin_etablissement";

  const [etablissements, setEtablissements] = useState<{ id: string; nom: string }[]>([]);
  const [form, setForm] = useState({
    service: "", motif: "", date_entree: new Date().toISOString().split("T")[0],
    date_sortie: "", resume_sejour: "", mode_sortie: "", etablissement_id: "",
  });

  useState(() => {
    supabase.from("etablissements").select("id, nom").then(({ data }) => setEtablissements(data || []));
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const { error } = await supabase.from("hospitalisations").insert({
        patient_id: patient.id,
        medecin_referent_id: user.id,
        etablissement_id: form.etablissement_id || etablissements[0]?.id,
        service: form.service,
        motif: form.motif,
        date_entree: new Date(form.date_entree).toISOString(),
        date_sortie: form.date_sortie ? new Date(form.date_sortie).toISOString() : null,
        resume_sejour: form.resume_sejour || null,
        mode_sortie: form.mode_sortie || null,
      });

      if (error) throw error;
      toast({ title: "Hospitalisation enregistrée" });
      setOpen(false);
      onRefresh();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Erreur";
      toast({ variant: "destructive", title: "Erreur", description: msg });
    } finally {
      setLoading(false);
    }
  }

  const modeSortieConfig: Record<string, { label: string; variant: BadgeVariant }> = {
    domicile: { label: "Retour à domicile", variant: "success" },
    transfert: { label: "Transfert", variant: "info" },
    deces: { label: "Décès", variant: "danger" },
    fugue: { label: "Fugue", variant: "warning" },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          Hospitalisations ({hospitalisations.length})
        </h3>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="medical" size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Enregistrer hospitalisation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Hospitalisation — {patient.prenom} {patient.nom}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Service *</Label>
                    <Input
                      value={form.service}
                      onChange={(e) => setForm({ ...form, service: e.target.value })}
                      placeholder="Ex: Médecine interne"
                      list="services-list"
                      required
                    />
                    <datalist id="services-list">
                      {SERVICES.map((s) => <option key={s} value={s} />)}
                    </datalist>
                  </div>
                  <div className="space-y-2">
                    <Label>Établissement</Label>
                    <Select onValueChange={(v) => setForm({ ...form, etablissement_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                      <SelectContent>
                        {etablissements.map((e) => <SelectItem key={e.id} value={e.id}>{e.nom}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date d&apos;entrée *</Label>
                    <Input type="date" value={form.date_entree} onChange={(e) => setForm({ ...form, date_entree: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Date de sortie</Label>
                    <Input type="date" value={form.date_sortie} onChange={(e) => setForm({ ...form, date_sortie: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Motif d&apos;hospitalisation *</Label>
                  <Input value={form.motif} onChange={(e) => setForm({ ...form, motif: e.target.value })} required placeholder="Raison principale de l'hospitalisation" />
                </div>
                <div className="space-y-2">
                  <Label>Résumé du séjour</Label>
                  <Textarea value={form.resume_sejour} onChange={(e) => setForm({ ...form, resume_sejour: e.target.value })} rows={3} placeholder="Évolution, traitements, actes..." />
                </div>
                {form.date_sortie && (
                  <div className="space-y-2">
                    <Label>Mode de sortie</Label>
                    <Select onValueChange={(v) => setForm({ ...form, mode_sortie: v })}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="domicile">Retour à domicile</SelectItem>
                        <SelectItem value="transfert">Transfert inter-établissement</SelectItem>
                        <SelectItem value="deces">Décès</SelectItem>
                        <SelectItem value="fugue">Fugue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                  <Button type="submit" variant="medical" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Enregistrer
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {hospitalisations.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BedDouble className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Aucune hospitalisation enregistrée</p>
        </div>
      ) : (
        <div className="space-y-3">
          {hospitalisations.map((h) => {
            const isOngoing = !h.date_sortie;
            const modeSortie = h.mode_sortie ? modeSortieConfig[h.mode_sortie] : null;

            // Calculate stay duration
            const entree = new Date(h.date_entree);
            const sortie = h.date_sortie ? new Date(h.date_sortie) : new Date();
            const duree = Math.round((sortie.getTime() - entree.getTime()) / (1000 * 60 * 60 * 24));

            return (
              <Card key={h.id} className={`overflow-hidden ${isOngoing ? "border-medical-green" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <BedDouble className={`h-5 w-5 flex-shrink-0 mt-0.5 ${isOngoing ? "text-medical-green" : "text-muted-foreground"}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{h.service}</span>
                        {isOngoing ? (
                          <Badge className="bg-medical-green-light text-medical-green">En cours</Badge>
                        ) : (
                          modeSortie && <Badge variant={modeSortie.variant}>{modeSortie.label}</Badge>
                        )}
                        <Badge variant="outline" className="text-xs">{duree} jour{duree > 1 ? "s" : ""}</Badge>
                      </div>
                      <p className="text-sm mt-1">{h.motif}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Entrée : {formatDate(h.date_entree)}
                        </span>
                        {h.date_sortie && (
                          <span>Sortie : {formatDate(h.date_sortie)}</span>
                        )}
                      </div>
                      {h.resume_sejour && (
                        <p className="text-xs text-muted-foreground mt-2 border-t pt-2">
                          {h.resume_sejour}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
