import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { formatDate, formatAge } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const patientId = request.nextUrl.searchParams.get("patientId");
    if (!patientId) return NextResponse.json({ error: "patientId requis" }, { status: 400 });

    // Load all patient data
    const [patientRes, allergiesRes, antecedentsRes, consultationsRes, prescriptionsRes, vaccinationsRes] = await Promise.all([
      supabase.from("patients").select("*").eq("id", patientId).single(),
      supabase.from("allergies").select("*").eq("patient_id", patientId).eq("actif", true),
      supabase.from("antecedents").select("*").eq("patient_id", patientId).is("deleted_at", null),
      supabase.from("consultations").select("*").eq("patient_id", patientId).is("deleted_at", null).order("date_consultation", { ascending: false }),
      supabase.from("prescriptions").select("*").eq("patient_id", patientId).is("deleted_at", null).order("date_prescription", { ascending: false }),
      supabase.from("vaccinations").select("*").eq("patient_id", patientId).order("date_vaccination", { ascending: false }),
    ]);

    const patient = patientRes.data;
    if (!patient) return NextResponse.json({ error: "Patient non trouvé" }, { status: 404 });

    const allergies = allergiesRes.data || [];
    const antecedents = antecedentsRes.data || [];
    const consultations = consultationsRes.data || [];
    const prescriptions = prescriptionsRes.data || [];
    const vaccinations = vaccinationsRes.data || [];

    // Log audit
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      patient_id: patientId,
      action: "export_pdf",
      timestamp: new Date().toISOString(),
    });

    // Generate HTML for PDF (printable)
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Dossier Médical — ${patient.prenom} ${patient.nom}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Georgia', serif; font-size: 11pt; color: #1E293B; line-height: 1.5; }
    .header { background: #0D7A5F; color: white; padding: 20px; display: flex; justify-content: space-between; align-items: center; }
    .header h1 { font-size: 20pt; }
    .header p { font-size: 9pt; opacity: 0.8; }
    .npi-badge { background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 8px; text-align: right; }
    .npi-badge .code { font-family: monospace; font-size: 14pt; font-weight: bold; }
    .patient-info { padding: 16px 20px; background: #F8FAFC; border-bottom: 2px solid #0D7A5F; }
    .patient-info h2 { font-size: 16pt; color: #0D7A5F; }
    .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 8px; font-size: 9pt; }
    .section { padding: 16px 20px; border-bottom: 1px solid #E2E8F0; }
    .section h3 { font-size: 12pt; color: #0D7A5F; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; margin-bottom: 8px; }
    .allergie { background: #FEE2E2; border: 1px solid #FCA5A5; padding: 6px 10px; border-radius: 4px; margin-bottom: 4px; }
    .allergie.anaphylactique { background: #DC2626; color: white; border-color: #B91C1C; }
    .consultation { border: 1px solid #E2E8F0; padding: 10px; border-radius: 4px; margin-bottom: 8px; }
    .consultation-date { font-weight: bold; color: #0D7A5F; }
    .prescription { padding: 4px 0; border-bottom: 1px dotted #E2E8F0; }
    .footer { padding: 12px 20px; font-size: 8pt; color: #94A3B8; text-align: center; border-top: 1px solid #E2E8F0; }
    @media print { body { -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>MediLink — Dossier Médical</h1>
      <p>Système de Dossier Médical Électronique Unifié</p>
      <p>Imprimé le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}</p>
    </div>
    <div class="npi-badge">
      <p style="font-size:8pt;">Numéro d'Identification</p>
      <div class="code">${patient.npi}</div>
    </div>
  </div>

  <div class="patient-info">
    <h2>${patient.prenom} ${patient.nom.toUpperCase()}</h2>
    <div class="info-grid">
      <div><strong>Date de naissance :</strong> ${formatDate(patient.date_naissance)} (${formatAge(patient.date_naissance)})</div>
      <div><strong>Sexe :</strong> ${patient.sexe === "M" ? "Masculin" : "Féminin"}</div>
      <div><strong>Groupe sanguin :</strong> ${patient.groupe_sanguin || "—"}${patient.rhesus || ""}</div>
      <div><strong>Nationalité :</strong> ${patient.nationalite || "—"}</div>
      <div><strong>Profession :</strong> ${patient.profession || "—"}</div>
      <div><strong>Assurance :</strong> ${patient.assurance_organisme || "Non assuré"}</div>
      <div><strong>Contact urgence :</strong> ${patient.contact_urgence_nom || "—"} (${patient.contact_urgence_tel || "—"})</div>
    </div>
  </div>

  ${allergies.length > 0 ? `
  <div class="section">
    <h3>⚠️ ALLERGIES ET INTOLÉRANCES</h3>
    ${allergies.map((a) => `
      <div class="allergie ${a.severite === "anaphylactique" ? "anaphylactique" : ""}">
        <strong>${a.substance}</strong> — ${a.type} — Sévérité : ${a.severite}<br>
        Réaction : ${a.reaction}
      </div>
    `).join("")}
  </div>` : ""}

  ${antecedents.length > 0 ? `
  <div class="section">
    <h3>ANTÉCÉDENTS MÉDICAUX</h3>
    ${antecedents.map((a) => `
      <div style="margin-bottom:4px;">
        <strong>${a.description}</strong>
        ${a.cim10_code ? `<span style="font-family:monospace; background:#E2E8F0; padding:1px 4px; border-radius:2px; font-size:9pt;">${a.cim10_code}</span>` : ""}
        — ${a.actif ? "Actif" : "Résolu"}
        ${a.date_debut ? ` (depuis ${formatDate(a.date_debut)})` : ""}
      </div>
    `).join("")}
  </div>` : ""}

  ${prescriptions.length > 0 ? `
  <div class="section">
    <h3>PRESCRIPTIONS</h3>
    ${prescriptions.filter((p) => ["prescrit", "en_cours", "dispense"].includes(p.statut)).map((p) => `
      <div class="prescription">
        <strong>${p.medicament_dci} ${p.dosage}</strong> — ${p.posologie} — ${p.duree}
        ${p.date_expiration ? ` (expire le ${formatDate(p.date_expiration)})` : ""}
      </div>
    `).join("")}
  </div>` : ""}

  ${consultations.length > 0 ? `
  <div class="section">
    <h3>HISTORIQUE DES CONSULTATIONS (${consultations.length})</h3>
    ${consultations.slice(0, 10).map((c) => `
      <div class="consultation">
        <span class="consultation-date">${formatDate(c.date_consultation)}</span>
        ${c.diagnostic_cim10 ? `<span style="font-family:monospace; background:#E2E8F0; padding:1px 4px; border-radius:2px; font-size:9pt;">${c.diagnostic_cim10}</span>` : ""}
        <br><strong>Motif :</strong> ${c.motif}
        ${c.diagnostic_principal ? `<br><strong>Diagnostic :</strong> ${c.diagnostic_principal}` : ""}
        ${c.plan_prise_en_charge ? `<br><strong>Plan :</strong> ${c.plan_prise_en_charge}` : ""}
      </div>
    `).join("")}
    ${consultations.length > 10 ? `<p style="font-size:9pt; color:#64748B;">(${consultations.length - 10} consultations supplémentaires non affichées)</p>` : ""}
  </div>` : ""}

  ${vaccinations.length > 0 ? `
  <div class="section">
    <h3>CARNET VACCINAL</h3>
    ${vaccinations.map((v) => `
      <div style="margin-bottom:2px;">
        ${formatDate(v.date_vaccination)} — <strong>${v.vaccin}</strong>
        ${v.dose ? ` (${v.dose})` : ""}
        ${v.lot ? ` — Lot: ${v.lot}` : ""}
        ${v.prochain_rappel ? ` — Rappel: ${formatDate(v.prochain_rappel)}` : ""}
      </div>
    `).join("")}
  </div>` : ""}

  <div class="footer">
    Document généré par MediLink — Système de Dossier Médical Électronique Unifié<br>
    Ce document est confidentiel et destiné exclusivement aux professionnels de santé autorisés.<br>
    Imprimé le ${new Date().toLocaleDateString("fr-FR")} — NPI: ${patient.npi}
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="dossier-${patient.npi}.html"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
