"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Clock, FileText, Shield, Activity, X, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { UserProfile } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditLog {
  id: string;
  action: string;
  details: string | null;
  timestamp: string;
  patient_id: string | null;
  patients?: { nom: string; prenom: string; npi: string } | null;
}

interface Notif {
  id: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  color: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const NOTIF_ACTIONS = [
  "prescription_expiry_alert",
  "btg_notification_sent",
  "break_the_glass",
  "create_consultation",
  "create_prescription",
  "create_analyse",
  "create_hospitalisation",
  "dispense_medication",
];

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Il y a ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days} j`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

function parseNotif(log: AuditLog, lastSeenAt: number): Notif {
  const unread = new Date(log.timestamp).getTime() > lastSeenAt;
  const patient = log.patients;
  const patientLabel = patient ? `${patient.prenom} ${patient.nom}` : null;

  let details: Record<string, unknown> = {};
  try { details = JSON.parse(log.details ?? "{}"); } catch {}

  const map: Record<string, { icon: React.ReactNode; title: string; body: string; color: string }> = {
    prescription_expiry_alert: {
      icon: <Clock className="h-4 w-4" />,
      title: "Prescription expirant bientôt",
      body: details.medicament
        ? `${details.medicament} expire dans ${details.days_remaining} jour(s)${patientLabel ? ` · ${patientLabel}` : ""}`
        : `Une prescription expire bientôt${patientLabel ? ` · ${patientLabel}` : ""}`,
      color: "bg-amber-50 text-amber-600",
    },
    break_the_glass: {
      icon: <Shield className="h-4 w-4" />,
      title: "Accès d'urgence (Break-the-glass)",
      body: patientLabel ? `Accès exceptionnel au dossier de ${patientLabel}` : "Accès d'urgence utilisé",
      color: "bg-red-50 text-red-600",
    },
    btg_notification_sent: {
      icon: <Shield className="h-4 w-4" />,
      title: "Notification BTG envoyée",
      body: patientLabel ? `Alerte d'accès exceptionnel · ${patientLabel}` : "Alerte envoyée aux administrateurs",
      color: "bg-red-50 text-red-600",
    },
    create_consultation: {
      icon: <FileText className="h-4 w-4" />,
      title: "Consultation créée",
      body: patientLabel ? `Nouvelle consultation pour ${patientLabel}` : "Nouvelle consultation enregistrée",
      color: "bg-blue-50 text-blue-600",
    },
    create_prescription: {
      icon: <FileText className="h-4 w-4" />,
      title: "Ordonnance créée",
      body: patientLabel ? `Ordonnance pour ${patientLabel}` : "Nouvelle ordonnance enregistrée",
      color: "bg-blue-50 text-blue-600",
    },
    create_analyse: {
      icon: <Activity className="h-4 w-4" />,
      title: "Analyse prescrite",
      body: patientLabel ? `Bilan prescrit pour ${patientLabel}` : "Nouvelle analyse prescrite",
      color: "bg-purple-50 text-purple-600",
    },
    create_hospitalisation: {
      icon: <Activity className="h-4 w-4" />,
      title: "Hospitalisation ouverte",
      body: patientLabel ? `Admission de ${patientLabel}` : "Nouvelle hospitalisation ouverte",
      color: "bg-indigo-50 text-indigo-600",
    },
    dispense_medication: {
      icon: <FileText className="h-4 w-4" />,
      title: "Médicament dispensé",
      body: patientLabel ? `Dispensation pour ${patientLabel}` : "Médicament dispensé",
      color: "bg-green-50 text-green-600",
    },
  };

  const meta = map[log.action] ?? {
    icon: <Bell className="h-4 w-4" />,
    title: log.action.replace(/_/g, " "),
    body: patientLabel ?? "Activité enregistrée",
    color: "bg-slate-50 text-slate-500",
  };

  return {
    id: log.id,
    ...meta,
    time: relativeTime(log.timestamp),
    unread,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

const LS_KEY = "medilink_notif_seen";

export function NotificationPanel({ user }: { user: UserProfile }) {
  const [open, setOpen]       = useState(false);
  const [notifs, setNotifs]   = useState<Notif[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastSeenAt, setLastSeenAt] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem(LS_KEY) ?? "0", 10);
  });
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  // Fetch notifications
  useEffect(() => {
    if (!open) return;
    setLoading(true);

    const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL;

    async function fetchNotifs() {
      if (isDemoMode) {
        // Demo: show placeholder notifications
        setNotifs([
          {
            id: "demo-1",
            icon: <Clock className="h-4 w-4" />,
            title: "Prescription expirant bientôt",
            body: "Amoxicilline expire dans 3 jours · Kofi Mensah",
            time: "Il y a 2 h",
            unread: true,
            color: "bg-amber-50 text-amber-600",
          },
          {
            id: "demo-2",
            icon: <Activity className="h-4 w-4" />,
            title: "Résultats d'analyse disponibles",
            body: "NFS complète · Ama Owusu",
            time: "Il y a 5 h",
            unread: true,
            color: "bg-purple-50 text-purple-600",
          },
          {
            id: "demo-3",
            icon: <FileText className="h-4 w-4" />,
            title: "Consultation créée",
            body: "Nouvelle consultation pour Kwame Asante",
            time: "Hier",
            unread: false,
            color: "bg-blue-50 text-blue-600",
          },
        ]);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("audit_logs")
        .select("id, action, details, timestamp, patient_id, patients(nom, prenom, npi)")
        .eq("user_id", user.id)
        .in("action", NOTIF_ACTIONS)
        .order("timestamp", { ascending: false })
        .limit(25);

      const parsed = (data ?? []).map((log: AuditLog) => parseNotif(log, lastSeenAt));
      setNotifs(parsed);
      setLoading(false);
    }

    fetchNotifs();
  }, [open, user.id, lastSeenAt]);

  const unreadCount = notifs.filter((n) => n.unread).length;

  function markAllRead() {
    const now = Date.now();
    localStorage.setItem(LS_KEY, String(now));
    setLastSeenAt(now);
    setNotifs((prev) => prev.map((n) => ({ ...n, unread: false })));
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative p-2 rounded-lg transition-colors",
          open
            ? "text-slate-800 bg-slate-100"
            : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
        )}
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell style={{ width: "1.05rem", height: "1.05rem" }} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
        {unreadCount === 0 && (
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-slate-300" />
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[360px] bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-slate-600" />
              <span className="text-sm font-semibold text-slate-800">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">
                  {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 px-2 py-1 rounded hover:bg-slate-50 transition-colors"
                  title="Tout marquer comme lu"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Tout lire
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-50">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-5 w-5 rounded-full border-2 border-slate-200 border-t-slate-500 animate-spin" />
              </div>
            ) : notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
                <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-slate-300" />
                </div>
                <p className="text-sm font-medium">Aucune notification</p>
                <p className="text-xs">Vous êtes à jour !</p>
              </div>
            ) : (
              notifs.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50 cursor-default",
                    n.unread && "bg-blue-50/40"
                  )}
                >
                  {/* Icon */}
                  <div className={cn("shrink-0 mt-0.5 h-7 w-7 rounded-full flex items-center justify-center", n.color)}>
                    {n.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-xs font-semibold text-slate-800 leading-tight", n.unread && "font-bold")}>
                        {n.title}
                      </p>
                      {n.unread && (
                        <span className="shrink-0 mt-0.5 h-1.5 w-1.5 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{n.body}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{n.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifs.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
              <p className="text-[10px] text-slate-400 text-center">
                Affichage des 25 dernières notifications
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
