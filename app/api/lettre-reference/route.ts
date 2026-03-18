import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { formatDate, formatAge } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const destinataire = searchParams.get("destinataire") || "Confrère(sse)";
    const motif = searchParams.get("motif") || "";
    const observations = searchParams.get("observations") || "";

    if (!patientId) return NextResponse.json({ error: "patientId requis" }, { status: 400 });

    // Load patient data
    const [patientRes, profileRes, allergiesRes, antecedentsRes, prescriptionsRes, derniereConsultRes] = await Promise.all([
      supabase.from("patients").select("*").eq("id", patientId).single(),
      supabase.from("users_profiles").select("*, etablissements(*)").eq("id", user.id).single(),
      supabase.from("allergies").select("*").eq("patient_id", patientId).eq("actif", true),
      supabase.from("antecedents").select("*").eq("patient_id", patientId).eq("actif", true),
      supabase.from("prescriptions").select("*").eq("patient_id", patientId).in("statut", ["prescrit", "en_cours"]),
      supabase.from("consultations").select("*").eq("patient_id", patientId).order("date_consultation", { ascending: false }).limit(1).single(),
    ]);

    type ProfileData = {
      etablissements?: { nom?: string; adresse?: string; ville?: string; pays?: string; telephone?: string } | null;
    };
    const patient = patientRes.data;
    const profile = profileRes.data as ProfileData;
    const allergies = allergiesRes.data || [];
    const antecedents = antecedentsRes.data || [];
    const prescriptions = prescriptionsRes.data || [];
    const derniereConsult = derniereConsultRes.data;

    if (!patient) return NextResponse.json({ error: "Patient non trouvé" }, { status: 404 });

    const etablissement = profile?.etablissements;
    const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

    // Log audit
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      patient_id: patientId,
      action: "export_lettre_reference",
      details: `Lettre de référence générée — destinataire: ${destinataire}`,
      timestamp: new Date().toISOString(),
    });

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Lettre de référence — ${patient.prenom} ${patient.nom}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'DM Sans', Arial, sans-serif; font-size: 12px; color: #1e293b; background: white; }
    .page { max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0D7A5F; padding-bottom: 20px; margin-bottom: 24px; }
    .logo-section h1 { font-family: 'Source Serif 4', Georgia, serif; font-size: 22px; font-weight: 700; color: #0D7A5F; }
    .logo-section p { font-size: 11px; color: #64748b; }
    .etablissement-info { text-align: right; font-size: 11px; line-height: 1.6; }
    .etablissement-info strong { font-size: 13px; color: #1e293b; }
    .date-lieu { margin-bottom: 20px; text-align: right; font-size: 11px; color: #64748b; }
    .destinataire { margin-bottom: 20px; }
    .destinataire p { font-size: 12px; }
    .objet { background: #f8fafc; border-left: 4px solid #0D7A5F; padding: 12px 16px; margin-bottom: 24px; }
    .objet strong { font-size: 13px; color: #0D7A5F; }
    .section { margin-bottom: 20px; }
    .section-title { font-family: 'Source Serif 4', Georgia, serif; font-size: 13px; font-weight: 700; color: #0D7A5F; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 10px; }
    .patient-id { display: flex; gap: 20px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 12px; margin-bottom: 20px; }
    .patient-id-field { flex: 1; }
    .patient-id-field label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 2px; }
    .patient-id-field span { font-weight: 600; font-size: 13px; }
    .npi-badge { background: #0D7A5F; color: white; padding: 3px 8px; border-radius: 4px; font-family: monospace; font-size: 12px; }
    .allergy-badge { display: inline-block; background: #fee2e2; border: 1px solid #fca5a5; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin: 2px; }
    .anaphylactic { background: #dc2626; color: white; border-color: #dc2626; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #f1f5f9; text-align: left; padding: 6px 8px; font-weight: 600; color: #475569; border: 1px solid #e2e8f0; }
    td { padding: 6px 8px; border: 1px solid #e2e8f0; vertical-align: top; }
    .body-text { line-height: 1.8; margin-bottom: 16px; }
    .signature-block { margin-top: 40px; display: flex; justify-content: space-between; }
    .signature-left { font-size: 11px; line-height: 1.6; }
    .signature-right { text-align: center; border: 1px dashed #cbd5e1; padding: 20px 40px; min-width: 200px; }
    .signature-right p { font-size: 10px; color: #94a3b8; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
    .confidential { background: #fef2f2; border: 1px solid #fca5a5; border-radius: 4px; padding: 8px 12px; font-size: 11px; color: #7f1d1d; margin-bottom: 20px; }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .page { padding: 20px; max-width: 100%; }
    }
  </style>
</head>
<body>
<div class="page">
  <!-- En-tête établissement -->
  <div class="header">
    <div class="logo-section">
      <h1>MediLink</h1>
      <p>Dossier Médical Électronique Unifié</p>
      ${etablissement ? `<p style="margin-top:8px;font-weight:600;color:#1e293b;">${etablissement.nom}</p><p>${etablissement.adresse || ""}</p><p>${etablissement.ville || ""}, ${etablissement.pays || ""}</p>${etablissement.telephone ? `<p>Tél: ${etablissement.telephone}</p>` : ""}` : ""}
    </div>
    <div class="etablissement-info">
      <strong>LETTRE DE RÉFÉRENCE MÉDICALE</strong>
      <p style="margin-top:4px;color:#0D7A5F;font-weight:600;">CONFIDENTIEL — Médical</p>
    </div>
  </div>

  <!-- Date et lieu -->
  <div class="date-lieu">
    ${etablissement?.ville || "Abidjan"}, le ${today}
  </div>

  <!-- Destinataire -->
  <div class="destinataire">
    <p>À l'attention du / de la :</p>
    <p style="font-weight:600;margin-top:4px;">${destinataire}</p>
  </div>

  <!-- Objet -->
  <div class="objet">
    <strong>Objet : Lettre de référence — ${patient.prenom} ${patient.nom.toUpperCase()}</strong><br/>
    <span style="font-size:11px;color:#475569;">NPI : <span class="npi-badge">${patient.npi}</span></span>
    ${motif ? `<br/><span style="font-size:11px;color:#475569;margin-top:4px;display:block;">Motif : ${motif}</span>` : ""}
  </div>

  <!-- Mention de confidentialité -->
  <div class="confidential">
    🔒 Ce document est confidentiel. Il ne doit être consulté que par le professionnel de santé destinataire dans le cadre de la prise en charge du patient désigné.
  </div>

  <!-- Identification patient -->
  <div class="patient-id">
    <div class="patient-id-field">
      <label>Patient</label>
      <span>${patient.prenom} ${patient.nom.toUpperCase()}</span>
    </div>
    <div class="patient-id-field">
      <label>Date de naissance</label>
      <span>${formatDate(patient.date_naissance)} (${formatAge(patient.date_naissance)})</span>
    </div>
    <div class="patient-id-field">
      <label>Sexe</label>
      <span>${patient.sexe === "M" ? "Masculin" : "Féminin"}</span>
    </div>
    <div class="patient-id-field">
      <label>Groupe sanguin</label>
      <span>${patient.groupe_sanguin || "ND"}${patient.rhesus || ""}</span>
    </div>
    <div class="patient-id-field">
      <label>NPI</label>
      <span class="npi-badge">${patient.npi}</span>
    </div>
  </div>

  <p class="body-text">Cher(e) Confrère(sse),</p>
  <p class="body-text">
    Je me permets de vous adresser ${patient.sexe === "M" ? "M." : "Mme"} <strong>${patient.prenom} ${patient.nom.toUpperCase()}</strong>,
    ${formatAge(patient.date_naissance)},${patient.profession ? ` ${patient.profession},` : ""}
    pour ${motif || "prise en charge spécialisée"}.
  </p>

  <!-- Allergies (CRUCIAL — toujours en premier) -->
  ${allergies.length > 0 ? `
  <div class="section">
    <div class="section-title">⚠️ ALLERGIES ET INTOLÉRANCES — À LIRE IMPÉRATIVEMENT</div>
    <div>
      ${allergies.map(a => `<span class="allergy-badge ${a.severite === "anaphylactique" ? "anaphylactic" : ""}">${a.substance} (${a.severite}) : ${a.reaction}</span>`).join("")}
    </div>
  </div>` : ""}

  <!-- Antécédents -->
  ${antecedents.length > 0 ? `
  <div class="section">
    <div class="section-title">Antécédents médicaux pertinents</div>
    <table>
      <thead><tr><th>Pathologie</th><th>Catégorie</th><th>Code CIM-10</th><th>Depuis</th><th>Statut</th></tr></thead>
      <tbody>
        ${antecedents.map(a => `<tr>
          <td>${a.description}</td>
          <td style="text-transform:capitalize">${a.categorie}</td>
          <td>${a.cim10_code || "—"}</td>
          <td>${a.date_debut ? formatDate(a.date_debut) : "—"}</td>
          <td>${a.actif ? "Actif" : "Résolu"}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>` : ""}

  <!-- Traitement en cours -->
  ${prescriptions.length > 0 ? `
  <div class="section">
    <div class="section-title">Traitement en cours</div>
    <table>
      <thead><tr><th>Médicament (DCI)</th><th>Dosage</th><th>Posologie</th><th>Durée</th></tr></thead>
      <tbody>
        ${prescriptions.map(p => `<tr>
          <td>${p.medicament_dci}${p.medicament_commercial ? ` (${p.medicament_commercial})` : ""}</td>
          <td>${p.dosage}</td>
          <td>${p.posologie}</td>
          <td>${p.duree}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>` : ""}

  <!-- Dernière consultation -->
  ${derniereConsult ? `
  <div class="section">
    <div class="section-title">Résumé de la dernière consultation (${formatDate(derniereConsult.date_consultation)})</div>
    ${derniereConsult.motif ? `<p style="margin-bottom:6px;"><strong>Motif :</strong> ${derniereConsult.motif}</p>` : ""}
    ${derniereConsult.diagnostic_principal ? `<p style="margin-bottom:6px;"><strong>Diagnostic :</strong> ${derniereConsult.diagnostic_principal}${derniereConsult.diagnostic_cim10 ? ` [${derniereConsult.diagnostic_cim10}]` : ""}</p>` : ""}
    ${derniereConsult.plan_prise_en_charge ? `<p><strong>Plan :</strong> ${derniereConsult.plan_prise_en_charge}</p>` : ""}
  </div>` : ""}

  <!-- Observations personnalisées -->
  ${observations ? `
  <div class="section">
    <div class="section-title">Observations et motif de la référence</div>
    <p style="line-height:1.8;">${observations.replace(/\n/g, "<br/>")}</p>
  </div>` : ""}

  <p class="body-text">
    Je reste disponible pour tout renseignement complémentaire et vous adresse, Cher(e) Confrère(sse), mes cordiales salutations confraternelles.
  </p>

  <!-- Bloc signature -->
  <div class="signature-block">
    <div class="signature-left">
      <p style="font-weight:600;">${profile?.prenom || ""} ${profile?.nom || ""}</p>
      ${profile?.specialite ? `<p>${profile.specialite}</p>` : ""}
      ${etablissement ? `<p>${etablissement.nom}</p><p>${etablissement.ville || ""}</p>` : ""}
      <p style="margin-top:8px;color:#64748b;font-size:11px;">Document généré le ${today} via MediLink</p>
    </div>
    <div class="signature-right">
      <p style="margin-bottom:30px;">Signature et cachet</p>
      <p>_______________________</p>
    </div>
  </div>

  <div class="footer">
    MediLink — Dossier Médical Électronique Unifié | Document confidentiel généré le ${today} | NPI Patient : ${patient.npi}
  </div>
</div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="lettre-reference-${patient.npi}.html"`,
      },
    });
  } catch (error) {
    console.error("Lettre référence error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
