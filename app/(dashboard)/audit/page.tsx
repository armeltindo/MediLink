"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";
import { formatDateTime } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, BadgeVariant } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, Search, Eye, AlertTriangle, Edit, Download } from "lucide-react";

export default function AuditPage() {
  const { user } = useUser();
  const [logs, setLogs] = useState<{ id: string; user_id: string; patient_id?: string; action: string; timestamp: string; details?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (user?.role === "super_admin" || user?.role === "admin_etablissement") {
      loadLogs();
    }
  }, [user]);

  async function loadLogs() {
    const { data } = await supabase
      .from("audit_logs")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(200);

    setLogs(data || []);
    setLoading(false);
  }

  if (user && user.role !== "super_admin" && user.role !== "admin_etablissement") {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Accès refusé — réservé aux administrateurs</p>
      </div>
    );
  }

  const filteredLogs = logs.filter((l) =>
    !query || l.action?.includes(query) || l.user_id?.includes(query) || l.patient_id?.includes(query)
  );

  const breakGlassLogs = logs.filter((l) => l.action === "break_the_glass");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actionLabels: Record<string, { label: string; icon: any; variant: BadgeVariant }> = {
    view_patient: { label: "Vue dossier", icon: Eye, variant: "info" },
    create_patient: { label: "Création patient", icon: Edit, variant: "success" },
    update_patient: { label: "Modification patient", icon: Edit, variant: "warning" },
    export_pdf: { label: "Export PDF", icon: Download, variant: "secondary" },
    generate_qr: { label: "QR Code", icon: Download, variant: "secondary" },
    break_the_glass: { label: "BREAK-THE-GLASS", icon: AlertTriangle, variant: "danger" },
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Journal d'audit" />
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-medical-green" />
          <h2 className="text-xl font-serif font-bold">Journal d&apos;audit système</h2>
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
            Journal immuable — {logs.length} événements enregistrés. Conformité RGPD / HDS.
            Aucune modification ou suppression possible.
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filtrer par action, utilisateur..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
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
                {filteredLogs.map((log) => {
                  const config = actionLabels[log.action] || { label: log.action, icon: Eye, variant: "secondary" };
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
                          <span className="text-xs font-mono text-muted-foreground">
                            User: {log.user_id?.slice(0, 8)}...
                          </span>
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
