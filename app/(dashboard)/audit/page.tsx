"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";
import { formatDateTime } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, BadgeVariant } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, Search, Eye, AlertTriangle, Edit, Download } from "lucide-react";

interface LogRow {
  id: string;
  user_id: string;
  patient_id?: string;
  action: string;
  timestamp: string;
  details?: string;
  profile?: { nom: string; prenom: string; role: string };
}

export default function AuditPage() {
  const { user } = useUser();
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (user?.role === "super_admin" || user?.role === "admin_etablissement") {
      loadLogs();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadLogs(from?: string, to?: string) {
    setLoading(true);
    let req = supabase
      .from("audit_logs")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(500);

    if (from) req = req.gte("timestamp", from);
    if (to) {
      const toEnd = new Date(to);
      toEnd.setDate(toEnd.getDate() + 1);
      req = req.lt("timestamp", toEnd.toISOString());
    }

    const { data } = await req;
    const rows = data || [];

    // Load user profiles
    if (rows.length > 0) {
      const userIds = Array.from(new Set(rows.map((l: LogRow) => l.user_id)));
      const { data: profiles } = await supabase
        .from("users_profiles")
        .select("id, nom, prenom, role")
        .in("id", userIds);
      const profileMap: Record<string, { id: string; nom: string; prenom: string; role: string }> = {};
      (profiles || []).forEach((p: { id: string; nom: string; prenom: string; role: string }) => { profileMap[p.id] = p; });
      setLogs(rows.map((l: LogRow) => ({ ...l, profile: profileMap[l.user_id] })));
    } else {
      setLogs([]);
    }
    setLoading(false);
  }

  function handleFilter() {
    loadLogs(dateFrom || undefined, dateTo || undefined);
  }

  function exportCSV() {
    const headers = ["Date", "Action", "Utilisateur", "Rôle", "Patient ID", "Détails"];
    const rows = filteredLogs.map((l) => [
      new Date(l.timestamp).toLocaleString("fr-FR"),
      l.action,
      l.profile ? `${l.profile.prenom} ${l.profile.nom}` : l.user_id?.slice(0, 8),
      l.profile?.role || "",
      l.patient_id?.slice(0, 8) || "",
      l.details ? l.details.replace(/;/g, ",").replace(/\n/g, " ") : "",
    ]);
    const csv = [headers, ...rows].map((row) => row.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medilink-audit-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (user && user.role !== "super_admin" && user.role !== "admin_etablissement") {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Accès refusé — réservé aux administrateurs</p>
      </div>
    );
  }

  const filteredLogs = logs.filter((l) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      l.action?.toLowerCase().includes(q) ||
      l.user_id?.toLowerCase().includes(q) ||
      l.patient_id?.toLowerCase().includes(q) ||
      l.profile?.nom?.toLowerCase().includes(q) ||
      l.profile?.prenom?.toLowerCase().includes(q) ||
      l.details?.toLowerCase().includes(q)
    );
  });

  const breakGlassLogs = logs.filter((l) => l.action === "break_the_glass");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actionLabels: Record<string, { label: string; icon: any; variant: BadgeVariant }> = {
    view_patient: { label: "Vue dossier", icon: Eye, variant: "info" },
    create_patient: { label: "Création patient", icon: Edit, variant: "success" },
    update_patient: { label: "Modification patient", icon: Edit, variant: "warning" },
    create_consultation: { label: "Nouvelle consultation", icon: Edit, variant: "success" },
    create_prescription: { label: "Nouvelle prescription", icon: Edit, variant: "success" },
    dispense_medication: { label: "Dispensation", icon: Edit, variant: "success" },
    export_pdf: { label: "Export PDF", icon: Download, variant: "secondary" },
    generate_qr: { label: "QR Code", icon: Download, variant: "secondary" },
    break_the_glass: { label: "BREAK-THE-GLASS", icon: AlertTriangle, variant: "danger" },
    create_user_profile: { label: "Création utilisateur", icon: Edit, variant: "info" },
    update_user_profile: { label: "Modification utilisateur", icon: Edit, variant: "warning" },
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Journal d'audit" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-medical-green" />
            <h2 className="text-xl font-serif font-bold">Journal d&apos;audit système</h2>
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={filteredLogs.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exporter CSV ({filteredLogs.length})
          </Button>
        </div>

        {/* Break-glass alert */}
        {breakGlassLogs.length > 0 && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-4">
            <p className="font-medium text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {breakGlassLogs.length} accès d&apos;urgence &quot;Break-the-Glass&quot; enregistré{breakGlassLogs.length > 1 ? "s" : ""}
            </p>
            <p className="text-sm text-red-700 mt-1">Ces accès forcés ont été journalisés et notifiés à l&apos;administration.</p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-700">
            Journal immuable — {logs.length} événements chargés. Conformité RGPD / HDS.
            Aucune modification ou suppression possible.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrer par action, utilisateur, détails..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Du</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-36 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Au</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-36 text-sm" />
            </div>
            <Button size="sm" variant="outline" onClick={handleFilter}>Filtrer</Button>
            {(dateFrom || dateTo) && (
              <Button size="sm" variant="ghost" onClick={() => { setDateFrom(""); setDateTo(""); loadLogs(); }}>
                Réinitialiser
              </Button>
            )}
          </div>
        </div>

        {/* Logs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{filteredLogs.length} événements</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <div className="space-y-1 divide-y">
                {filteredLogs.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">Aucun événement pour ces critères</p>
                ) : filteredLogs.map((log) => {
                  const config = actionLabels[log.action] || { label: log.action, icon: Eye, variant: "secondary" as BadgeVariant };
                  const Icon = config.icon;
                  return (
                    <div
                      key={log.id}
                      className={`flex items-center gap-3 py-3 ${log.action === "break_the_glass" ? "bg-red-50 px-3 rounded" : ""}`}
                    >
                      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={config.variant} className="text-xs">{config.label}</Badge>
                          {log.profile ? (
                            <span className="text-sm font-medium">
                              {log.profile.prenom} {log.profile.nom}
                              <span className="text-xs text-muted-foreground ml-1">({log.profile.role})</span>
                            </span>
                          ) : (
                            <span className="text-xs font-mono text-muted-foreground">
                              User: {log.user_id?.slice(0, 8)}...
                            </span>
                          )}
                          {log.patient_id && (
                            <span className="text-xs font-mono text-muted-foreground">
                              Patient: {log.patient_id?.slice(0, 8)}...
                            </span>
                          )}
                        </div>
                        {log.details && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{log.details}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDateTime(log.timestamp)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
