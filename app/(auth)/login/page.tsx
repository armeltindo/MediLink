"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, isDemoMode } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  Loader2, Shield, Globe, Eye, EyeOff,
  Lock, Users, ChevronRight, Activity,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]       = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isDemoMode) {
        const res = await fetch("/api/auth/demo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
          const { error } = await res.json();
          toast({ variant: "destructive", title: "Erreur de connexion", description: error });
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          toast({ variant: "destructive", title: "Erreur de connexion", description: error.message });
          return;
        }
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "Une erreur inattendue s'est produite." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left branding panel (desktop only) ───────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col bg-gradient-to-br from-[#0a6650] via-[#0D7A5F] to-[#1a3a4a] text-white relative overflow-hidden">

        {/* Dot-grid texture */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "radial-gradient(circle at 1.5px 1.5px, rgba(255,255,255,0.08) 1.5px, transparent 0)",
          backgroundSize: "28px 28px",
        }} />

        {/* Decorative circles */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute top-1/2 right-8 w-32 h-32 rounded-full bg-medical-green/20 blur-2xl" />

        <div className="relative flex flex-col h-full p-12">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <img
              src="/logo-icon.svg"
              alt="MediLink"
              className="h-14 w-14 rounded-2xl shadow-lg ring-1 ring-white/20"
            />
            <div>
              <h1 className="text-2xl font-serif font-bold tracking-tight">MediLink</h1>
              <p className="text-white/50 text-[11px] uppercase tracking-widest font-medium">DME Unifié · Bénin</p>
            </div>
          </div>

          {/* Hero text */}
          <div className="flex-1 flex flex-col justify-center max-w-sm">
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-4 w-4 text-emerald-300" />
                <span className="text-emerald-300 text-xs font-semibold uppercase tracking-widest">Plateforme médicale</span>
              </div>
              <h2 className="text-[2.4rem] font-bold leading-[1.15] tracking-tight">
                Le dossier médical<br />
                <span className="text-emerald-300">au service</span><br />
                de la vie
              </h2>
              <p className="text-white/60 mt-4 text-sm leading-relaxed">
                Gérez les dossiers de vos patients de manière unifiée, sécurisée et accessible depuis tout établissement de santé.
              </p>
            </div>

            {/* Feature list */}
            <div className="space-y-4">
              {[
                {
                  icon: Shield,
                  title: "Données sécurisées",
                  desc: "Chiffrement SSL, conformité RGPD, accès audité",
                },
                {
                  icon: Globe,
                  title: "Multi-établissements",
                  desc: "Un dossier accessible depuis tous vos sites",
                },
                {
                  icon: Users,
                  title: "Centré sur le patient",
                  desc: "Suivi longitudinal complet, alertes cliniques IA",
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3.5">
                  <div className="bg-white/10 rounded-xl p-2 shrink-0 border border-white/10">
                    <Icon className="h-4.5 w-4.5 text-emerald-300" style={{ height: "1.125rem", width: "1.125rem" }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-white">{title}</p>
                    <p className="text-white/50 text-xs mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom footer */}
          <p className="text-white/30 text-xs">© 2026 MediLink — Système DME Unifié</p>
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-[380px] space-y-7">

          {/* Mobile-only logo */}
          <div className="lg:hidden flex flex-col items-center gap-3 pb-2">
            <img
              src="/logo-icon.svg"
              alt="MediLink"
              className="h-16 w-16 rounded-2xl shadow-lg"
            />
            <div className="text-center">
              <h1 className="text-2xl font-serif font-bold">MediLink</h1>
              <p className="text-muted-foreground text-xs mt-0.5">Dossier Médical Électronique Unifié</p>
            </div>
          </div>

          {/* Form heading */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Bienvenue</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Connectez-vous à votre espace professionnel
            </p>
          </div>

          {/* Demo accounts */}
          {isDemoMode && (
            <div className="rounded-xl border bg-muted/40 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-medical-green opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-medical-green" />
                </span>
                <p className="text-xs font-semibold text-medical-green uppercase tracking-widest">Mode démonstration</p>
              </div>
              <div className="space-y-1.5">
                {[
                  { role: "Médecin",        email: "dr.agossou@medilink.bj", color: "bg-blue-50   border-blue-200   hover:bg-blue-100   text-blue-800"   },
                  { role: "Administrateur", email: "admin@medilink.bj",       color: "bg-violet-50 border-violet-200 hover:bg-violet-100 text-violet-800" },
                  { role: "Pharmacien",     email: "pharma@medilink.bj",      color: "bg-amber-50  border-amber-200  hover:bg-amber-100  text-amber-800"  },
                ].map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => { setEmail(account.email); setPassword("demo123"); }}
                    className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${account.color}`}
                  >
                    <span>{account.role}</span>
                    <div className="flex items-center gap-1 opacity-60">
                      <span className="font-mono">{account.email}</span>
                      <ChevronRight className="h-3 w-3" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email professionnel</Label>
              <Input
                id="email"
                type="email"
                placeholder="medecin@hopital.bj"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                {!isDemoMode && (
                  <a href="/forgot-password" className="text-xs text-medical-green hover:underline underline-offset-2">
                    Oublié ?
                  </a>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 mt-1" variant="medical" disabled={loading}>
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Connexion en cours…</>
              ) : (
                <>Se connecter<ChevronRight className="ml-2 h-4 w-4" /></>
              )}
            </Button>
          </form>

          {/* Security note */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/70">
            <Lock className="h-3 w-3" />
            <span>Connexion chiffrée · Données médicales protégées</span>
          </div>

          {/* Mobile footer */}
          <p className="lg:hidden text-center text-muted-foreground/50 text-[11px]">
            © 2026 MediLink — Système DME Unifié — Bénin
          </p>
        </div>
      </div>

    </div>
  );
}
