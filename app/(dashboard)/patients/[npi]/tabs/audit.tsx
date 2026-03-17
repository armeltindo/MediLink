"use client";
import { useState, useEffect } from "react";
import { Patient, AuditLog } from "@/types";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, Eye, Edit, Download, AlertTriangle, LogIn } from "lucide-react";

const actionConfig: Record<string, { label: string; icon: any; variant: any }> = {
  view_patient: { label: "Consultation dossier", icon: Eye, variant: "info" },
  create_patient: { label: "Création patient", icon: Edit, variant: "success" },
  update_patient: { label: "Modification patient", icon: Edit, variant: "warning" },
  create_consultation: { label: "Nouvelle consultation", icon: Edit, variant: "success" },
  create_prescription: { label: "Nouvelle prescription", icon: Edit, variant: "success" },
  dispense_medication: { label: "Dispensation", icon: Edit, variant: "success" },
  export_pdf: { label: "Export PDF", icon: Download, variant: "secondary" },
  generate_qr: { label: "Génération QR Code", icon: Download, variant: "secondary" },
  break_the_glass: { label: "Accès d'urgence (Break-Glass)", icon: AlertTriangle, variant: "danger" },
  login: { label: "Connexion", icon: LogIn, variant: "secondary" },
};

interface AuditTabProps {
  patient: Patient;
}

export function AuditTab({ patient }: AuditTabProps) {
  const [logs, setLogs] = useState<(AuditLog & { profile?: { nom: string; prenom: string; role: string } })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    const { data } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("patient_id", patient.id)
      .order("timestamp", { ascending: false })
      .limit(100);

    if (data && data.length > 0) {
      // Load user profiles for each log
      const userIds = Array.from(new Set(data.map((l: any) => l.user_id)));
      const { data: profiles } = await supabase
        .from("users_profiles")
        .select("id, nom, prenom, role")
        .in("id", userIds);

      const profileMap: Record<string, any> = {};
      (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });
      setLogs(data.map((l: any) => ({ ...l, profile: profileMap[l.user_id] })));
    } else {
      setLogs([]);
    }

    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-medical-green" />
        <h3 className="font-semibold">Journal d'audit — {logs.length} événements</h3>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-700">
          Tous les accès à ce dossier sont enregistrés conformément aux exigences RGPD et de sécurité HDS.
          Aucune suppression n'est possible — journal immuable.
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Aucun événement d'audit</p>
        </div>
      ) : (
        <div className="space-y-1">
          {logs.map((log) => {
            const config = actionConfig[log.action] || { label: log.action, icon: Eye, variant: "secondary" };
            const Icon = config.icon;

            return (
              <div
                key={log.id}
                className={`flex items-center gap-3 p-3 rounded-lg border text-sm ${
                  log.action === "break_the_glass" ? "bg-red-50 border-red-200" : "hover:bg-muted/30"
                }`}
              >
                <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={config.variant} className="text-xs">{config.label}</Badge>
                    {log.profile && (
                      <span className="text-sm font-medium">
                        {log.profile.prenom} {log.profile.nom}
                        <span className="text-xs text-muted-foreground ml-1">({log.profile.role})</span>
                      </span>
                    )}
                  </div>
                  {log.details && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.details}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{formatDateTime(log.timestamp)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
