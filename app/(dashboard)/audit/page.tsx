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
import {
  ShieldCheck, Search, Eye, AlertTriangle, Edit, Download,
  Users, Activity, Plus, UserPlus, FileDown, X,
} from "lucide-react";

interface LogRow {
  id: string;
  user_id: string;
  patient_id?: string;
  action: string;
  timestamp: string;
  details?: string;
  profile?: { nom: string; prenom: string; role: string };
}

const ROLE_AVATAR: Record<string, string> = {
  super_admin: "bg-rose-100 text-rose-600",
  admin_etablissement: "bg-purple-100 text-purple-600",
  medecin: "bg-emerald-100 text-emerald-700",
  infirmier: "bg-blue-100 text-blue-600",
  pharmacien: "bg-amber-100 text-amber-700",
  laborantin: "bg-teal-100 text-teal-600",
};

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
  const uniqueActors = new Set(logs.map((l) => l.user_id)).size;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actionConfig: Record<string, { label: string; icon: any; variant: BadgeVariant; iconBg: string; iconColor: string }> = {
    view_patient:         { label: "Vue dossier",           icon: Eye,           variant: "info",      iconBg: "bg-blue-100",    iconColor: "text-blue-600" },
    create_patient:       { label: "Création patient",      icon: Plus,          variant: "success",   iconBg: "bg-emerald-100", iconColor: "text-emerald-600" },
    update_patient:       { label: "Modification patient",  icon: Edit,          variant: "warning",   iconBg: "bg-amber-100",   iconColor: "text-amber-600" },
    create_consultation:  { label: "Consultation",          icon: Plus,          variant: "success",   iconBg: "bg-emerald-100", iconColor: "text-emerald-600" },
    create_prescription:  { label: "Prescription",          icon: Plus,          variant: "success",   iconBg: "bg-emerald-100", iconColor: "text-emerald-600" },
    dispense_medication:  { label: "Dispensation",          icon: Activity,      variant: "success",   iconBg: "bg-teal-100",    iconColor: "text-teal-600" },
    export_pdf:           { label: "Export PDF",            icon: FileDown,      variant: "secondary", iconBg: "bg-slate-100",   iconColor: "text-slate-500" },
    generate_qr:          { label: "QR Code",               icon: Download,      variant: "secondary", iconBg: "bg-slate-100",   iconColor: "text-slate-500" },
    break_the_glass:      { label: "BREAK-THE-GLASS",       icon: AlertTriangle, variant: "danger",    iconBg: "bg-red-100",     iconColor: "text-red-600" },
    create_user_profile:  { label: "Création utilisateur",  icon: UserPlus,      variant: "info",      iconBg: "bg-purple-100",  iconColor: "text-purple-600" },
    update_user_profile:  { label: "Modif. utilisateur",    icon: Edit,          variant: "warning",   iconBg: "bg-purple-100",  iconColor: "text-purple-600" },
  };

  const hasDateFilter = !!(dateFrom || dateTo);

  return (
    <div className="flex flex-col min-h-full bg-slate-50/40">
      <Header title="Journal d'audit" />

      {/* ── Identity strip ── */}
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-slate-100 border border-slate-200">
            <ShieldCheck className="h-4 w-4 text-slate-500" />
          </div>
          <div>
            <p className="text-sm font-medium leading-none">Journal d&apos;audit système</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Journal immuable · Conformité RGPD / HDS · Aucune modification ou suppression possible
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={exportCSV}
          disabled={filteredLogs.length === 0}
          className="gap-1.5 text-xs h-8"
        >
          <Download className="h-3.5 w-3.5" />
          Exporter CSV ({filteredLogs.length})
        </Button>
      </div>

      <div className="p-6 space-y-4">
        {/* ── Break-glass alert ── */}
        {breakGlassLogs.length > 0 && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <div className="p-1.5 rounded-full bg-red-100 shrink-0 mt-0.5">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="font-semibold text-red-800 text-sm">
                {breakGlassLogs.length} accès d&apos;urgence &quot;Break-the-Glass&quot; enregistré{breakGlassLogs.length > 1 ? "s" : ""}
              </p>
              <p className="text-xs text-red-700 mt-0.5">
                Ces accès forcés ont été journalisés et notifiés à l&apos;administration.
              </p>
            </div>
          </div>
        )}

        {/* ── Mini stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Événements chargés",  value: logs.length,           iconBg: "bg-blue-100",    iconColor: "text-blue-600",    icon: Activity,      border: "border-l-blue-500" },
            { label: "Événements filtrés",  value: filteredLogs.length,   iconBg: "bg-emerald-100", iconColor: "text-emerald-600", icon: ShieldCheck,   border: "border-l-emerald-500" },
            { label: "Acteurs uniques",     value: uniqueActors,          iconBg: "bg-purple-100",  iconColor: "text-purple-600",  icon: Users,         border: "border-l-purple-500" },
            { label: "Accès Break-Glass",   value: breakGlassLogs.length, iconBg: "bg-red-100",     iconColor: "text-red-600",     icon: AlertTriangle, border: "border-l-red-500" },
          ].map(({ label, value, iconBg, iconColor, icon: Icon, border }) => (
            <Card key={label} className={`border-l-4 ${border} shadow-sm`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    {loading
                      ? <Skeleton className="h-6 w-10 mb-1" />
                      : <p className="text-2xl font-bold tracking-tight">{value.toLocaleString()}</p>
                    }
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{label}</p>
                  </div>
                  <div className={`p-2 rounded-lg shrink-0 ${iconBg}`}>
                    <Icon className={`h-4 w-4 ${iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="bg-white border rounded-lg px-4 py-3 flex flex-wrap gap-3 items-end shadow-sm">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Filtrer par action, utilisateur, détails..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-9"
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
            <Button size="sm" variant="medical" onClick={handleFilter} className="h-9 gap-1.5">
              <Search className="h-3.5 w-3.5" />
              Filtrer
            </Button>
            {hasDateFilter && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setDateFrom(""); setDateTo(""); loadLogs(); }}
                className="h-9 gap-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
                Réinitialiser
              </Button>
            )}
          </div>
        </div>

        {/* ── Log list ── */}
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="px-5 py-3 border-b bg-slate-50/60">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>{filteredLogs.length} événement{filteredLogs.length !== 1 ? "s" : ""}{query || hasDateFilter ? " correspondant aux filtres" : " chargés"}</span>
              {loading && <Skeleton className="h-4 w-20" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="divide-y">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3">
                    <Skeleton className="h-7 w-7 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-72" />
                    </div>
                    <Skeleton className="h-3 w-24 shrink-0" />
                  </div>
                ))}
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <ShieldCheck className="h-9 w-9 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Aucun événement pour ces critères</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredLogs.map((log) => {
                  const cfg = actionConfig[log.action] ?? {
                    label: log.action,
                    icon: Eye,
                    variant: "secondary" as BadgeVariant,
                    iconBg: "bg-slate-100",
                    iconColor: "text-slate-500",
                  };
                  const Icon = cfg.icon;
                  const isBreakGlass = log.action === "break_the_glass";
                  const avatarClass = log.profile ? (ROLE_AVATAR[log.profile.role] ?? "bg-slate-100 text-slate-600") : "bg-slate-100 text-slate-500";

                  return (
                    <div
                      key={log.id}
                      className={`flex items-start gap-3 px-5 py-3 transition-colors hover:bg-slate-50/60 ${isBreakGlass ? "border-l-4 border-l-red-500 bg-red-50/20" : ""}`}
                    >
                      {/* Action icon */}
                      <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${cfg.iconBg}`}>
                        <Icon className={`h-3.5 w-3.5 ${cfg.iconColor}`} />
                      </div>

                      {/* Main content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={cfg.variant} className="text-xs font-medium">
                            {cfg.label}
                          </Badge>

                          {/* User avatar + name */}
                          {log.profile ? (
                            <div className="flex items-center gap-1.5">
                              <span className={`inline-flex h-5 w-5 rounded-full text-[10px] font-bold items-center justify-center ${avatarClass}`}>
                                {log.profile.prenom?.[0]?.toUpperCase()}{log.profile.nom?.[0]?.toUpperCase()}
                              </span>
                              <span className="text-sm font-medium">{log.profile.prenom} {log.profile.nom}</span>
                              <span className="text-xs text-muted-foreground">({log.profile.role})</span>
                            </div>
                          ) : (
                            <span className="text-xs font-mono text-muted-foreground bg-slate-100 px-1.5 py-0.5 rounded">
                              {log.user_id?.slice(0, 8)}…
                            </span>
                          )}

                          {/* Patient chip */}
                          {log.patient_id && (
                            <span className="text-xs font-mono text-muted-foreground bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">
                              Patient · {log.patient_id?.slice(0, 8)}…
                            </span>
                          )}
                        </div>

                        {/* Details */}
                        {log.details && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.details}</p>
                        )}
                      </div>

                      {/* Timestamp */}
                      <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap pt-0.5">
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
