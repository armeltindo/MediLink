export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
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

// ── Décrémentation du stock (non-bloquante) ───────────────────────────────────
// Recherche un article de stock correspondant au DCI prescrit (insensible à la casse)
// et soustrait la quantité dispensée, sans jamais descendre en-dessous de 0.
async function decrementStock(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  pharmacieId: string,
  medicamentDci: string,
  quantite: number
): Promise<void> {
  try {
    const { data: rows } = await supabase
      .from("stock_medicaments")
      .select("id, quantite_stock")
      .eq("pharmacie_id", pharmacieId)
      .ilike("medicament_dci", medicamentDci)
      .is("deleted_at", null)
      .gt("quantite_stock", 0)
      .order("quantite_stock", { ascending: true })
      .limit(1);

    if (!rows || rows.length === 0) return;

    const stock = rows[0] as { id: string; quantite_stock: number };
    await supabase
      .from("stock_medicaments")
      .update({
        quantite_stock: Math.max(0, stock.quantite_stock - quantite),
        updated_at: new Date().toISOString(),
      })
      .eq("id", stock.id);
  } catch {
    // Non-bloquant : une erreur de stock ne doit pas annuler une dispensation
  }
}

// PATCH /api/prescriptions/[id]/dispenser
// Corps : { pharmacie_id, produit_servi?, quantite_dispensee? }
//
//   Deux modes selon que la prescription a une quantite définie :
//
//   MODE NOUVEAU (prescription.quantite IS NOT NULL) :
//     • quantite_dispensee (requis) : quantité dispensée lors de cette opération
//     • Insère dans prescription_dispensations
//     • Les triggers DB mettent à jour prescriptions.statut automatiquement :
//         → 'partiellement_dispense' si quantite restante > 0
//         → 'dispense' si quantite prescrite atteinte
//
//   MODE LEGACY (prescription.quantite IS NULL) :
//     • Comportement binaire inchangé : UPDATE prescriptions SET statut='dispense'
//
//   Règles communes :
//     1. Seul un pharmacien authentifié peut dispenser
//     2. La prescription ne doit pas être annulée ni expirée
//     3. Le statut ne doit pas déjà être 'dispense'
//     4. L'établissement doit être de type 'pharmacie'
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServer();

  // Authentification
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // Rôle
  const { data: profile } = await supabase
    .from("users_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "pharmacien") {
    return NextResponse.json({ error: "Accès refusé — rôle pharmacien requis" }, { status: 403 });
  }

  // Corps de la requête
  const body = await req.json();
  const { pharmacie_id, produit_servi, quantite_dispensee } = body as {
    pharmacie_id: string;
    produit_servi?: string;
    quantite_dispensee?: number;
  };

  if (!pharmacie_id) {
    return NextResponse.json({ error: "pharmacie_id requis" }, { status: 400 });
  }

  // Vérifier que l'établissement est bien une pharmacie
  const { data: etab } = await supabase
    .from("etablissements")
    .select("id, type")
    .eq("id", pharmacie_id)
    .is("deleted_at", null)
    .single();

  if (!etab || etab.type !== "pharmacie") {
    return NextResponse.json({ error: "L'établissement n'est pas une pharmacie" }, { status: 400 });
  }

  // Vérifier que le pharmacien est bien affilié à cette pharmacie
  const { data: affiliation } = await supabase
    .from("user_etablissements")
    .select("etablissement_id")
    .eq("user_id", user.id)
    .eq("etablissement_id", pharmacie_id)
    .is("suspended_at", null)
    .single();

  if (!affiliation) {
    return NextResponse.json(
      { error: "Vous n'êtes pas autorisé à dispenser pour cette pharmacie" },
      { status: 403 }
    );
  }

  // Vérifier l'état actuel de la prescription + quantités existantes
  const { data: prescription } = await supabase
    .from("prescriptions")
    .select("id, medicament_dci, statut, date_expiration, quantite, unite")
    .eq("id", params.id)
    .is("deleted_at", null)
    .single();

  if (!prescription) {
    return NextResponse.json({ error: "Prescription introuvable" }, { status: 404 });
  }
  if (prescription.statut === "dispense") {
    return NextResponse.json({ error: "Ce produit a déjà été entièrement dispensé" }, { status: 409 });
  }
  if (prescription.statut === "annule") {
    return NextResponse.json({ error: "Cette prescription est annulée" }, { status: 409 });
  }
  if (prescription.date_expiration && new Date(prescription.date_expiration) < new Date()) {
    return NextResponse.json({ error: "Cette prescription est expirée" }, { status: 409 });
  }

  // Substitution : noter uniquement si le produit servi diffère du DCI prescrit
  const substitution =
    produit_servi && produit_servi.trim().toLowerCase() !== prescription.medicament_dci.trim().toLowerCase()
      ? produit_servi.trim()
      : null;

  // ── MODE NOUVEAU : prescription avec quantite définie ──────────────
  if (prescription.quantite !== null) {
    // quantite_dispensee obligatoire
    if (!quantite_dispensee || quantite_dispensee <= 0) {
      return NextResponse.json(
        { error: "quantite_dispensee requis et doit être > 0" },
        { status: 400 }
      );
    }
    if (!Number.isInteger(quantite_dispensee)) {
      return NextResponse.json(
        { error: "quantite_dispensee doit être un entier" },
        { status: 400 }
      );
    }

    // Calculer la quantité déjà dispensée
    const { data: existing } = await supabase
      .from("prescription_dispensations")
      .select("quantite")
      .eq("prescription_id", params.id);

    const totalDeja = (existing ?? []).reduce((sum, d) => sum + d.quantite, 0);
    const restant = prescription.quantite - totalDeja;

    if (quantite_dispensee > restant) {
      return NextResponse.json(
        {
          error: `Quantité demandée (${quantite_dispensee} ${prescription.unite ?? ""}) dépasse la quantité restante (${restant} ${prescription.unite ?? ""})`,
          restant,
          total_prescrit: prescription.quantite,
          deja_dispense: totalDeja,
        },
        { status: 409 }
      );
    }

    // Insérer la dispensation — les triggers DB mettent à jour prescriptions.statut
    const { error: insertError } = await supabase
      .from("prescription_dispensations")
      .insert({
        prescription_id: params.id,
        pharmacie_id,
        dispense_par: user.id,
        quantite: quantite_dispensee,
        substitution_generique: substitution,
        date_dispensation: new Date().toISOString(),
      });

    if (insertError) {
      // Le trigger peut lever une erreur 'quantite_depassee:...'
      if (insertError.message.includes("quantite_depassee")) {
        return NextResponse.json(
          { error: "Quantité dépassée — une autre dispensation concurrente a eu lieu" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Fix 2 — Décrémenter le stock correspondant (non-bloquant)
    await decrementStock(supabase, pharmacie_id, prescription.medicament_dci, quantite_dispensee);

    // Relire la prescription mise à jour par le trigger
    const { data: updated } = await supabase
      .from("prescriptions")
      .select("id, statut, date_dispensation, pharmacie_id, substitution_generique, quantite, unite")
      .eq("id", params.id)
      .single();

    const nouvelTotalDispense = totalDeja + quantite_dispensee;
    return NextResponse.json({
      ...updated,
      quantite_dispensee_cette_fois: quantite_dispensee,
      total_dispense: nouvelTotalDispense,
      restant: prescription.quantite - nouvelTotalDispense,
    });
  }

  // ── MODE LEGACY : prescription sans quantite (dispensation binaire) ─
  const now = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from("prescriptions")
    .update({
      statut: "dispense",
      dispense_par: user.id,
      date_dispensation: now,
      pharmacie_id,
      substitution_generique: substitution,
    })
    .eq("id", params.id)
    .not("statut", "in", '("dispense","annule")')
    .select("id, statut, date_dispensation, pharmacie_id, substitution_generique")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fix 3 — Insérer un enregistrement d'historique même en mode legacy
  // quantite_dispensee est optionnel côté client ; on stocke 0 s'il n'est pas fourni
  // afin de tracer QUI a dispensé et QUAND, même sans quantité connue.
  const legacyQty = (quantite_dispensee && quantite_dispensee > 0) ? quantite_dispensee : 0;
  // Non-bloquant : erreur d'historique/stock ne doit pas annuler la réponse
  void (async () => {
    try {
      await supabase.from("prescription_dispensations").insert({
        prescription_id: params.id,
        pharmacie_id,
        dispense_par: user.id,
        quantite: legacyQty,
        substitution_generique: substitution,
        date_dispensation: now,
      });
      if (legacyQty > 0) {
        await decrementStock(supabase, pharmacie_id, prescription.medicament_dci, legacyQty);
      }
    } catch { /* non-bloquant */ }
  })();

  return NextResponse.json(updated);
}
