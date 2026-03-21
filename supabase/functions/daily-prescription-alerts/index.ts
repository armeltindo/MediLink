/**
 * Edge Function: daily-prescription-alerts
 *
 * Cron: every day at 08:00 UTC
 * Deno Deploy trigger: `supabase functions deploy daily-prescription-alerts`
 *
 * Finds all active prescriptions expiring in the next 7 days and inserts
 * notification entries that the Next.js dashboard reads via Supabase Realtime.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  // Allow cron invocation + manual trigger (POST with service-role key)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "")) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const now = new Date();
    const in7Days = new Date(now);
    in7Days.setDate(in7Days.getDate() + 7);

    // Find prescriptions expiring in the next 7 days
    const { data: expiring, error } = await supabase
      .from("prescriptions")
      .select(`
        id,
        medicament_dci,
        date_expiration,
        patient_id,
        medecin_id,
        patients!inner(nom, prenom, nip)
      `)
      .eq("statut", "en_cours")
      .not("date_expiration", "is", null)
      .gte("date_expiration", now.toISOString())
      .lte("date_expiration", in7Days.toISOString());

    if (error) throw error;

    if (!expiring || expiring.length === 0) {
      return new Response(JSON.stringify({ message: "No expiring prescriptions", count: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Log each alert to audit_logs so the dashboard can surface them
    const auditInserts = expiring.map((rx: {
      id: string;
      medicament_dci: string;
      date_expiration: string;
      patient_id: string;
      medecin_id: string;
      patients: { nom: string; prenom: string; nip: string };
    }) => ({
      user_id: rx.medecin_id,
      patient_id: rx.patient_id,
      action: "prescription_expiry_alert",
      details: JSON.stringify({
        prescription_id: rx.id,
        medicament: rx.medicament_dci,
        date_expiration: rx.date_expiration,
        patient_nip: rx.patients.nip,
        patient_nom: `${rx.patients.prenom} ${rx.patients.nom}`,
        days_remaining: Math.ceil(
          (new Date(rx.date_expiration).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        ),
      }),
      timestamp: new Date().toISOString(),
    }));

    const { error: auditError } = await supabase.from("audit_logs").insert(auditInserts);
    if (auditError) throw auditError;

    return new Response(
      JSON.stringify({ message: "Alerts processed", count: expiring.length }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("daily-prescription-alerts error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
