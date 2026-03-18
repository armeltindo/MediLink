"use client";
import { useState, useRef } from "react";
import { Patient, Allergie } from "@/types";
import { formatDate, formatAge, getBloodGroupColor } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle, Calendar, MapPin, Briefcase,
  Phone, Shield, QrCode, Download, User, ShieldAlert, FileText, Camera, Loader2,
} from "lucide-react";
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
}

export function PatientHeader({ patient, allergies, onExportPDF, onShowQR, onBreakGlass, onLettreRef, onPhotoUpdate }: PatientHeaderProps) {
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState(patient.photo_url || "");
  const [uploading, setUploading] = useState(false);

  const canEditPhoto = user?.role === "super_admin" || user?.role === "admin_etablissement" || user?.role === "medecin";

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
      const path = `patients/${patient.npi}/photo_${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("documents").upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(path);
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

  const activeAllergies = allergies.filter((a) => a.actif);
  const anaphylacticAllergies = activeAllergies.filter((a) => a.severite === "anaphylactique");
  const bloodGroupFull = patient.groupe_sanguin && patient.rhesus
    ? `${patient.groupe_sanguin}${patient.rhesus}`
    : patient.groupe_sanguin;

  return (
    <div className="bg-card border-b sticky top-16 z-20">
      {/* Allergie banner — shown if anaphylactic allergies */}
      {anaphylacticAllergies.length > 0 && (
        <div className="bg-red-600 text-white px-6 py-2 flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="h-4 w-4 animate-pulse" />
          <span>ALLERGIE ANAPHYLACTIQUE : {anaphylacticAllergies.map(a => a.substance).join(", ")}</span>
        </div>
      )}

      <div className="px-6 py-4 flex items-start gap-5">
        {/* Avatar with optional photo upload */}
        <div className="relative shrink-0 group">
          <Avatar className="h-16 w-16 border-2 border-border">
            <AvatarImage src={photoUrl} alt={patient.nom} />
            <AvatarFallback className="text-xl font-bold bg-medical-green-light text-medical-green">
              {patient.prenom?.[0]}{patient.nom?.[0]}
            </AvatarFallback>
          </Avatar>
          {canEditPhoto && (
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
          <div className="flex items-start gap-3 flex-wrap">
            <div>
              <h1 className="text-xl font-serif font-bold">
                {patient.prenom} <span className="uppercase">{patient.nom}</span>
              </h1>
              <p className="text-sm font-mono text-muted-foreground mt-0.5">{patient.npi}</p>
            </div>

            {/* Blood group */}
            {bloodGroupFull && (
              <span className={`text-sm font-bold text-white px-2.5 py-1 rounded-md mt-0.5 ${getBloodGroupColor(bloodGroupFull)}`}>
                {bloodGroupFull}
              </span>
            )}

            {/* Allergies badges */}
            {activeAllergies.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-0.5">
                {activeAllergies.slice(0, 3).map((a) => (
                  <Badge
                    key={a.id}
                    variant="danger"
                    className="flex items-center gap-1 text-xs"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    {a.substance}
                  </Badge>
                ))}
                {activeAllergies.length > 3 && (
                  <Badge variant="danger" className="text-xs">
                    +{activeAllergies.length - 3} allergies
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Details row */}
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {patient.sexe === "M" ? "Homme" : "Femme"} — {formatAge(patient.date_naissance)}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(patient.date_naissance)}
            </span>
            {patient.lieu_naissance && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {patient.lieu_naissance}
              </span>
            )}
            {patient.profession && (
              <span className="flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" />
                {patient.profession}
              </span>
            )}
            {patient.contact_urgence_tel && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                {patient.contact_urgence_nom} ({patient.contact_urgence_lien}) — {patient.contact_urgence_tel}
              </span>
            )}
            {patient.assurance_organisme && (
              <span className="flex items-center gap-1">
                <Shield className="h-3.5 w-3.5" />
                {patient.assurance_organisme} — {patient.assurance_taux}%
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 shrink-0 flex-wrap">
          {onShowQR && (
            <Button variant="outline" size="sm" onClick={onShowQR}>
              <QrCode className="h-4 w-4 mr-1.5" />
              QR Code
            </Button>
          )}
          {onExportPDF && (
            <Button variant="outline" size="sm" onClick={onExportPDF}>
              <Download className="h-4 w-4 mr-1.5" />
              Exporter PDF
            </Button>
          )}
          {onLettreRef && (
            <Button variant="outline" size="sm" onClick={onLettreRef}>
              <FileText className="h-4 w-4 mr-1.5" />
              Lettre de réf.
            </Button>
          )}
          {onBreakGlass && (
            <Button variant="outline" size="sm" onClick={onBreakGlass} className="border-red-300 text-red-600 hover:bg-red-50">
              <ShieldAlert className="h-4 w-4 mr-1.5" />
              Urgence
            </Button>
          )}
        </div>
      </div>
      <Separator />
    </div>
  );
}
