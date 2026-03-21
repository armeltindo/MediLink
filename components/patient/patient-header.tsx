"use client";
import { useState, useRef } from "react";
import { Patient, Allergie } from "@/types";
import { formatDate, formatAge, getBloodGroupColor } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertTriangle, Calendar, MapPin, Briefcase,
  Phone, Shield, QrCode, Download, ShieldAlert,
  FileText, Camera, Loader2, Pencil, ChevronDown,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";
import { toast } from "@/hooks/use-toast";

interface PatientHeaderProps {
  patient: Patient;
  allergies: Allergie[];
  onExportPDF?: () => void;
  onShowQR?: () => void;
  onBreakGlass?: () => void;
  onLettreRef?: () => void;
  onPhotoUpdate?: (newUrl: string) => void;
  onPatientUpdate?: (updated: Patient) => void;
}

export function PatientHeader({
  patient, allergies, onExportPDF, onShowQR, onBreakGlass,
  onLettreRef, onPhotoUpdate, onPatientUpdate,
}: PatientHeaderProps) {
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState(patient.photo_url || "");
  const [uploading, setUploading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nom: patient.nom,
    prenom: patient.prenom,
    date_naissance: patient.date_naissance,
    lieu_naissance: patient.lieu_naissance || "",
    sexe: patient.sexe,
    situation_matrimoniale: patient.situation_matrimoniale || "",
    nombre_enfants: patient.nombre_enfants?.toString() || "",
    nationalite: patient.nationalite || "Béninoise",
    ethnie: patient.ethnie || "",
    profession: patient.profession || "",
    niveau_etudes: patient.niveau_etudes || "",
    langue_preferee: patient.langue_preferee || "Français",
    groupe_sanguin: patient.groupe_sanguin || "",
    rhesus: patient.rhesus || "",
    contact_urgence_nom: patient.contact_urgence_nom || "",
    contact_urgence_lien: patient.contact_urgence_lien || "",
    contact_urgence_tel: patient.contact_urgence_tel || "",
    assurance_organisme: patient.assurance_organisme || "",
    assurance_numero: patient.assurance_numero || "",
    assurance_taux: patient.assurance_taux?.toString() || "",
  });

  const canEdit = user?.role === "super_admin" || user?.role === "admin_etablissement" || user?.role === "medecin";
  const isMale = patient.sexe === "M";

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Fichier trop volumineux", description: "La photo ne doit pas dépasser 5 Mo." });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `patients/${patient.nip}/photo_${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("photos").upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from("photos").getPublicUrl(path);
      const { error: updateErr } = await supabase.from("patients").update({ photo_url: publicUrl }).eq("id", patient.id);
      if (updateErr) throw updateErr;
      setPhotoUrl(publicUrl);
      onPhotoUpdate?.(publicUrl);
      toast({ title: "Photo mise à jour" });
    } catch (err) {
      toast({ variant: "destructive", title: "Erreur", description: err instanceof Error ? err.message : "Erreur lors de l'upload" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        nom: form.nom.trim(),
        prenom: form.prenom.trim(),
        date_naissance: form.date_naissance,
        lieu_naissance: form.lieu_naissance || null,
        sexe: form.sexe as "M" | "F",
        situation_matrimoniale: form.situation_matrimoniale || null,
        nombre_enfants: form.nombre_enfants ? parseInt(form.nombre_enfants) : null,
        nationalite: form.nationalite || null,
        ethnie: form.ethnie || null,
        profession: form.profession || null,
        niveau_etudes: form.niveau_etudes || null,
        langue_preferee: form.langue_preferee || null,
        groupe_sanguin: form.groupe_sanguin || null,
        rhesus: (form.rhesus || null) as "+" | "-" | null,
        contact_urgence_nom: form.contact_urgence_nom || null,
        contact_urgence_lien: form.contact_urgence_lien || null,
        contact_urgence_tel: form.contact_urgence_tel || null,
        assurance_organisme: form.assurance_organisme || null,
        assurance_numero: form.assurance_numero || null,
        assurance_taux: form.assurance_taux ? parseFloat(form.assurance_taux) : null,
      };

      const { data, error } = await supabase
        .from("patients")
        .update(payload)
        .eq("id", patient.id)
        .select()
        .single();

      if (error) throw error;
      toast({ title: "Fiche patient mise à jour" });
      setEditOpen(false);
      onPatientUpdate?.(data as Patient);
    } catch (err) {
      toast({ variant: "destructive", title: "Erreur", description: err instanceof Error ? err.message : "Erreur lors de la mise à jour" });
    } finally {
      setSaving(false);
    }
  }

  const activeAllergies = allergies.filter((a) => a.actif);
  const anaphylacticAllergies = activeAllergies.filter((a) => a.severite === "anaphylactique");
  const bloodGroupFull = patient.groupe_sanguin && patient.rhesus
    ? `${patient.groupe_sanguin}${patient.rhesus}`
    : patient.groupe_sanguin;

  return (
    <div className="bg-card border-b sticky top-16 z-20 shadow-sm">

      {/* Anaphylactic allergy banner */}
      {anaphylacticAllergies.length > 0 && (
        <div className="bg-red-600 text-white px-6 py-2.5 flex items-center gap-2.5 text-sm font-semibold">
          <AlertTriangle className="h-4 w-4 animate-pulse shrink-0" />
          ALLERGIE ANAPHYLACTIQUE :{" "}
          {anaphylacticAllergies.map((a) => a.substance).join(", ")}
        </div>
      )}

      <div className="px-6 py-4">
        <div className="flex items-start gap-5">

          {/* Avatar */}
          <div className="relative shrink-0 group">
            <Avatar
              className={`h-20 w-20 border-2 ring-2 ring-offset-2 ${
                isMale
                  ? "ring-blue-200 border-blue-300 dark:ring-blue-800"
                  : "ring-pink-200 border-pink-300 dark:ring-pink-800"
              }`}
            >
              <AvatarImage src={photoUrl} alt={patient.nom} />
              <AvatarFallback
                className={`text-2xl font-bold ${
                  isMale
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                    : "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300"
                }`}
              >
                {patient.prenom?.[0]}{patient.nom?.[0]}
              </AvatarFallback>
            </Avatar>
            {/* Sex indicator dot */}
            <span
              className={`absolute bottom-0.5 right-0.5 h-5 w-5 rounded-full border-2 border-card flex items-center justify-center text-[9px] font-bold text-white ${
                isMale ? "bg-blue-500" : "bg-pink-500"
              }`}
            >
              {patient.sexe}
            </span>
            {canEdit && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Modifier la photo"
                >
                  {uploading
                    ? <Loader2 className="h-5 w-5 text-white animate-spin" />
                    : <Camera className="h-5 w-5 text-white" />}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </>
            )}
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-0">
            {/* Name row */}
            <div className="flex items-start gap-3 flex-wrap mb-2">
              <div>
                <h1 className="text-2xl font-bold leading-tight">
                  {patient.prenom}{" "}
                  <span className="uppercase">{patient.nom}</span>
                </h1>
                <code className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded mt-0.5 inline-block">
                  {patient.nip}
                </code>
              </div>

              {/* Blood group + allergies */}
              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                {bloodGroupFull && (
                  <span className={`text-sm font-bold text-white px-2.5 py-1 rounded-lg ${getBloodGroupColor(bloodGroupFull)}`}>
                    {bloodGroupFull}
                  </span>
                )}
                {activeAllergies.slice(0, 3).map((a) => (
                  <Badge key={a.id} variant="danger" className="gap-1 text-xs">
                    <AlertTriangle className="h-3 w-3" />
                    {a.substance}
                  </Badge>
                ))}
                {activeAllergies.length > 3 && (
                  <Badge variant="danger" className="text-xs">
                    +{activeAllergies.length - 3}
                  </Badge>
                )}
              </div>
            </div>

            {/* Info chips */}
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                {formatDate(patient.date_naissance)}
                <span className="text-muted-foreground/40">·</span>
                <span className="font-medium text-foreground">{formatAge(patient.date_naissance)}</span>
              </span>

              {patient.lieu_naissance && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {patient.lieu_naissance}
                </span>
              )}

              {patient.profession && (
                <span className="flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 shrink-0" />
                  {patient.profession}
                </span>
              )}

              {patient.contact_urgence_tel && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                  <span className="font-medium text-rose-600 dark:text-rose-400">
                    {patient.contact_urgence_nom}
                    {patient.contact_urgence_lien && (
                      <span className="font-normal text-muted-foreground"> ({patient.contact_urgence_lien})</span>
                    )}
                    {" — "}{patient.contact_urgence_tel}
                  </span>
                </span>
              )}

              {patient.assurance_organisme && (
                <span className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">
                    {patient.assurance_organisme}
                    {patient.assurance_taux != null && ` — ${patient.assurance_taux}%`}
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {(onShowQR || onExportPDF || onLettreRef) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    Actions
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {onShowQR && (
                    <DropdownMenuItem onClick={onShowQR}>
                      <QrCode className="h-4 w-4 mr-2" />
                      QR Code patient
                    </DropdownMenuItem>
                  )}
                  {onExportPDF && (
                    <DropdownMenuItem onClick={onExportPDF}>
                      <Download className="h-4 w-4 mr-2" />
                      Exporter en PDF
                    </DropdownMenuItem>
                  )}
                  {onLettreRef && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onLettreRef}>
                        <FileText className="h-4 w-4 mr-2" />
                        Lettre de référence
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {canEdit && (
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Pencil className="h-3.5 w-3.5" />
                    Modifier
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      Modifier — {patient.prenom} {patient.nom}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSave} className="space-y-6">

                    <fieldset className="space-y-3">
                      <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-1 border-b w-full">
                        Identité civile
                      </legend>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label>Nom *</Label>
                          <Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required />
                        </div>
                        <div className="space-y-1">
                          <Label>Prénom *</Label>
                          <Input value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} required />
                        </div>
                        <div className="space-y-1">
                          <Label>Date de naissance *</Label>
                          <Input type="date" value={form.date_naissance} onChange={(e) => setForm({ ...form, date_naissance: e.target.value })} required />
                        </div>
                        <div className="space-y-1">
                          <Label>Lieu de naissance</Label>
                          <Input value={form.lieu_naissance} onChange={(e) => setForm({ ...form, lieu_naissance: e.target.value })} placeholder="Ville, Pays" />
                        </div>
                        <div className="space-y-1">
                          <Label>Sexe *</Label>
                          <Select value={form.sexe} onValueChange={(v) => setForm({ ...form, sexe: v as "M" | "F" })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="M">Masculin</SelectItem>
                              <SelectItem value="F">Féminin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label>Situation matrimoniale</Label>
                          <Select value={form.situation_matrimoniale} onValueChange={(v) => setForm({ ...form, situation_matrimoniale: v })}>
                            <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="celibataire">Célibataire</SelectItem>
                              <SelectItem value="marie">Marié(e)</SelectItem>
                              <SelectItem value="divorce">Divorcé(e)</SelectItem>
                              <SelectItem value="veuf">Veuf / Veuve</SelectItem>
                              <SelectItem value="union_libre">Union libre</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {form.sexe === "F" && (
                          <div className="space-y-1">
                            <Label>Nombre d&apos;enfants</Label>
                            <Input type="number" min={0} value={form.nombre_enfants} onChange={(e) => setForm({ ...form, nombre_enfants: e.target.value })} />
                          </div>
                        )}
                        <div className="space-y-1">
                          <Label>Nationalité</Label>
                          <Input value={form.nationalite} onChange={(e) => setForm({ ...form, nationalite: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <Label>Profession</Label>
                          <Input value={form.profession} onChange={(e) => setForm({ ...form, profession: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <Label>Niveau d&apos;études</Label>
                          <Select value={form.niveau_etudes} onValueChange={(v) => setForm({ ...form, niveau_etudes: v })}>
                            <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                            <SelectContent>
                              {["aucun","primaire","college","lycee","bts","licence","master","doctorat"].map((v) => (
                                <SelectItem key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label>Langue préférée</Label>
                          <Select value={form.langue_preferee} onValueChange={(v) => setForm({ ...form, langue_preferee: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {["Français","Fon","Yoruba","Dendi","Bariba","Anglais"].map((l) => (
                                <SelectItem key={l} value={l}>{l}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </fieldset>

                    <fieldset className="space-y-3">
                      <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-1 border-b w-full">
                        Données biologiques
                      </legend>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label>Groupe sanguin</Label>
                          <Select value={form.groupe_sanguin} onValueChange={(v) => setForm({ ...form, groupe_sanguin: v })}>
                            <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                            <SelectContent>
                              {["A","B","AB","O"].map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label>Rhésus</Label>
                          <Select value={form.rhesus} onValueChange={(v) => setForm({ ...form, rhesus: v })}>
                            <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="+">Positif (+)</SelectItem>
                              <SelectItem value="-">Négatif (−)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </fieldset>

                    <fieldset className="space-y-3">
                      <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-1 border-b w-full">
                        Contact d&apos;urgence
                      </legend>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label>Nom complet</Label>
                          <Input value={form.contact_urgence_nom} onChange={(e) => setForm({ ...form, contact_urgence_nom: e.target.value })} placeholder="Nom Prénom" />
                        </div>
                        <div className="space-y-1">
                          <Label>Lien de parenté</Label>
                          <Select value={form.contact_urgence_lien} onValueChange={(v) => setForm({ ...form, contact_urgence_lien: v })}>
                            <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                            <SelectContent>
                              {["Époux/Épouse","Père","Mère","Frère","Sœur","Fils/Fille","Ami(e)","Autre"].map((l) => (
                                <SelectItem key={l} value={l}>{l}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1 col-span-2">
                          <Label>Téléphone</Label>
                          <Input value={form.contact_urgence_tel} onChange={(e) => setForm({ ...form, contact_urgence_tel: e.target.value })} placeholder="+229 XX XX XX XX" />
                        </div>
                      </div>
                    </fieldset>

                    <fieldset className="space-y-3">
                      <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-1 border-b w-full">
                        Assurance maladie
                      </legend>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label>Organisme</Label>
                          <Input value={form.assurance_organisme} onChange={(e) => setForm({ ...form, assurance_organisme: e.target.value })} placeholder="Ex: RAMU, CNSS…" />
                        </div>
                        <div className="space-y-1">
                          <Label>Numéro de police</Label>
                          <Input value={form.assurance_numero} onChange={(e) => setForm({ ...form, assurance_numero: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <Label>Taux de couverture (%)</Label>
                          <Input type="number" min={0} max={100} value={form.assurance_taux} onChange={(e) => setForm({ ...form, assurance_taux: e.target.value })} placeholder="Ex: 80" />
                        </div>
                      </div>
                    </fieldset>

                    <div className="flex justify-end gap-2 pt-2 border-t">
                      <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Annuler</Button>
                      <Button type="submit" variant="medical" disabled={saving || !form.nom || !form.prenom}>
                        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Enregistrer les modifications
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}

            {onBreakGlass && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBreakGlass}
                className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                Urgence
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
