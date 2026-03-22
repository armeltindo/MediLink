export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function createSupabaseServer() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

// GET /api/pharmacie/stats
// Retourne les KPIs spécifiques au pharmacien connecté pour sa pharmacie active.
export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json(fallbackStats());
  }

  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["pharmacien", "super_admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // Pharmacie active via cookie
  const cookieStore = cookies();
  const pharmacieId = cookieStore.get("selected_etablissement_id")?.value ?? null;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
  const in3Days    = new Date(now.getTime() + 3  * 24 * 60 * 60 * 1000).toISOString();
  const in7Days    = new Date(now.getTime() + 7  * 24 * 60 * 60 * 1000).toISOString();

  const [
    enAttenteRes,
    partielRes,
    dispenséesRes,
    expirantRes,
    stockFaibleRes,
    ordUrgentesRes,
    dispensationsRecentesRes,
  ] = await Promise.allSettled([
    // Ordonnances en attente de dispensation
    supabase.from("prescriptions")
      .select("id", { count: "exact" })
      .eq("statut", "prescrit")
      .is("deleted_at", null)
      .or(`date_expiration.is.null,date_expiration.gte.${now.toISOString()}`),

    // Partiellement dispensées
    supabase.from("prescriptions")
      .select("id", { count: "exact" })
      .eq("statut", "partiellement_dispense")
      .is("deleted_at", null),

    // Dispensées aujourd'hui (par cette pharmacie si connue)
    (() => {
      let q = supabase.from("prescriptions")
        .select("id", { count: "exact" })
        .eq("statut", "dispense")
        .gte("date_dispensation", startOfDay)
        .lte("date_dispensation", endOfDay);
      if (pharmacieId) q = q.eq("pharmacie_id", pharmacieId);
      return q;
    })(),

    // Expirant dans 3 jours (urgentes)
    supabase.from("prescriptions")
      .select("id", { count: "exact" })
      .in("statut", ["prescrit", "partiellement_dispense"])
      .lte("date_expiration", in3Days)
      .gte("date_expiration", now.toISOString())
      .is("deleted_at", null),

    // Stock faible (si pharmacie connue)
    pharmacieId
      ? supabase.from("stock_medicaments")
          .select("id", { count: "exact" })
          .eq("pharmacie_id", pharmacieId)
          .is("deleted_at", null)
          .filter("quantite_stock", "lte", "seuil_alerte")
      : Promise.resolve({ count: 0, data: [], error: null }),

    // 5 ordonnances urgentes (expirant dans 7 jours ou partiellement dispensées)
    supabase.from("prescriptions")
      .select("id, medicament_dci, statut, date_expiration, quantite, unite, patients(prenom, nom, imu)")
      .in("statut", ["prescrit", "partiellement_dispense"])
      .or(`date_expiration.is.null,date_expiration.gte.${now.toISOString()}`)
      .lte("date_expiration", in7Days)
      .is("deleted_at", null)
      .order("date_expiration", { ascending: true })
      .limit(5),

    // 10 dernières dispensations (de cette pharmacie si connue)
    (() => {
      let q = supabase.from("prescriptions")
        .select("id, medicament_dci, date_dispensation, substitution_generique, patients(prenom, nom), pharmacie:etablissements!pharmacie_id(nom)")
        .eq("statut", "dispense")
        .not("date_dispensation", "is", null)
        .is("deleted_at", null)
        .order("date_dispensation", { ascending: false })
        .limit(10);
      if (pharmacieId) q = q.eq("pharmacie_id", pharmacieId);
      return q;
    })(),
  ]);

  const get = <T>(r: PromiseSettledResult<T>, fallback: T): T =>
    r.status === "fulfilled" ? r.value : fallback;
  const emptyCount = { count: 0, data: [], error: null } as never;
  const emptyData  = { data: [], error: null }            as never;

  const [enAttente, partiel, dispensees, expirant, stockFaible, ordUrgentes, dispensationsRecentes] = [
    get(enAttenteRes, emptyCount),
    get(partielRes, emptyCount),
    get(dispenséesRes, emptyCount),
    get(expirantRes, emptyCount),
    get(stockFaibleRes, emptyCount),
    get(ordUrgentesRes, emptyData),
    get(dispensationsRecentesRes, emptyData),
  ];

  return NextResponse.json({
    pharmacieId,
    enAttente:           enAttente.count     ?? 0,
    partiellement:       partiel.count       ?? 0,
    dispensees_auj:      dispensees.count    ?? 0,
    expirant_urgent:     expirant.count      ?? 0,
    stock_faible:        stockFaible.count   ?? 0,
    ordonnances_urgentes: (ordUrgentes.data ?? []).map((p: {
      id: string;
      medicament_dci: string;
      statut: string;
      date_expiration: string | null;
      quantite: number | null;
      unite: string | null;
      patients?: { prenom: string; nom: string; imu: string } | { prenom: string; nom: string; imu: string }[] | null;
    }) => {
      const pat = Array.isArray(p.patients) ? p.patients[0] : p.patients;
      return { ...p, patientNom: pat ? `${pat.prenom} ${pat.nom}` : "—", patientImu: pat?.imu ?? null };
    }),
    dispensations_recentes: (dispensationsRecentes.data ?? []).map((p: {
      id: string;
      medicament_dci: string;
      date_dispensation: string;
      substitution_generique: string | null;
      patients?: { prenom: string; nom: string } | { prenom: string; nom: string }[] | null;
      pharmacie?: { nom: string } | { nom: string }[] | null;
    }) => {
      const pat = Array.isArray(p.patients) ? p.patients[0] : p.patients;
      const ph  = Array.isArray(p.pharmacie) ? p.pharmacie[0] : p.pharmacie;
      return {
        id: p.id,
        medicament_dci: p.medicament_dci,
        date_dispensation: p.date_dispensation,
        substitution_generique: p.substitution_generique,
        patientNom: pat ? `${pat.prenom} ${pat.nom}` : "—",
        pharmacieNom: ph?.nom ?? "—",
      };
    }),
  });
}

function fallbackStats() {
  return {
    pharmacieId: null,
    enAttente: 0, partiellement: 0, dispensees_auj: 0,
    expirant_urgent: 0, stock_faible: 0,
    ordonnances_urgentes: [], dispensations_recentes: [],
  };
}
