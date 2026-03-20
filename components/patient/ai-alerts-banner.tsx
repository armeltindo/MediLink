"use client";
import { useEffect, useState, useRef } from "react";
import { AlertTriangle, Info, Loader2, X, Sparkles, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Alert {
  type: "danger" | "warning" | "info";
  titre: string;
  message: string;
}

interface AIAlertsBannerProps {
  patientId: string;
}

const FETCH_TIMEOUT_MS = 20_000;

export function AIAlertsBanner({ patientId }: AIAlertsBannerProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!patientId) return;

    // Cancel any pending request when patient changes
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Auto-abort after FETCH_TIMEOUT_MS
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    setLoading(true);
    setError(false);
    setDismissed(false);

    async function fetchAlerts() {
      try {
        const res = await fetch(`/api/ai/alerts?patientId=${patientId}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          setError(true);
          return;
        }
        const data = await res.json();
        setAlerts(data.alerts || []);
      } catch (err) {
        // AbortError = timeout or navigation — not a real error
        if ((err as Error).name !== "AbortError") {
          setError(true);
        }
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    }

    fetchAlerts();

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [patientId]);

  if (!loading && alerts.length === 0 && !error) return null;

  const alertConfig = {
    danger: {
      bg: "bg-red-50 border-red-200",
      icon: AlertTriangle,
      iconColor: "text-red-600",
      badgeVariant: "danger" as const,
      label: "Urgent",
    },
    warning: {
      bg: "bg-yellow-50 border-yellow-200",
      icon: AlertTriangle,
      iconColor: "text-yellow-600",
      badgeVariant: "warning" as const,
      label: "Attention",
    },
    info: {
      bg: "bg-blue-50 border-blue-200",
      icon: Info,
      iconColor: "text-blue-600",
      badgeVariant: "info" as const,
      label: "Info",
    },
  };

  return (
    <div className="mx-6 mt-4 border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-medical-blue" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Alertes cliniques
          </span>
          {!loading && alerts.length > 0 && (
            <span className="text-xs text-muted-foreground">({alerts.length})</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {dismissed && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setDismissed(false)}
              className="h-6 w-6"
              title="Réafficher les alertes"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          )}
          {!dismissed && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setDismissed(true)}
              className="h-6 w-6"
              title="Masquer les alertes"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Analyse en cours...
        </div>
      ) : error ? (
        <div className="px-4 py-3 text-xs text-muted-foreground italic">
          Les alertes IA ne sont pas disponibles pour le moment.
        </div>
      ) : dismissed ? (
        <div className="px-4 py-2 text-xs text-muted-foreground italic flex items-center gap-2">
          <Eye className="h-3.5 w-3.5" />
          {alerts.length} alerte{alerts.length > 1 ? "s" : ""} masquée{alerts.length > 1 ? "s" : ""} — cliquez sur l&apos;icône pour les réafficher
        </div>
      ) : (
        <div className="divide-y">
          {alerts.map((alert, i) => {
            const config = alertConfig[alert.type];
            const Icon = config.icon;
            return (
              <div key={i} className={`flex items-start gap-3 px-4 py-3 ${config.bg}`}>
                <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${config.iconColor}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{alert.titre}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                </div>
                <Badge variant={config.badgeVariant} className="shrink-0 text-xs capitalize">
                  {config.label}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
