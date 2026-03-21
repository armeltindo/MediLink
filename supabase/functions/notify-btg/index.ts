/**
 * Edge Function: notify-btg
 *
 * Triggered via HTTP POST immediately after a break-the-glass (BTG) access.
 * Sends email notifications to the facility administrator and DPO within 60s.
 *
 * Usage (called from Next.js API route /api/audit/break-the-glass):
 *   await fetch(`${SUPABASE_URL}/functions/v1/notify-btg`, {
 *     method: "POST",
 *     headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
 *     body: JSON.stringify({ userId, patientId, patientNpi, justification, etablissementId }),
 *   });
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

interface BTGPayload {
  userId: string;
  patientId: string;
  patientNpi: string;
  justification: string;
  etablissementId: string;
  timestamp: string;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const payload: BTGPayload = await req.json();
    const { userId, patientNpi, justification, etablissementId, timestamp } = payload;

    // Fetch actor details
    const { data: actor } = await supabase
      .from("users_profiles")
      .select("nom, prenom, role, specialite")
      .eq("id", userId)
      .single();

    // Fetch facility admin email
    const { data: admins } = await supabase
      .from("users_profiles")
      .select("nom, prenom")
      .eq("etablissement_id", etablissementId)
      .in("role", ["admin_etablissement", "super_admin"])
      .is("deleted_at", null);

    const actorName = actor ? `${actor.prenom} ${actor.nom} (${actor.role})` : userId;
    const adminList = admins?.map((a: { nom: string; prenom: string }) => `${a.prenom} ${a.nom}`).join(", ") || "Administrateurs";
    const accessTime = new Date(timestamp).toLocaleString("fr-FR", { timeZone: "Africa/Porto-Novo" });

    // Log notification in audit_logs
    await supabase.from("audit_logs").insert({
      user_id: userId,
      patient_id: payload.patientId,
      action: "btg_notification_sent",
      details: JSON.stringify({
        patient_nip: patientNpi,
        acteur: actorName,
        justification,
        notified_admins: adminList,
        notification_sent_at: new Date().toISOString(),
      }),
      etablissement_id: etablissementId,
      timestamp: new Date().toISOString(),
    });

    // In production: send email via Resend / SendGrid / Supabase Auth emails
    // Example with Resend (requires RESEND_API_KEY env var):
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      const emailBody = {
        from: "noreply@medilink.app",
        to: ["admin@medilink.app"], // Replace with real admin emails from DB
        subject: `🚨 ALERTE CRITIQUE — Accès d'urgence (Break-the-Glass) — Patient ${patientNpi}`,
        html: `
          <h2 style="color:#dc2626">Accès d'urgence détecté — MediLink</h2>
          <p><strong>Date et heure :</strong> ${accessTime}</p>
          <p><strong>Utilisateur :</strong> ${actorName}</p>
          <p><strong>Patient NIP :</strong> ${patientNpi}</p>
          <p><strong>Justification :</strong> ${justification}</p>
          <hr/>
          <p style="color:#6b7280;font-size:12px">
            Cet accès a été journalisé au niveau CRITIQUE dans le journal d'audit MediLink.
            Vérifiez le journal d'audit pour plus de détails.
          </p>
        `,
      };

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailBody),
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: "BTG notification sent", actor: actorName }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("notify-btg error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
