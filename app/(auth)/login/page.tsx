"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Heart, Shield, Globe } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ variant: "destructive", title: "Erreur de connexion", description: error.message });
        return;
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
                  placeholder="medecin@hopital.ci"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" variant="medical" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Connexion en cours..." : "Se connecter"}
              </Button>
            </form>

            {/* Demo credentials */}
            <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
              <p className="text-xs font-medium text-blue-700 mb-1">Comptes de démonstration :</p>
              <div className="space-y-1 text-xs text-blue-600">
                <p>🩺 Médecin : <span className="font-mono">dr.konan@medilink.ci</span> / demo123</p>
                <p>👨‍💼 Admin : <span className="font-mono">admin@medilink.ci</span> / demo123</p>
                <p>💊 Pharmacien : <span className="font-mono">pharma@medilink.ci</span> / demo123</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-slate-400 text-xs">
          © 2026 MediLink — Système DME Unifié Africain
        </p>
      </div>
    </div>
  );
}
