"use client";
import { useState, useEffect } from "react";
import { Patient, AuditLog } from "@/types";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/utils";
import { Badge, BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, Eye, Edit, Download, AlertTriangle, LogIn, Search } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const actionConfig: Record<string, { label: string; icon: any; variant: BadgeVariant }> = {
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
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    loadLogs();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadLogs(from?: string, to?: string) {
    setLoading(true);
    let req = supabase
      .from("audit_logs")
      .select("*")
      .eq("patient_id", patient.id)
      .order("timestamp", { ascending: false })
      .limit(200);

    if (from) req = req.gte("timestamp", from);
    if (to) {
      const toEnd = new Date(to);
      toEnd.setDate(toEnd.getDate() + 1);
      req = req.lt("timestamp", toEnd.toISOString());
    }

    const { data } = await req;
    const rows = data || [];

    if (rows.length > 0) {
      const userIds = Array.from(new Set(rows.map((l: { user_id: string }) => l.user_id)));
      const { data: profiles } = await supabase
        .from("users_profiles")
        .select("id, nom, prenom, role")
        .in("id", userIds);
      const profileMap: Record<string, { id: string; nom: string; prenom: string; role: string }> = {};
      (profiles || []).forEach((p: { id: string; nom: string; prenom: string; role: string }) => { profileMap[p.id] = p; });
      setLogs(rows.map((l: AuditLog) => ({ ...l, profile: profileMap[l.user_id] })));
    } else {
      setLogs([]);
    }
    setLoading(false);
  }

  function handleFilter() {
    loadLogs(dateFrom || undefined, dateTo || undefined);
  }

  function exportCSV() {
    const headers = ["Date", "Action", "Utilisateur", "Rôle", "Détails"];
    const rows = filteredLogs.map((l) => [
      new Date(l.timestamp).toLocaleString("fr-FR"),
      l.action,
      l.profile ? `${l.profile.prenom} ${l.profile.nom}` : l.user_id?.slice(0, 8),
      l.profile?.role || "",
      l.details ? l.details.replace(/;/g, ",").replace(/\n/g, " ") : "",
    ]);
    const csv = [headers, ...rows].map((row) => row.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-${patient.imu}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filteredLogs = logs.filter((l) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      l.action?.toLowerCase().includes(q) ||
      l.profile?.nom?.toLowerCase().includes(q) ||
      l.profile?.prenom?.toLowerCase().includes(q) ||
      l.details?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-medical-green" />
          <h3 className="font-semibold">Journal d&apos;audit — {logs.length} événements</h3>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={filteredLogs.length === 0}>
          <Download className="h-4 w-4 mr-1.5" />
          CSV ({filteredLogs.length})
        </Button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-700">
          Tous les accès à ce dossier sont enregistrés conformément aux exigences RGPD et de sécurité HDS.
          Aucune suppression n&apos;est possible — journal immuable.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Filtrer..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <div className="flex gap-2 items-end">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Du</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 w-32 text-xs" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Au</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 w-32 text-xs" />
          </div>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleFilter}>Filtrer</Button>
          {(dateFrom || dateTo) && (
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setDateFrom(""); setDateTo(""); loadLogs(); }}>
              Reset
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Aucun événement d&apos;audit</p>
        </div>
      ) : (
        <div className="space-y-1">
          {filteredLogs.map((log) => {
            const config = actionConfig[log.action] || { label: log.action, icon: Eye, variant: "secondary" as BadgeVariant };
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
