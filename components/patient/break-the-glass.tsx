"use client";
import { useState } from "react";
import { ShieldAlert, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";

interface BreakTheGlassProps {
  patientId: string;
  patientNom: string;
  onAccessGranted: () => void;
}

export function BreakTheGlass({ patientId, patientNom, onAccessGranted }: BreakTheGlassProps) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [justification, setJustification] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleEmergencyAccess() {
    if (!justification.trim() || justification.trim().length < 20) {
      toast({
        variant: "destructive",
        title: "Justification requise",
        description: "Veuillez fournir une justification détaillée (minimum 20 caractères).",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Non authentifié");

      // Log the break-the-glass access
      await supabase.from("audit_logs").insert({
        user_id: authUser.id,
        patient_id: patientId,
        action: "break_the_glass",
        details: `ACCÈS D'URGENCE — Justification : ${justification}`,
        timestamp: new Date().toISOString(),
      });

      // Notify admins via audit trail (visible in admin dashboard)
      toast({
        title: "Accès d'urgence enregistré",
        description: "Votre accès a été loggé et notifié à l'administrateur.",
        variant: "default",
      });

      setOpen(false);
      setJustification("");
      onAccessGranted();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: err.message || "Impossible d'enregistrer l'accès d'urgence.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="border-red-300 text-red-700 hover:bg-red-50 hover:border-red-500"
      >
        <ShieldAlert className="h-4 w-4 mr-1.5" />
        Accès urgence
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Accès d'urgence — Break the Glass
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
              <p className="font-semibold mb-1">⚠️ Action traçée et irréversible</p>
              <p>
                Vous êtes sur le point d'accéder au dossier de{" "}
                <strong>{patientNom}</strong> en mode d'urgence. Cet accès sera{" "}
                <strong>immédiatement notifié à l'administrateur</strong> et{" "}
                consigné dans le journal d'audit permanent.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="justification" className="text-sm font-medium">
                Justification médicale obligatoire *
              </Label>
              <Textarea
                id="justification"
                placeholder="Décrivez la situation d'urgence justifiant cet accès (ex: patient inconscient aux urgences, médecin traitant injoignable, situation vitale immédiate...)"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={4}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Minimum 20 caractères — {justification.length} saisi(s)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Annuler
            </Button>
            <Button
              onClick={handleEmergencyAccess}
              disabled={loading || justification.trim().length < 20}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmer l'accès d'urgence
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
