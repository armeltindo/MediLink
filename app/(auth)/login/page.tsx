"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Heart, Shield, Globe, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isDemoMode) {
        // No Supabase configured — use demo session
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
    <div className="min-h-screen bg-gradient-to-br from-medical-slate via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="bg-medical-green rounded-2xl p-3 shadow-lg">
              <Heart className="h-10 w-10 text-white" fill="currentColor" />
            </div>
          </div>
          <h1 className="text-3xl font-serif font-bold text-white">MediLink</h1>
          <p className="text-slate-300 text-sm">Dossier Médical Électronique Unifié</p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Shield, label: "Sécurisé" },
            { icon: Globe, label: "Cross-établissements" },
            { icon: Heart, label: "Centré patient" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="bg-white/10 rounded-lg p-3 text-center">
              <Icon className="h-4 w-4 text-medical-green mx-auto mb-1" />
              <p className="text-white/80 text-xs">{label}</p>
            </div>
          ))}
        </div>

        {/* Demo accounts hint */}
        {isDemoMode && (
          <div className="bg-white/10 rounded-xl p-4 space-y-2">
            <p className="text-white/90 text-xs font-semibold uppercase tracking-wide mb-2">Comptes de démonstration</p>
            {[
              { label: "Médecin", email: "dr.agossou@medilink.bj", password: "demo123" },
              { label: "Admin établissement", email: "admin@medilink.bj", password: "demo123" },
              { label: "Pharmacien", email: "pharma@medilink.bj", password: "demo123" },
            ].map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => { setEmail(account.email); setPassword(account.password); }}
                className="w-full text-left flex items-center justify-between px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <span className="text-white text-xs font-medium">{account.label}</span>
                <span className="text-white/60 text-xs font-mono">{account.email}</span>
              </button>
            ))}
          </div>
        )}

        {/* Login Form */}
        <Card className="shadow-2xl border-0">
          <CardHeader>
            <CardTitle className="text-xl">Connexion</CardTitle>
            <CardDescription>
              Accédez à votre espace professionnel sécurisé
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Adresse email professionnelle</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="medecin@hopital.bj"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Mot de passe</Label>
                  {!isDemoMode && (
                    <a href="/forgot-password" className="text-xs text-medical-green hover:underline">
                      Mot de passe oublié ?
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
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" variant="medical" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Connexion en cours..." : "Se connecter"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-slate-400 text-xs">
          © 2026 MediLink — Système DME Unifié — Bénin
        </p>
      </div>
    </div>
  );
}
