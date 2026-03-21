"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, isDemoMode } from "@/lib/supabase";
import { Etablissement } from "@/types";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Logo } from "@/components/ui/logo";
import {
  Building2, MapPin, Phone, ChevronRight,
  Loader2, LogOut, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  CHU:      "Centre Hospitalier Universitaire",
  CSP:      "Centre de Santé de Premier Contact",
  clinique: "Clinique privée",
  hopital:  "Hôpital",
  cabinet:  "Cabinet médical",
};

export default function SelectEtablissementPage() {
  const router = useRouter();
  const [etablissements, setEtablissements] = useState<Etablissement[]>([]);
  const [loading, setLoading]               = useState(true);
  const [selecting, setSelecting]           = useState<string | null>(null);
  const [userName, setUserName]             = useState("");

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    try {
      // En mode démo : on n'a pas de user_etablissements — rediriger vers dashboard
      if (isDemoMode) {
        router.replace("/dashboard");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      // Charger le profil pour le nom et le rôle
      const { data: profile } = await supabase
        .from("users_profiles")
        .select("prenom, nom, role, etablissement_id")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUserName(`${profile.prenom ?? ""} ${profile.nom ?? ""}`.trim());

        // Les admins ont un seul établissement — auto-sélection
        if (profile.role === "super_admin" || profile.role === "admin_etablissement") {
          if (profile.etablissement_id) {
            await selectEtablissement(profile.etablissement_id);
          } else {
            router.replace("/dashboard");
          }
          return;
        }
      }

      // Charger les établissements via user_etablissements
      const { data: junctions } = await supabase
        .from("user_etablissements")
        .select("etablissement_id")
        .eq("user_id", user.id);

      if (!junctions || junctions.length === 0) {
        // Pas d'affectation → utiliser l'établissement du profil ou dashboard directement
        if (profile?.etablissement_id) {
          await selectEtablissement(profile.etablissement_id);
        } else {
          router.replace("/dashboard");
        }
        return;
      }

      if (junctions.length === 1) {
        // Un seul établissement → auto-sélection sans passer par l'écran
        await selectEtablissement(junctions[0].etablissement_id);
        return;
      }

      // Plusieurs établissements → charger leurs détails
      const ids = junctions.map((j) => j.etablissement_id);
      const { data: etabs } = await supabase
        .from("etablissements")
        .select("*")
        .in("id", ids)
        .is("deleted_at", null)
        .order("nom");

      setEtablissements(etabs ?? []);
    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de charger vos établissements." });
    } finally {
      setLoading(false);
    }
  }

  async function selectEtablissement(id: string) {
    setSelecting(id);
    try {
      const res = await fetch("/api/auth/select-etablissement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ etablissement_id: id }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        toast({ variant: "destructive", title: "Erreur", description: error });
        setSelecting(null);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de sélectionner l'établissement." });
      setSelecting(null);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  // ── Écran de chargement / auto-sélection en cours ──────────────────────────
  if (loading || (etablissements.length === 0 && !loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a6650] via-[#0D7A5F] to-[#1a3a4a]">
        <Loader2 className="h-8 w-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a6650] via-[#0D7A5F] to-[#1a3a4a] flex flex-col">

      {/* Texture */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: "radial-gradient(circle at 1.5px 1.5px, rgba(255,255,255,0.06) 1.5px, transparent 0)",
        backgroundSize: "28px 28px",
      }} />

      {/* Cercles décoratifs */}
      <div className="fixed -top-40 -right-40 w-96 h-96 rounded-full bg-white/5 pointer-events-none" />
      <div className="fixed -bottom-32 -left-32 w-80 h-80 rounded-full bg-white/5 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <Logo theme="dark" size="md" />
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-white/50 hover:text-white/80 text-xs transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Se déconnecter
        </button>
      </header>

      {/* Contenu principal */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12">

        <div className="w-full max-w-2xl">

          {/* Titre */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="text-white/80 text-xs font-medium">Session de travail</span>
            </div>

            <h1 className="text-3xl font-bold text-white tracking-tight">
              Bonjour{userName ? `, ${userName}` : ""}&nbsp;👋
            </h1>
            <p className="text-white/60 mt-2 text-sm">
              Dans quel établissement intervenez-vous aujourd&apos;hui ?
            </p>
          </div>

          {/* Grille des établissements */}
          <div className={cn(
            "grid gap-4",
            etablissements.length <= 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          )}>
            {etablissements.map((etab) => {
              const isLoading = selecting === etab.id;
              return (
                <button
                  key={etab.id}
                  onClick={() => selectEtablissement(etab.id)}
                  disabled={!!selecting}
                  className={cn(
                    "group relative text-left rounded-2xl border transition-all duration-200 p-5 overflow-hidden",
                    "bg-white/8 border-white/15 hover:bg-white/15 hover:border-white/30",
                    "disabled:opacity-60 disabled:cursor-not-allowed",
                    isLoading && "border-emerald-400/60 bg-emerald-400/10"
                  )}
                >
                  {/* Accent supérieur au survol */}
                  <div className={cn(
                    "absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-emerald-400 to-teal-400 transition-opacity duration-200",
                    isLoading ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )} />

                  {/* Icône établissement */}
                  <div className={cn(
                    "w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-colors",
                    isLoading
                      ? "bg-emerald-400/20"
                      : "bg-white/10 group-hover:bg-white/20"
                  )}>
                    {isLoading
                      ? <Loader2 className="h-5 w-5 text-emerald-300 animate-spin" />
                      : <Building2 className="h-5 w-5 text-white/70 group-hover:text-white transition-colors" />
                    }
                  </div>

                  {/* Nom et type */}
                  <h3 className="text-white font-semibold text-sm leading-tight mb-1 pr-4">
                    {etab.nom}
                  </h3>
                  <p className="text-emerald-300/80 text-xs font-medium mb-3">
                    {TYPE_LABELS[etab.type] ?? etab.type}
                  </p>

                  {/* Localisation */}
                  {etab.ville && (
                    <div className="flex items-center gap-1.5 text-white/40 text-xs mb-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{etab.ville}{etab.region ? `, ${etab.region}` : ""}</span>
                    </div>
                  )}
                  {etab.telephone && (
                    <div className="flex items-center gap-1.5 text-white/40 text-xs">
                      <Phone className="h-3 w-3 shrink-0" />
                      <span className="truncate">{etab.telephone}</span>
                    </div>
                  )}

                  {/* Chevron */}
                  <div className={cn(
                    "absolute right-4 top-1/2 -translate-y-1/2 transition-all duration-200",
                    "text-white/20 group-hover:text-white/60 group-hover:translate-x-0.5"
                  )}>
                    {isLoading
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      : <ChevronRight className="h-4 w-4" />
                    }
                  </div>
                </button>
              );
            })}
          </div>

          {/* Note de bas de page */}
          <p className="text-center text-white/30 text-xs mt-8">
            Votre sélection sera active pendant 8 heures · MediLink DME Unifié
          </p>
        </div>
      </main>
    </div>
  );
}
