"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, Info, Loader2, X, Sparkles } from "lucide-react";
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

export function AIAlertsBanner({ patientId }: AIAlertsBannerProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!patientId) return;

    async function fetchAlerts() {
      try {
        const res = await fetch(`/api/ai/alerts?patientId=${patientId}`);
        if (!res.ok) return;
        const data = await res.json();
        setAlerts(data.alerts || []);
      } catch {
        // Silently fail — alerts are supplementary
      } finally {
        setLoading(false);
      }
    }

    fetchAlerts();
  }, [patientId]);

  if (dismissed) return null;
  if (!loading && alerts.length === 0) return null;

  const alertConfig = {
    danger: {
      bg: "bg-red-50 border-red-200",
      icon: AlertTriangle,
      iconColor: "text-red-600",
      badgeVariant: "danger" as const,
    },
    warning: {
      bg: "bg-yellow-50 border-yellow-200",
      icon: AlertTriangle,
      iconColor: "text-yellow-600",
      badgeVariant: "warning" as const,
    },
    info: {
      bg: "bg-blue-50 border-blue-200",
      icon: Info,
      iconColor: "text-blue-600",
      badgeVariant: "info" as const,
    },
  };

  return (
    <div className="mx-6 mt-4 border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-medical-blue" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Alertes cliniques — Analyse IA
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setDismissed(true)}
          className="h-6 w-6"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Analyse en cours...
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
                  {alert.type === "danger" ? "Urgent" : alert.type === "warning" ? "Attention" : "Info"}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
