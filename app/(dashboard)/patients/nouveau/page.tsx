"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { generateNPI } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, UserPlus, Copy, Check, Camera, AlertTriangle } from "lucide-react";

const patientSchema = z.object({
  nom: z.string().min(2, "Nom requis"),
  prenom: z.string().min(2, "Prénom requis"),
  date_naissance: z.string().min(1, "Date de naissance requise"),
  lieu_naissance: z.string().optional(),
  sexe: z.enum(["M", "F"]),
  situation_matrimoniale: z.string().optional(),
  nombre_enfants: z.coerce.number().min(0).optional(),
  groupe_sanguin: z.string().optional(),
  rhesus: z.string().optional(),
  nationalite: z.string().optional(),
  ethnie: z.string().optional(),
  profession: z.string().optional(),
  niveau_etudes: z.string().optional(),
  langue_preferee: z.string().optional(),
  contact_urgence_nom: z.string().optional(),
  contact_urgence_lien: z.string().optional(),
  contact_urgence_tel: z.string().optional(),
  assurance_organisme: z.string().optional(),
  assurance_numero: z.string().optional(),
  assurance_taux: z.coerce.number().min(0).max(100).optional(),
});

type PatientFormData = z.infer<typeof patientSchema>;

export default function NouveauPatientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [npi] = useState(() => generateNPI());
  const [npiCopied, setNpiCopied] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<{ id: string; npi: string; nom: string; prenom: string; date_naissance: string }[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PatientFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(patientSchema) as any,
    defaultValues: {
      nationalite: "Béninoise",
      langue_preferee: "Français",
      nombre_enfants: 0,
    },
  });

  const scrollToFirstError = useCallback((errs: Record<string, unknown>) => {
    const firstKey = Object.keys(errs)[0];
    if (!firstKey) return;
    const el = document.getElementById(firstKey);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      (el as HTMLElement).focus?.();
    }
  }, []);

  const sexe = watch("sexe");
  const watchedNom = watch("nom");
  const watchedPrenom = watch("prenom");
  const watchedDOB = watch("date_naissance");

  // Debounced duplicate check
  useEffect(() => {
    if (!watchedNom || !watchedPrenom || watchedNom.length < 2 || watchedPrenom.length < 2) {
      setDuplicates([]);
      return;
    }
    const timer = setTimeout(async () => {
      setCheckingDuplicates(true);
      const { data } = await supabase
        .from("patients")
        .select("id, npi, nom, prenom, date_naissance")
        .ilike("nom", `%${watchedNom}%`)
        .ilike("prenom", `%${watchedPrenom}%`)
        .is("deleted_at", null)
        .limit(5);
      setDuplicates(data || []);
      setCheckingDuplicates(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [watchedNom, watchedPrenom, watchedDOB]);

  function copyNPI() {
    navigator.clipboard.writeText(npi);
    setNpiCopied(true);
    setTimeout(() => setNpiCopied(false), 2000);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function onSubmit(data: PatientFormData) {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      let photoUrl: string | undefined = undefined;
      if (photoFile) {
        const photoPath = `patients/${npi}/photo_${Date.now()}.${photoFile.name.split(".").pop()}`;
        const { error: uploadErr } = await supabase.storage.from("documents").upload(photoPath, photoFile);
        if (!uploadErr) {
          const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(photoPath);
          photoUrl = publicUrl;
        }
      }

      const { data: patient, error } = await supabase.from("patients").insert({
        ...data,
        npi,
        created_by: user.id,
        ...(photoUrl ? { photo_url: photoUrl } : {}),
      }).select().single();

      if (error) throw error;

      // Log audit
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        patient_id: patient.id,
        action: "create_patient",
        details: JSON.stringify({ npi }),
        timestamp: new Date().toISOString(),
      });

      toast({ title: "Patient enregistré", description: `${data.prenom} ${data.nom} — ${npi}` });
      router.push(`/patients/${npi}`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Erreur";
      toast({ variant: "destructive", title: "Erreur", description: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Enregistrement patient" />

      <div className="p-6 max-w-4xl mx-auto w-full space-y-6">
        {/* NPI Banner */}
        <div className="bg-medical-green-light border border-medical-green/20 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-medical-green font-medium uppercase tracking-wide mb-1">
              Numéro Personnel d&apos;Identification — généré automatiquement
            </p>
            <p className="text-2xl font-mono font-bold text-medical-green">{npi}</p>
          </div>
          <Button variant="outline" size="sm" onClick={copyNPI} className="border-medical-green text-medical-green">
            {npiCopied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            {npiCopied ? "Copié !" : "Copier"}
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit, scrollToFirstError)} className="space-y-6">
          {/* Identité */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Identité civile</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Photo upload */}
              <div className="md:col-span-2 flex items-center gap-4">
                <div className="relative">
                  <div className="h-20 w-20 rounded-full border-2 border-dashed border-border overflow-hidden bg-muted flex items-center justify-center">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Aperçu" className="h-full w-full object-cover" />
                    ) : (
                      <Camera className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="photo">Photo du patient</Label>
                  <Input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="text-sm w-fit"
                  />
                  <p className="text-xs text-muted-foreground">JPG, PNG — max 5 Mo (optionnel)</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nom">Nom de famille *</Label>
                <Input id="nom" {...register("nom")} placeholder="KONAN" className="uppercase" />
                {errors.nom && <p className="text-xs text-destructive">{errors.nom.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="prenom">Prénom(s) *</Label>
                <Input id="prenom" {...register("prenom")} placeholder="Kouassi Yao" />
                {errors.prenom && <p className="text-xs text-destructive">{errors.prenom.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_naissance">Date de naissance *</Label>
                <Input id="date_naissance" type="date" {...register("date_naissance")} />
                {errors.date_naissance && <p className="text-xs text-destructive">{errors.date_naissance.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lieu_naissance">Lieu de naissance</Label>
                <Input id="lieu_naissance" {...register("lieu_naissance")} placeholder="Abidjan" />
              </div>
              <div id="sexe" className="space-y-2">
                <Label>Sexe *</Label>
                <Select onValueChange={(v) => setValue("sexe", v as "M" | "F")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculin</SelectItem>
                    <SelectItem value="F">Féminin</SelectItem>
                  </SelectContent>
                </Select>
                {errors.sexe && <p className="text-xs text-destructive">Sexe requis</p>}
              </div>
              <div className="space-y-2">
                <Label>Situation matrimoniale</Label>
                <Select onValueChange={(v) => setValue("situation_matrimoniale", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="célibataire">Célibataire</SelectItem>
                    <SelectItem value="marié">Marié(e)</SelectItem>
                    <SelectItem value="divorcé">Divorcé(e)</SelectItem>
                    <SelectItem value="veuf">Veuf/Veuve</SelectItem>
                    <SelectItem value="union_libre">Union libre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {sexe === "F" && (
                <div className="space-y-2">
                  <Label htmlFor="nombre_enfants">Nombre d&apos;enfants</Label>
                  <Input id="nombre_enfants" type="number" min="0" {...register("nombre_enfants")} />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="nationalite">Nationalité</Label>
                <Input id="nationalite" {...register("nationalite")} defaultValue="Béninoise" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ethnie">Ethnie (optionnel)</Label>
                <Input id="ethnie" {...register("ethnie")} placeholder="Baoulé, Dioula..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profession">Profession</Label>
                <Input id="profession" {...register("profession")} placeholder="Enseignant, Commerçant..." />
              </div>
              <div className="space-y-2">
                <Label>Niveau d&apos;études</Label>
                <Select onValueChange={(v) => setValue("niveau_etudes", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aucun">Aucun</SelectItem>
                    <SelectItem value="Primaire">Primaire</SelectItem>
                    <SelectItem value="Collège">Collège (3ème)</SelectItem>
                    <SelectItem value="Lycée">Lycée / Bac</SelectItem>
                    <SelectItem value="BTS">BTS / DUT</SelectItem>
                    <SelectItem value="Licence">Licence</SelectItem>
                    <SelectItem value="Master">Master</SelectItem>
                    <SelectItem value="Doctorat">Doctorat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Langue préférée</Label>
                <Select defaultValue="Français" onValueChange={(v) => setValue("langue_preferee", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Français">Français</SelectItem>
                    <SelectItem value="Dioula">Dioula</SelectItem>
                    <SelectItem value="Baoulé">Baoulé</SelectItem>
                    <SelectItem value="Bété">Bété</SelectItem>
                    <SelectItem value="Anglais">Anglais</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Données biologiques */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Données biologiques</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Groupe sanguin</Label>
                <Select onValueChange={(v) => setValue("groupe_sanguin", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Groupe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="AB">AB</SelectItem>
                    <SelectItem value="O">O</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rhésus</Label>
                <Select onValueChange={(v) => setValue("rhesus", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Rh" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="+">Positif (+)</SelectItem>
                    <SelectItem value="-">Négatif (–)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Contact d'urgence */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact d&apos;urgence</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_urgence_nom">Nom complet</Label>
                <Input id="contact_urgence_nom" {...register("contact_urgence_nom")} placeholder="KONAN Marie" />
              </div>
              <div className="space-y-2">
                <Label>Lien de parenté</Label>
                <Select onValueChange={(v) => setValue("contact_urgence_lien", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Époux/Épouse">Époux/Épouse</SelectItem>
                    <SelectItem value="Père">Père</SelectItem>
                    <SelectItem value="Mère">Mère</SelectItem>
                    <SelectItem value="Frère">Frère</SelectItem>
                    <SelectItem value="Sœur">Sœur</SelectItem>
                    <SelectItem value="Fils/Fille">Fils/Fille</SelectItem>
                    <SelectItem value="Ami(e)">Ami(e)</SelectItem>
                    <SelectItem value="Autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_urgence_tel">Téléphone</Label>
                <Input id="contact_urgence_tel" type="tel" {...register("contact_urgence_tel")} placeholder="+225 07 00 00 00 00" />
              </div>
            </CardContent>
          </Card>

          {/* Assurance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assurance maladie</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assurance_organisme">Organisme</Label>
                <Input id="assurance_organisme" {...register("assurance_organisme")} placeholder="CNPS, MUGEF-CI..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assurance_numero">Numéro de police</Label>
                <Input id="assurance_numero" {...register("assurance_numero")} placeholder="CNPS-2024-00000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assurance_taux">Taux de couverture (%)</Label>
                <Input id="assurance_taux" type="number" min="0" max="100" {...register("assurance_taux")} placeholder="80" />
              </div>
            </CardContent>
          </Card>

          {/* Duplicate warning */}
          {duplicates.length > 0 && (
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                <p className="font-semibold text-yellow-800 text-sm">
                  {checkingDuplicates ? "Vérification en cours..." : `${duplicates.length} patient(s) similaire(s) détecté(s)`}
                </p>
              </div>
              {!checkingDuplicates && duplicates.map((d) => (
                <div key={d.id} className="flex items-center justify-between bg-white rounded p-2 border border-yellow-200">
                  <span className="text-sm text-yellow-900">
                    <strong>{d.prenom} {d.nom}</strong>
                    {d.date_naissance && ` — né(e) le ${new Date(d.date_naissance).toLocaleDateString("fr-FR")}`}
                    <span className="text-xs font-mono ml-2 text-muted-foreground">{d.npi}</span>
                  </span>
                  <a
                    href={`/patients/${d.npi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-medical-green hover:underline ml-2 shrink-0"
                  >
                    Voir dossier →
                  </a>
                </div>
              ))}
              <p className="text-xs text-yellow-700">Vérifiez qu&apos;il ne s&apos;agit pas d&apos;un patient déjà enregistré avant de continuer.</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Annuler
            </Button>
            <Button type="submit" variant="medical" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <UserPlus className="h-4 w-4 mr-2" />
              {duplicates.length > 0 ? "Enregistrer quand même" : "Enregistrer le patient"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
