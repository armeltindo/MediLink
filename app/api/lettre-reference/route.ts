export const dynamic = "force-dynamic";

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

    const [patientRes, profileRes, allergiesRes, antecedentsRes, prescriptionsRes, consultationsRes] = await Promise.all([
      supabase.from("patients").select("*").eq("id", patientId).single(),
      supabase.from("users_profiles").select("*, etablissements(nom, adresse, ville, telephone)").eq("id", user.id).single(),
      supabase.from("allergies").select("*").eq("patient_id", patientId).eq("actif", true),
      supabase.from("antecedents").select("*").eq("patient_id", patientId).eq("actif", true).is("deleted_at", null),
      supabase.from("prescriptions").select("*").eq("patient_id", patientId).in("statut", ["prescrit", "en_cours", "dispense"]).is("deleted_at", null),
      supabase.from("consultations").select("*").eq("patient_id", patientId).is("deleted_at", null).order("date_consultation", { ascending: false }).limit(1),
    ]);

    const patient = patientRes.data;
    if (!patient) return NextResponse.json({ error: "Patient non trouvé" }, { status: 404 });

    const medecin = profileRes.data;
    const allergies = allergiesRes.data || [];
    const antecedents = antecedentsRes.data || [];
    const prescriptions = prescriptionsRes.data || [];
    const lastConsultation = consultationsRes.data?.[0] || null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const etablissement = (medecin as any)?.etablissements;

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      patient_id: patientId,
      action: "export_pdf",
      details: JSON.stringify({ type: "lettre_reference" }),
      timestamp: new Date().toISOString(),
    });

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Lettre de Référence — ${patient.prenom} ${patient.nom}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Georgia', serif; font-size: 11pt; color: #1E293B; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0D7A5F; padding-bottom: 16px; margin-bottom: 20px; }
    .sender { font-size: 10pt; }
    .sender h2 { color: #0D7A5F; font-size: 14pt; margin-bottom: 4px; }
    .logo-svg { display: block; }
    .date-lieu { text-align: right; margin-bottom: 24px; font-size: 10pt; color: #64748B; }
    .object { margin-bottom: 20px; }
    .object strong { font-size: 11pt; }
    .patient-box { background: #F0FDF4; border: 1px solid #86EFAC; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; }
    .patient-box h3 { color: #0D7A5F; margin-bottom: 8px; }
    .patient-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; font-size: 9.5pt; }
    .body-text { margin-bottom: 16px; }
    .section-title { font-weight: bold; color: #0D7A5F; margin: 12px 0 4px; font-size: 10.5pt; border-bottom: 1px solid #E2E8F0; }
    .allergie-urgent { background: #FEE2E2; border-left: 3px solid #DC2626; padding: 4px 8px; margin-bottom: 4px; font-size: 9.5pt; }
    .item { padding: 3px 0; font-size: 9.5pt; border-bottom: 1px dotted #E2E8F0; }
    .signature { margin-top: 40px; display: flex; justify-content: space-between; }
    .sig-block { text-align: center; }
    .sig-line { width: 200px; border-bottom: 1px solid #1E293B; margin-bottom: 4px; height: 50px; }
    .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #E2E8F0; font-size: 8pt; color: #94A3B8; text-align: center; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="background:#FEF9C3;border:1px solid #FCD34D;padding:12px 16px;border-radius:8px;margin-bottom:20px;font-family:sans-serif;font-size:10pt;">
    <strong>📋 Lettre de référence</strong> — Vous pouvez modifier ce document avant impression.
    <button onclick="window.print()" style="float:right;background:#0D7A5F;color:white;border:none;padding:6px 16px;border-radius:4px;cursor:pointer;font-size:10pt;">🖨️ Imprimer / PDF</button>
  </div>

  <!-- En-tête -->
  <div class="header">
    <div class="sender">
      <h2>Dr. ${medecin ? `${medecin.prenom} ${medecin.nom}` : "________________"}</h2>
      ${medecin?.specialite ? `<p>${medecin.specialite}</p>` : ""}
      ${etablissement?.nom ? `<p>${etablissement.nom}</p>` : ""}
      ${etablissement?.adresse ? `<p>${etablissement.adresse}</p>` : ""}
      ${etablissement?.ville ? `<p>${etablissement.ville}</p>` : ""}
      ${etablissement?.telephone ? `<p>Tél : ${etablissement.telephone}</p>` : ""}
    </div>
    <svg class="logo-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 44" height="44">
      <path d="M22 4 L38 10 L38 24 Q38 33 22 39 Q6 33 6 24 L6 10 Z" fill="#1E3A5F"/>
      <polyline points="6,24 10,24 12,18 14,30 16,21 18,24 22,24" fill="none" stroke="#60A5FA" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="28" cy="15" r="1.3" fill="#60A5FA" opacity="0.8"/><circle cx="33" cy="11" r="1.1" fill="#60A5FA" opacity="0.7"/>
      <circle cx="37" cy="17" r="1.1" fill="#60A5FA" opacity="0.7"/><circle cx="34" cy="23" r="1.3" fill="#60A5FA" opacity="0.8"/>
      <line x1="28" y1="15" x2="33" y2="11" stroke="#60A5FA" stroke-width="0.8" opacity="0.5"/>
      <line x1="33" y1="11" x2="37" y2="17" stroke="#60A5FA" stroke-width="0.8" opacity="0.5"/>
      <line x1="37" y1="17" x2="34" y2="23" stroke="#60A5FA" stroke-width="0.8" opacity="0.5"/>
      <line x1="28" y1="15" x2="34" y2="23" stroke="#60A5FA" stroke-width="0.8" opacity="0.4"/>
      <line x1="22" y1="10" x2="22" y2="35" stroke="white" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M22 12 Q17 9 16 12 Q17 15 22 14 Z" fill="white" opacity="0.9"/>
      <path d="M22 12 Q27 9 28 12 Q27 15 22 14 Z" fill="white" opacity="0.9"/>
      <path d="M22 17 Q19 20 22 23 Q25 26 22 29 Q19 32 22 35" fill="none" stroke="white" stroke-width="1.1" stroke-linecap="round"/>
      <path d="M22 17 Q25 20 22 23 Q19 26 22 29 Q25 32 22 35" fill="none" stroke="white" stroke-width="1.1" stroke-linecap="round"/>
      <text x="50" y="27" font-family="Georgia,serif" font-weight="700" font-size="20" fill="#1E293B">MediLink</text>
      <text x="51" y="38" font-family="Arial,sans-serif" font-size="9" fill="#64748B" letter-spacing="0.5">DME Unifié · Bénin</text>
    </svg>
  </div>

  <div class="date-lieu">
    ________________, le ${new Date().toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })}
  </div>

  <p><strong>À l&apos;attention du Médecin traitant / Spécialiste</strong></p>

  <div class="object" style="margin-top:16px;">
    <p><strong>Objet : Lettre de référence — ${patient.prenom} ${patient.nom.toUpperCase()}</strong></p>
    <p><strong>NPI :</strong> <span style="font-family:monospace;">${patient.npi}</span></p>
  </div>

  <div class="patient-box">
    <h3>Identité du patient</h3>
    <div class="patient-grid">
      <div><strong>Nom complet :</strong> ${patient.prenom} ${patient.nom.toUpperCase()}</div>
      <div><strong>Date de naissance :</strong> ${formatDate(patient.date_naissance)} (${formatAge(patient.date_naissance)})</div>
      <div><strong>Sexe :</strong> ${patient.sexe === "M" ? "Masculin" : "Féminin"}</div>
      <div><strong>Groupe sanguin :</strong> ${patient.groupe_sanguin || "—"}${patient.rhesus || ""}</div>
      <div><strong>Nationalité :</strong> ${patient.nationalite || "—"}</div>
      <div><strong>Assurance :</strong> ${patient.assurance_organisme || "Non assuré"} ${patient.assurance_numero ? `(N° ${patient.assurance_numero})` : ""}</div>
    </div>
  </div>

  <p class="body-text">Cher confrère / chère consœur,</p>
  <p class="body-text">
    Je me permets de vous adresser ${patient.sexe === "M" ? "M." : "Mme"} <strong>${patient.prenom} ${patient.nom.toUpperCase()}</strong>,
    ${formatAge(patient.date_naissance)}, pour ${lastConsultation ? `prise en charge suite à : <em>${lastConsultation.motif}</em>` : "avis spécialisé"}.
  </p>

  ${allergies.length > 0 ? `
  <p class="section-title">⚠️ ALLERGIES CONNUES (IMPORTANT)</p>
  ${allergies.map((a) => `
    <div class="allergie-urgent">
      <strong>${a.substance}</strong> — ${a.type} — Sévérité : <strong>${a.severite === "anaphylactique" ? "ANAPHYLACTIQUE ⚠️" : a.severite}</strong><br>
      Réaction : ${a.reaction}
    </div>
  `).join("")}` : ""}

  ${antecedents.length > 0 ? `
  <p class="section-title">Antécédents médicaux significatifs</p>
  ${antecedents.map((a) => `
    <div class="item">• ${a.description}${a.cim10_code ? ` <span style="font-family:monospace;font-size:9pt;background:#E2E8F0;padding:0 3px;">${a.cim10_code}</span>` : ""}${a.date_debut ? ` (depuis ${formatDate(a.date_debut)})` : ""}</div>
  `).join("")}` : ""}

  ${prescriptions.length > 0 ? `
  <p class="section-title">Traitement en cours</p>
  ${prescriptions.map((p) => `
    <div class="item">• <strong>${p.medicament_dci} ${p.dosage}</strong> — ${p.posologie} — ${p.duree}</div>
  `).join("")}` : ""}

  ${lastConsultation ? `
  <p class="section-title">Motif de référence</p>
  <p style="font-size:10pt; padding:8px; background:#F8FAFC; border-radius:4px; border-left:3px solid #0D7A5F;">
    ${lastConsultation.diagnostic_principal || lastConsultation.motif}
    ${lastConsultation.plan_prise_en_charge ? `<br><em>Plan : ${lastConsultation.plan_prise_en_charge}</em>` : ""}
  </p>` : ""}

  <p class="body-text" style="margin-top:20px;">
    Je reste à votre disposition pour tout complément d&apos;information.
  </p>
  <p class="body-text">Confraternellement,</p>

  <div class="signature">
    <div class="sig-block">
      <div class="sig-line"></div>
      <p><strong>Dr. ${medecin ? `${medecin.prenom} ${medecin.nom}` : "________________"}</strong></p>
      ${medecin?.specialite ? `<p style="font-size:9pt;">${medecin.specialite}</p>` : ""}
    </div>
    <div style="font-size:9pt;color:#64748B;text-align:right;">
      <p>Cachet de l&apos;établissement :</p>
      <div style="width:150px;height:80px;border:1px dashed #CBD5E1;margin-top:4px;"></div>
    </div>
  </div>

  <div class="footer">
    Document généré par MediLink — NPI : ${patient.npi} — Confidentiel, destiné au médecin destinataire uniquement.<br>
    Généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="lettre-reference-${patient.npi}.html"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
