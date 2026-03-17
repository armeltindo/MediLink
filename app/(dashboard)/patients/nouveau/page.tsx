"use client";
import { useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus, Copy, Check } from "lucide-react";

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
      nationalite: "Ivoirienne",
      langue_preferee: "Français",
      nombre_enfants: 0,
    },
  });

  const sexe = watch("sexe");

  function copyNPI() {
    navigator.clipboard.writeText(npi);
    setNpiCopied(true);
    setTimeout(() => setNpiCopied(false), 2000);
  }

  async function onSubmit(data: PatientFormData) {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data: patient, error } = await supabase.from("patients").insert({
        ...data,
        npi,
        created_by: user.id,
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

      toast({ variant: "success" as any, title: "Patient enregistré", description: `${data.prenom} ${data.nom} — ${npi}` });
      router.push(`/patients/${npi}`);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
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
              Numéro Personnel d'Identification — généré automatiquement
            </p>
            <p className="text-2xl font-mono font-bold text-medical-green">{npi}</p>
          </div>
          <Button variant="outline" size="sm" onClick={copyNPI} className="border-medical-green text-medical-green">
            {npiCopied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            {npiCopied ? "Copié !" : "Copier"}
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Identité */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Identité civile</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="space-y-2">
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
                  <Label htmlFor="nombre_enfants">Nombre d'enfants</Label>
                  <Input id="nombre_enfants" type="number" min="0" {...register("nombre_enfants")} />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="nationalite">Nationalité</Label>
                <Input id="nationalite" {...register("nationalite")} defaultValue="Ivoirienne" />
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
                <Label>Niveau d'études</Label>
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
              <CardTitle className="text-base">Contact d'urgence</CardTitle>
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

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Annuler
            </Button>
            <Button type="submit" variant="medical" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <UserPlus className="h-4 w-4 mr-2" />
              Enregistrer le patient
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
