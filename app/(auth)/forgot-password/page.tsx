"use client";
import { useState } from "react";
import Link from "next/link";
import { supabase, isDemoMode } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Heart, ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isDemoMode) {
      toast({ title: "Mode démo", description: "La réinitialisation de mot de passe nécessite Supabase configuré." });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Erreur";
      toast({ variant: "destructive", title: "Erreur", description: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-slate via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="bg-medical-green rounded-2xl p-3 shadow-lg">
              <Heart className="h-10 w-10 text-white" fill="currentColor" />
            </div>
          </div>
          <h1 className="text-3xl font-serif font-bold text-white">MediLink</h1>
          <p className="text-slate-300 text-sm">Réinitialisation du mot de passe</p>
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader>
            <CardTitle className="text-xl">Mot de passe oublié</CardTitle>
            <CardDescription>
              Saisissez votre adresse email professionnelle pour recevoir un lien de réinitialisation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="text-center space-y-4 py-4">
                <CheckCircle className="h-12 w-12 text-medical-green mx-auto" />
                <p className="font-semibold">Email envoyé !</p>
                <p className="text-sm text-muted-foreground">
                  Un lien de réinitialisation a été envoyé à <strong>{email}</strong>.
                  Vérifiez votre boîte mail (et les spams).
                </p>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/login">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Retour à la connexion
                  </Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
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
                <Button type="submit" className="w-full" variant="medical" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? "Envoi en cours..." : "Envoyer le lien de réinitialisation"}
                </Button>
                <Button asChild variant="ghost" className="w-full">
                  <Link href="/login">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Retour à la connexion
                  </Link>
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-slate-400 text-xs">
          © 2026 MediLink — Système DME Unifié — Bénin
        </p>
      </div>
    </div>
  );
}
