export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { formatDate, formatAge } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const prescriptionId = request.nextUrl.searchParams.get("prescriptionId");
    if (!prescriptionId) return NextResponse.json({ error: "prescriptionId requis" }, { status: 400 });

    // Charger la prescription
    const { data: prescription, error: rxErr } = await supabase
      .from("prescriptions")
      .select("*")
      .eq("id", prescriptionId)
      .single();

    if (rxErr || !prescription) {
      return NextResponse.json({ error: "Prescription non trouvée" }, { status: 404 });
    }

    // Charger patient + profil médecin + établissement en parallèle
    const [patientRes, profileRes] = await Promise.all([
      supabase.from("patients").select("*").eq("id", prescription.patient_id).single(),
      supabase.from("users_profiles")
        .select("*, etablissements(nom, adresse, ville, telephone, region)")
        .eq("id", user.id)
        .single(),
    ]);

    const patient = patientRes.data;
    if (!patient) return NextResponse.json({ error: "Patient non trouvé" }, { status: 404 });

    const medecin = profileRes.data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const etablissement = (medecin as any)?.etablissements;

    // Audit
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      patient_id: patient.id,
      action: "export_pdf",
      details: JSON.stringify({ type: "ordonnance", prescription_id: prescriptionId }),
      timestamp: new Date().toISOString(),
    });

    const datePrescription = formatDate(prescription.date_prescription);
    const dateExpiration = prescription.date_expiration ? formatDate(prescription.date_expiration) : null;
    const agePatient = formatAge(patient.date_naissance);
    const medecinNom = medecin ? `Dr. ${medecin.prenom} ${medecin.nom}` : "Médecin";
    const medecinSpec = medecin?.specialite || medecin?.role || "";
    const etabNom = etablissement?.nom || "Établissement de santé";
    const etabAdresse = etablissement ? `${etablissement.adresse || ""}, ${etablissement.ville || ""} — Tél : ${etablissement.telephone || ""}` : "";
    const etabRegion = etablissement?.region || "";

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Ordonnance — ${patient.prenom} ${patient.nom}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Georgia', serif; font-size: 11pt; color: #1E293B; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; }

    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0D7A5F; padding-bottom: 16px; margin-bottom: 20px; }
    .sender h2 { color: #0D7A5F; font-size: 14pt; margin-bottom: 2px; }
    .sender p { font-size: 9.5pt; color: #475569; }
    .logo-area { text-align: right; display: flex; justify-content: flex-end; }
    .logo-svg { display: block; }

    .ordonnance-title { text-align: center; margin: 20px 0; }
    .ordonnance-title h1 { font-size: 16pt; color: #0D7A5F; letter-spacing: 2px; text-transform: uppercase; border: 2px solid #0D7A5F; display: inline-block; padding: 6px 24px; border-radius: 4px; }

    .date-ref { display: flex; justify-content: space-between; font-size: 9.5pt; color: #64748B; margin-bottom: 16px; }

    .patient-box { background: #F0FDF4; border: 1px solid #86EFAC; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; }
    .patient-box h3 { color: #0D7A5F; font-size: 10.5pt; margin-bottom: 6px; }
    .patient-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; font-size: 9.5pt; }
    .patient-grid span { color: #64748B; }
    .patient-grid strong { color: #1E293B; }

    .rx-section { margin-bottom: 24px; }
    .rx-section h3 { font-size: 11pt; color: #0D7A5F; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
    .rx-section h3::before { content: "℞"; font-size: 16pt; font-weight: bold; }

    .rx-item { border: 1px solid #E2E8F0; border-radius: 6px; padding: 12px 16px; margin-bottom: 10px; background: #FAFAFA; }
    .rx-drug { font-size: 12pt; font-weight: bold; color: #0D7A5F; margin-bottom: 4px; }
    .rx-drug .commercial { font-size: 10pt; color: #64748B; font-weight: normal; font-style: italic; }
    .rx-details { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; font-size: 9.5pt; margin-top: 6px; }
    .rx-details .label { color: #64748B; }
    .rx-instructions { margin-top: 6px; padding-top: 6px; border-top: 1px dotted #E2E8F0; font-size: 9pt; color: #475569; font-style: italic; }

    .validity { background: #FEF9C3; border: 1px solid #FCD34D; border-radius: 6px; padding: 10px 14px; font-size: 9.5pt; margin-bottom: 24px; }
    .validity strong { color: #92400E; }

    .signature { margin-top: 40px; display: flex; justify-content: flex-end; }
    .sig-block { text-align: center; }
    .sig-line { width: 220px; border-bottom: 1px solid #1E293B; height: 60px; margin-bottom: 6px; }
    .sig-label { font-size: 9pt; color: #64748B; }
    .sig-name { font-size: 10pt; font-weight: bold; margin-top: 2px; }

    .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #E2E8F0; font-size: 7.5pt; color: #94A3B8; text-align: center; }

    @media print {
      body { padding: 20px; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <!-- Bouton impression -->
  <div class="no-print" style="background:#F0FDF4;border:1px solid #86EFAC;padding:10px 16px;border-radius:8px;margin-bottom:20px;font-family:sans-serif;font-size:10pt;display:flex;align-items:center;justify-content:space-between;">
    <span>📋 <strong>Ordonnance médicale</strong> — Cliquez sur Imprimer pour générer le PDF.</span>
    <button onclick="window.print()" style="background:#0D7A5F;color:white;border:none;padding:7px 18px;border-radius:4px;cursor:pointer;font-size:10pt;font-family:sans-serif;">🖨️ Imprimer / PDF</button>
  </div>

  <!-- En-tête médecin / établissement -->
  <div class="header">
    <div class="sender">
      <h2>${medecinNom}</h2>
      ${medecinSpec ? `<p>${medecinSpec}</p>` : ""}
      <p>${etabNom}</p>
      ${etabAdresse ? `<p style="font-size:8.5pt;">${etabAdresse}</p>` : ""}
      ${etabRegion ? `<p style="font-size:8.5pt;">${etabRegion}</p>` : ""}
    </div>
    <div class="logo-area">
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
  </div>

  <!-- Titre -->
  <div class="ordonnance-title">
    <h1>Ordonnance Médicale</h1>
  </div>

  <!-- Date et référence -->
  <div class="date-ref">
    <span>Date : <strong>${datePrescription}</strong></span>
    <span style="font-family:monospace;font-size:8.5pt;">Réf : ${prescriptionId.slice(0, 8).toUpperCase()}</span>
  </div>

  <!-- Patient -->
  <div class="patient-box">
    <h3>Patient</h3>
    <div class="patient-grid">
      <div><span>Nom complet</span><br><strong>${patient.prenom} ${patient.nom}</strong></div>
      <div><span>Date de naissance</span><br><strong>${formatDate(patient.date_naissance)} (${agePatient})</strong></div>
      <div><span>NPI</span><br><strong style="font-family:monospace;">${patient.npi}</strong></div>
      ${patient.groupe_sanguin ? `<div><span>Groupe sanguin</span><br><strong>${patient.groupe_sanguin}${patient.rhesus || ""}</strong></div>` : ""}
      ${patient.sexe ? `<div><span>Sexe</span><br><strong>${patient.sexe === "M" ? "Masculin" : "Féminin"}</strong></div>` : ""}
    </div>
  </div>

  <!-- Prescription -->
  <div class="rx-section">
    <h3>Prescription</h3>
    <div class="rx-item">
      <div class="rx-drug">
        ${prescription.medicament_dci}
        ${prescription.medicament_commercial ? `<span class="commercial">– ${prescription.medicament_commercial}</span>` : ""}
      </div>
      <div class="rx-details">
        <div><span class="label">Dosage</span><br>${prescription.dosage}</div>
        ${prescription.forme ? `<div><span class="label">Forme</span><br>${prescription.forme}</div>` : ""}
        <div><span class="label">Posologie</span><br>${prescription.posologie}</div>
        <div><span class="label">Durée</span><br>${prescription.duree}</div>
      </div>
      ${prescription.instructions ? `<div class="rx-instructions">ℹ️ ${prescription.instructions}</div>` : ""}
    </div>
  </div>

  <!-- Validité -->
  ${dateExpiration ? `
  <div class="validity">
    <strong>Validité :</strong> du ${datePrescription} au ${dateExpiration}
  </div>` : ""}

  <!-- Signature -->
  <div class="signature">
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-label">Signature et cachet du médecin</div>
      <div class="sig-name">${medecinNom}</div>
    </div>
  </div>

  <div class="footer">
    Document généré par MediLink — ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")} &nbsp;|&nbsp; Ce document est confidentiel
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    console.error("ordonnance-pdf error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
