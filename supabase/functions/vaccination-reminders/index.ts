/**
 * Edge Function: vaccination-reminders
 *
 * Cron: every day at 07:00 UTC
 * Finds patients with vaccination boosters due in the next 30 days
 * and creates alert entries readable by the dashboard (US-VAC-03).
 *
 * Deploy: `supabase functions deploy vaccination-reminders --schedule "0 7 * * *"`
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "")) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const now = new Date();
    const in30Days = new Date(now);
    in30Days.setDate(in30Days.getDate() + 30);

    // Find vaccinations with a booster due within the next 30 days
    const { data: reminders, error } = await supabase
      .from("vaccinations")
      .select(`
        id,
        vaccin,
        prochain_rappel,
        patient_id,
        patients!inner(nom, prenom, npi, medecin_traitant_id)
      `)
      .not("prochain_rappel", "is", null)
      .gte("prochain_rappel", now.toISOString())
      .lte("prochain_rappel", in30Days.toISOString());

    if (error) throw error;

    if (!reminders || reminders.length === 0) {
      return new Response(JSON.stringify({ message: "No vaccination reminders due", count: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Insert reminder alerts into audit_logs for dashboard consumption
    const alerts = reminders.map((v: {
      id: string;
      vaccin: string;
      prochain_rappel: string;
      patient_id: string;
      patients: { nom: string; prenom: string; npi: string; medecin_traitant_id: string | null };
    }) => ({
      user_id: v.patients.medecin_traitant_id || "system",
      patient_id: v.patient_id,
      action: "vaccination_reminder",
      details: JSON.stringify({
        vaccination_id: v.id,
        vaccin: v.vaccin,
        prochain_rappel: v.prochain_rappel,
        patient_npi: v.patients.npi,
        patient_nom: `${v.patients.prenom} ${v.patients.nom}`,
        days_remaining: Math.ceil(
          (new Date(v.prochain_rappel).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        ),
      }),
      timestamp: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase.from("audit_logs").insert(alerts);
    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ message: "Vaccination reminders processed", count: reminders.length }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("vaccination-reminders error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
